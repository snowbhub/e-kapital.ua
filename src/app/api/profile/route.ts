import { z } from "zod";
import { readProfile, patchProfile } from "@/lib/server/profile";
import { requireAccount } from "@/lib/server/session";
import {
  body,
  failure,
  privateJson,
  rateLimit,
  sameOrigin,
} from "@/lib/server/security";
export const runtime = "nodejs";
export async function GET(req: Request) {
  try {
    const u = await requireAccount();
    await rateLimit(`profile-read:${u.id}`, 120, 60);
    const p = await readProfile(u.id),
      etag = `"${p.revision}"`;
    if (req.headers.get("if-none-match") === etag)
      return new Response(null, {
        status: 304,
        headers: {
          ETag: etag,
          "Cache-Control": "private, no-store",
          Vary: "Cookie",
        },
      });
    return privateJson(p, 200, { ETag: etag });
  } catch (e) {
    return failure(e);
  }
}
export async function PATCH(req: Request) {
  try {
    sameOrigin(req);
    const u = await requireAccount();
    await rateLimit(`profile-write:${u.id}`, 60, 60);
    const input = z
      .object({
        revision: z.number().int().nonnegative(),
        patch: z.record(z.string(), z.unknown()),
      })
      .parse(await body(req, 5000000));
    const p = await patchProfile(u.id, input.revision, input.patch);
    return privateJson({ revision: p.revision }, 200, {
      ETag: `"${p.revision}"`,
    });
  } catch (e) {
    if (e instanceof z.ZodError)
      return privateJson({ error: "Некоректний профіль" }, 400);
    return failure(e);
  }
}
