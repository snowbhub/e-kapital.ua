import { Pool, type PoolClient } from "pg";

export const databaseSchema = `
CREATE SCHEMA IF NOT EXISTS capital_private;
REVOKE ALL ON SCHEMA capital_private FROM PUBLIC;
CREATE TABLE IF NOT EXISTS capital_private.users (
 id uuid PRIMARY KEY, name text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 last_seen timestamptz NOT NULL DEFAULT now(), analytics boolean NOT NULL DEFAULT false,
 geography boolean NOT NULL DEFAULT false, consent_at timestamptz
);
CREATE TABLE IF NOT EXISTS capital_private.credentials (
 id text PRIMARY KEY, user_id uuid NOT NULL REFERENCES capital_private.users ON DELETE CASCADE,
 public_key bytea NOT NULL, counter bigint NOT NULL, transports jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS credentials_user ON capital_private.credentials(user_id);
CREATE TABLE IF NOT EXISTS capital_private.sessions (
 hash text PRIMARY KEY, user_id uuid NOT NULL REFERENCES capital_private.users ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_user ON capital_private.sessions(user_id);
CREATE TABLE IF NOT EXISTS capital_private.challenges (
 hash text PRIMARY KEY, kind text NOT NULL, challenge text NOT NULL, user_id uuid NOT NULL,
 name text NOT NULL, existing boolean NOT NULL DEFAULT false, expires_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS capital_private.profiles (
 user_id uuid PRIMARY KEY REFERENCES capital_private.users ON DELETE CASCADE,
 encrypted text NOT NULL, revision bigint NOT NULL DEFAULT 1, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS capital_private.events (
 id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES capital_private.users ON DELETE CASCADE,
 name text NOT NULL, feature text NOT NULL, device text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS events_time ON capital_private.events(created_at);
CREATE INDEX IF NOT EXISTS events_user ON capital_private.events(user_id,created_at);
CREATE TABLE IF NOT EXISTS capital_private.locations (
 user_id uuid PRIMARY KEY REFERENCES capital_private.users ON DELETE CASCADE,
 encrypted_ip text, country text, region text, city text,
 checked_at timestamptz NOT NULL DEFAULT now(), error text
);
CREATE TABLE IF NOT EXISTS capital_private.limits (
 key text PRIMARY KEY, count integer NOT NULL, expires_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS capital_private.audit (
 id bigserial PRIMARY KEY, actor uuid, action text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE capital_private.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE capital_private.credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE capital_private.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE capital_private.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE capital_private.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE capital_private.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE capital_private.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE capital_private.limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE capital_private.audit ENABLE ROW LEVEL SECURITY;
`;
let pool: Pool | undefined;
let initialized: Promise<void> | undefined;
export function backendConfigured() {
  return Boolean(
    process.env.DATABASE_URL &&
    /^[a-f0-9]{64}$/i.test(process.env.DATA_ENCRYPTION_KEY ?? ""),
  );
}
export async function database() {
  if (!backendConfigured()) throw new Error("BACKEND_UNAVAILABLE");
  pool ??= new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    idleTimeoutMillis: 20000,
    connectionTimeoutMillis: 5000,
    statement_timeout: 10000,
  });
  if (!initialized) {
    initialized = (async () => {
      const c = await pool!.connect();
      try {
        await c.query("BEGIN");
        await c.query("SELECT pg_advisory_xact_lock(2148,1)");
        await c.query(databaseSchema);
        await c.query("COMMIT");
      } catch (e) {
        await c.query("ROLLBACK");
        throw e;
      } finally {
        c.release();
      }
    })().catch((e) => {
      initialized = undefined;
      throw e;
    });
  }
  await initialized;
  return pool;
}
export async function transaction<T>(fn: (client: PoolClient) => Promise<T>) {
  const client = await (await database()).connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
