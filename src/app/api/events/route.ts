import { after } from "next/server";
import { z } from "zod";
import { requireAccount } from "@/lib/server/session";
import {
  cleanup,
  eventSchema,
  recordEvents,
  refreshGeography,
} from "@/lib/server/analytics";
import {
  body,
  clientIp,
  failure,
  privateJson,
  rateLimit,
  sameOrigin,
} from "@/lib/server/security";
export const runtime = "nodejs";
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const u = await requireAccount();
    if (!u.analytics) return privateJson({ accepted: 0 });
    await rateLimit(`events:${u.id}`, 30, 60);
    const batch = z
      .object({ events: z.array(eventSchema).min(1).max(20) })
      .parse(await body(req, 12000));
    await recordEvents(u.id, batch.events);
    const ip = u.geography ? clientIp(req) : null;
    after(async () => {
      try {
        await refreshGeography(u.id, ip);
        await cleanup();
      } catch {
        /* Optional analytics must never break the account. */
      }
    });
    return privateJson({ accepted: batch.events.length });
  } catch (e) {
    if (e instanceof z.ZodError)
      return privateJson({ error: "Некоректні події" }, 400);
    return failure(e);
  }
}
