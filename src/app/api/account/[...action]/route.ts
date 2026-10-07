import { z } from "zod";
import {
  backendConfigured,
  database,
  transaction,
} from "@/lib/server/database";
import { options, verify } from "@/lib/server/authentication";
import {
  account,
  endSession,
  requireAccount,
  requireRecentAuthentication,
} from "@/lib/server/session";
import {
  ApiError,
  body,
  clientIp,
  failure,
  privateJson,
  rateLimit,
  sameOrigin,
} from "@/lib/server/security";
import type {
  AuthenticationResponseJSON,
  RegistrationResponseJSON,
} from "@simplewebauthn/server";
export const runtime = "nodejs";
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ action: string[] }> },
) {
  try {
    if ((await ctx.params).action.join("/") !== "session")
      throw new ApiError(404, "Не знайдено");
    return privateJson({
      enabled: backendConfigured(),
      user: backendConfigured() ? await account() : null,
    });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(
  req: Request,
  ctx: { params: Promise<{ action: string[] }> },
) {
  try {
    sameOrigin(req);
    if (!backendConfigured())
      throw new ApiError(
        503,
        "Акаунти ще не підключені до бази. Поки працюйте на пристрої.",
      );
    const action = (await ctx.params).action.join("/"),
      input = await body(req);
    // Global ceiling supplements proxy-based limits; an untrusted header cannot remove it.
    await rateLimit("auth-global", 3000, 3600);
    await rateLimit(
      `auth:${clientIp(req) ?? "unknown"}`,
      action.startsWith("register") ? 10 : 120,
      3600,
    );
    if (action === "register/options" || action === "login/options") {
      const data = z
        .object({ name: z.string().trim().max(80).default("") })
        .parse(input);
      return privateJson(
        await options(
          action.startsWith("register") ? "register" : "login",
          data.name,
        ),
      );
    }
    if (action === "register/verify" || action === "login/verify") {
      const data = z
        .object({
          credential: z.object({ id: z.string().max(1500) }).passthrough(),
        })
        .parse(input);
      try {
        return privateJson({
          user: await verify(
            action.startsWith("register") ? "register" : "login",
            data.credential as unknown as
              RegistrationResponseJSON | AuthenticationResponseJSON,
          ),
        });
      } catch (e) {
        if (e instanceof ApiError) throw e;
        throw new ApiError(
          400,
          "Не вдалося підтвердити ключ. Почніть вхід ще раз.",
        );
      }
    }
    const user = await requireAccount();
    if (action === "logout" || action === "logout-all") {
      await endSession(action === "logout-all");
      return privateJson({ ok: true });
    }
    if (action === "preferences") {
      const prefs = z
        .object({ analytics: z.boolean(), geography: z.boolean() })
        .parse(input);
      if (prefs.geography && !prefs.analytics)
        throw new ApiError(400, "Географія потребує згоди на аналітику");
      await transaction(async (tx) => {
        await tx.query(
          "UPDATE capital_private.users SET analytics=$1,geography=$2,consent_at=now() WHERE id=$3",
          [prefs.analytics, prefs.geography, user.id],
        );
        if (!prefs.analytics)
          await tx.query(
            "DELETE FROM capital_private.events WHERE user_id=$1",
            [user.id],
          );
        if (!prefs.geography)
          await tx.query(
            "DELETE FROM capital_private.locations WHERE user_id=$1",
            [user.id],
          );
      });
      return privateJson({ user: await account() });
    }
    if (action === "delete") {
      if (input.confirm !== "DELETE")
        throw new ApiError(400, "Підтвердьте видалення акаунта");
      await requireRecentAuthentication();
      await endSession(true);
      await (
        await database()
      ).query("DELETE FROM capital_private.users WHERE id=$1", [user.id]);
      return privateJson({ ok: true });
    }
    throw new ApiError(404, "Не знайдено");
  } catch (e) {
    if (e instanceof z.ZodError)
      return privateJson({ error: "Перевірте введені дані" }, 400);
    return failure(e);
  }
}
