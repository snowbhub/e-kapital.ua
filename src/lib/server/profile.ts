import { stateSchema, initialState, type State } from "../storage/schema";
import { database, transaction } from "./database";
import { ApiError, decrypt, encrypt } from "./security";
export async function readProfile(id: string) {
  const result = await (
    await database()
  ).query(
    "SELECT encrypted,revision FROM capital_private.profiles WHERE user_id=$1",
    [id],
  );
  const row = result.rows[0];
  return row
    ? {
        state: stateSchema.parse(decrypt(row.encrypted, `profile:${id}`)),
        revision: Number(row.revision),
      }
    : { state: null, revision: 0 };
}
export async function patchProfile(
  id: string,
  revision: number,
  patch: Record<string, unknown>,
) {
  const allowed = new Set(Object.keys(initialState()));
  if (
    !Object.keys(patch).length ||
    Object.keys(patch).some((k) => !allowed.has(k))
  )
    throw new ApiError(400, "Некоректні поля профілю");
  return transaction(async (tx) => {
    await tx.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [
      id,
    ]);
    const r = await tx.query(
      "SELECT encrypted,revision FROM capital_private.profiles WHERE user_id=$1 FOR UPDATE",
      [id],
    );
    const old = r.rows[0],
      actual = old ? Number(old.revision) : 0;
    if (actual !== revision)
      throw new ApiError(
        409,
        "Профіль змінено на іншому пристрої. Завантажте його перед наступним збереженням.",
      );
    const previous = old
      ? stateSchema.parse(decrypt(old.encrypted, `profile:${id}`))
      : initialState();
    const parsed = stateSchema.safeParse({ ...previous, ...patch });
    if (!parsed.success) throw new ApiError(400, "Перевірте дані профілю");
    const state: State = parsed.data;
    await tx.query(
      `INSERT INTO capital_private.profiles(user_id,encrypted,revision) VALUES($1,$2,$3)
   ON CONFLICT(user_id) DO UPDATE SET encrypted=excluded.encrypted,revision=excluded.revision,updated_at=now()`,
      [id, encrypt(state, `profile:${id}`), actual + 1],
    );
    return { revision: actual + 1, state };
  });
}
