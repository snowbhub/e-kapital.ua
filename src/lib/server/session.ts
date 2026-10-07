import { cookies } from "next/headers";
import { database } from "./database";
import { digest, token, ApiError } from "./security";
export type Account = {
  id: string;
  name: string;
  analytics: boolean;
  geography: boolean;
  admin: boolean;
};
const sessionName = "capital_session";
export function isAdmin(id: string) {
  return (process.env.ADMIN_USER_IDS ?? "")
    .split(",")
    .map((v) => v.trim())
    .includes(id);
}
export async function account(): Promise<Account | null> {
  const value = (await cookies()).get(sessionName)?.value;
  if (!value) return null;
  const r = await (
    await database()
  ).query(
    `SELECT u.id,u.name,u.analytics,u.geography FROM capital_private.sessions s
 JOIN capital_private.users u ON u.id=s.user_id WHERE s.hash=$1 AND s.expires_at>now()`,
    [digest(value)],
  );
  return r.rows[0] ? { ...r.rows[0], admin: isAdmin(r.rows[0].id) } : null;
}
export async function requireAccount() {
  const u = await account();
  if (!u) throw new ApiError(401, "Спочатку увійдіть");
  return u;
}
export async function issueSession(id: string) {
  const value = token();
  await (
    await database()
  ).query(
    `INSERT INTO capital_private.sessions(hash,user_id,expires_at) VALUES($1,$2,now()+interval '30 days')`,
    [digest(value), id],
  );
  (await cookies()).set(sessionName, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 86400,
  });
}
export async function endSession(all = false) {
  const c = await cookies(),
    value = c.get(sessionName)?.value;
  if (value) {
    const db = await database();
    if (all)
      await db.query(
        `DELETE FROM capital_private.sessions WHERE user_id=(SELECT user_id FROM capital_private.sessions WHERE hash=$1)`,
        [digest(value)],
      );
    else
      await db.query("DELETE FROM capital_private.sessions WHERE hash=$1", [
        digest(value),
      ]);
  }
  c.delete(sessionName);
}

export async function requireRecentAuthentication() {
  const value = (await cookies()).get(sessionName)?.value;
  if (!value) throw new ApiError(401, "Увійдіть повторно");
  const result = await (
    await database()
  ).query(
    "SELECT 1 FROM capital_private.sessions WHERE hash=$1 AND expires_at>now() AND created_at>now()-interval '10 minutes'",
    [digest(value)],
  );
  if (!result.rowCount)
    throw new ApiError(
      401,
      "Для цієї дії вийдіть з акаунта й увійдіть повторно ключем доступу",
    );
}
