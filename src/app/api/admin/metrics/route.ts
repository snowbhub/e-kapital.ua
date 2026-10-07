import { requireAccount } from "@/lib/server/session";
import { database } from "@/lib/server/database";
import { cleanup } from "@/lib/server/analytics";
import {
  ApiError,
  decrypt,
  failure,
  privateJson,
  rateLimit,
} from "@/lib/server/security";
export const runtime = "nodejs";
export async function GET() {
  try {
    const user = await requireAccount();
    if (!user.admin) throw new ApiError(403, "Доступ лише для адміністратора");
    await rateLimit(`admin:${user.id}`, 20, 60);
    await cleanup();
    const db = await database();
    await db.query(
      "INSERT INTO capital_private.audit(actor,action) VALUES($1,'metrics.view')",
      [user.id],
    );
    const [counts, activity, features, locations, people] = await Promise.all([
      db.query(`SELECT count(*)::int AS users,count(*) FILTER(WHERE created_at>now()-interval '7 days')::int AS new_users,
    count(*) FILTER(WHERE last_seen>now()-interval '1 day')::int AS active_day,
    count(*) FILTER(WHERE last_seen>now()-interval '30 days')::int AS active_month,
    count(*) FILTER(WHERE analytics)::int AS opted_in FROM capital_private.users`),
      db.query(`SELECT to_char(date_trunc('day',created_at AT TIME ZONE 'UTC'),'YYYY-MM-DD') AS date,count(*)::int AS events,count(DISTINCT user_id)::int AS people
    FROM capital_private.events WHERE created_at>now()-interval '30 days' GROUP BY 1 ORDER BY 1`),
      db.query(`SELECT feature,count(*)::int AS events,count(DISTINCT user_id)::int AS people FROM capital_private.events
    WHERE created_at>now()-interval '30 days' AND name='feature_use' GROUP BY feature ORDER BY events DESC`),
      db.query(
        "SELECT country,region,city,count(*)::int AS people FROM capital_private.locations GROUP BY country,region,city ORDER BY people DESC LIMIT 30",
      ),
      db.query(`SELECT u.id,u.name,u.created_at,u.last_seen,u.analytics,u.geography,l.country,l.region,l.city,l.encrypted_ip,l.checked_at
    FROM capital_private.users u LEFT JOIN capital_private.locations l ON l.user_id=u.id ORDER BY u.created_at DESC LIMIT 50`),
    ]);
    return privateJson({
      counts: counts.rows[0],
      activity: activity.rows,
      features: features.rows,
      locations: locations.rows,
      people: people.rows.map((p) => ({
        ...p,
        encrypted_ip: undefined,
        ip: p.encrypted_ip ? decrypt(p.encrypted_ip, `ip:${p.id}`) : null,
      })),
      updatedAt: new Date().toISOString(),
      coverage:
        "Події лише від користувачів зі згодою; гості не відстежуються. Географія за IP приблизна. IP — до 7 днів, події — до 90 днів. Активність — входи та події, не час на екрані.",
    });
  } catch (e) {
    return failure(e);
  }
}
