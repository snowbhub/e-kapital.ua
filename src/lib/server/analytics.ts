import { isIP } from "node:net";
import { z } from "zod";
import { database } from "./database";
import { encrypt, rateLimit } from "./security";
export const featureSchema = z.enum([
  "compare",
  "deposit",
  "currency",
  "fund",
  "bond",
  "mix",
  "property",
  "business",
  "history",
  "plan",
  "account",
  "metals",
  "stocks",
  "forex",
  "other",
]);
export const eventSchema = z.object({
  id: z.uuid(),
  name: z.enum(["page_view", "feature_use", "plan_save"]),
  feature: featureSchema,
  device: z.enum(["mobile", "desktop"]),
});
export async function recordEvents(
  userId: string,
  events: z.infer<typeof eventSchema>[],
) {
  const db = await database();
  await db.query(
    `INSERT INTO capital_private.events(id,user_id,name,feature,device)
 SELECT x.id::uuid,$1,x.name,x.feature,x.device FROM jsonb_to_recordset($2::jsonb) AS x(id text,name text,feature text,device text)
 WHERE (SELECT analytics FROM capital_private.users WHERE id=$1) ON CONFLICT(id) DO NOTHING`,
    [userId, JSON.stringify(events)],
  );
  await db.query(
    "UPDATE capital_private.users SET last_seen=now() WHERE id=$1 AND last_seen<now()-interval '5 minutes'",
    [userId],
  );
}
export async function refreshGeography(userId: string, ip: string | null) {
  if (!ip || !isIP(ip) || process.env.GEOIP_ENABLED !== "true") return;
  const db = await database();
  const accepted = await db.query(
    `INSERT INTO capital_private.locations(user_id,encrypted_ip)
 SELECT id,$2 FROM capital_private.users WHERE id=$1 AND analytics AND geography
 ON CONFLICT(user_id) DO UPDATE SET checked_at=now(),encrypted_ip=excluded.encrypted_ip
 WHERE capital_private.locations.checked_at<now()-interval '24 hours' RETURNING user_id`,
    [userId, encrypt(ip, `ip:${userId}`)],
  );
  if (!accepted.rowCount) return;
  try {
    await rateLimit("geography-provider-budget", 500, 86400);
    const response = await fetch(
      `https://ipwho.is/${encodeURIComponent(ip)}?fields=success,country_code,region,city`,
      {
        signal: AbortSignal.timeout(5000),
        redirect: "error",
        cache: "no-store",
      },
    );
    const value = z
      .object({
        success: z.literal(true),
        country_code: z.string().length(2),
        region: z.string().max(100),
        city: z.string().max(100),
      })
      .parse(await response.json());
    if (!response.ok) throw new Error("Source unavailable");
    await db.query(
      `UPDATE capital_private.locations SET country=$2,region=$3,city=$4,error=NULL
   WHERE user_id=$1 AND EXISTS(SELECT 1 FROM capital_private.users WHERE id=$1 AND analytics AND geography)`,
      [userId, value.country_code, value.region, value.city],
    );
  } catch {
    await db.query(
      "UPDATE capital_private.locations SET error='Географія недоступна; IP не є точною адресою' WHERE user_id=$1",
      [userId],
    );
  }
}
let lastCleanup = 0;
export async function cleanup() {
  if (Date.now() - lastCleanup < 3600000) return;
  lastCleanup = Date.now();
  const db = await database();
  await db.query(
    "DELETE FROM capital_private.events WHERE created_at<now()-interval '90 days'",
  );
  await db.query(
    "UPDATE capital_private.locations SET encrypted_ip=NULL WHERE checked_at<now()-interval '7 days' AND encrypted_ip IS NOT NULL",
  );
  await db.query("DELETE FROM capital_private.sessions WHERE expires_at<now()");
  await db.query(
    "DELETE FROM capital_private.challenges WHERE expires_at<now()",
  );
  await db.query("DELETE FROM capital_private.limits WHERE expires_at<now()");
  await db.query(
    "DELETE FROM capital_private.audit WHERE created_at<now()-interval '365 days'",
  );
}
