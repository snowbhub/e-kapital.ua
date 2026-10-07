import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
const store = await vi.hoisted(async () => {
  const { PGlite } = await import("@electric-sql/pglite");
  return { db: new PGlite() };
});
vi.mock("../../src/lib/server/database", async (original) => {
  const actual =
    await original<typeof import("../../src/lib/server/database")>();
  return {
    ...actual,
    database: async () => store.db,
    transaction: async (fn: (tx: unknown) => Promise<unknown>) =>
      store.db.transaction((tx) => fn(tx)),
  };
});
import { databaseSchema } from "../../src/lib/server/database";
import {
  encrypt,
  decrypt,
  sameOrigin,
  body,
  rateLimit,
  ApiError,
} from "../../src/lib/server/security";
import { readProfile, patchProfile } from "../../src/lib/server/profile";
import { recordEvents, eventSchema } from "../../src/lib/server/analytics";
import { initialState } from "../../src/lib/storage/schema";
import { changedSections } from "../../src/lib/storage/cloud-sync";
const user = randomUUID(),
  other = randomUUID();
beforeAll(async () => {
  vi.stubEnv("DATA_ENCRYPTION_KEY", "12".repeat(32));
  vi.stubEnv("SITE_URL", "http://localhost:3000");
  await store.db.exec(databaseSchema);
  await store.db.query(
    "INSERT INTO capital_private.users(id,name) VALUES($1,'Test'),($2,'Other')",
    [user, other],
  );
});
afterAll(async () => {
  await store.db.close();
  vi.unstubAllEnvs();
});
describe("account backend isolation", () => {
  it("encrypts financial data and binds ciphertext to its owner and purpose", () => {
    const box = encrypt({ capital: 30000 }, `profile:${user}`);
    expect(box).not.toContain("30000");
    expect(decrypt(box, `profile:${user}`)).toEqual({ capital: 30000 });
    expect(() => decrypt(box, `profile:${other}`)).toThrow();
    const pieces = box.split(".");
    pieces[2] = Buffer.from("tampered").toString("base64url");
    expect(() => decrypt(pieces.join("."), `profile:${user}`)).toThrow();
  });
  it("keeps profiles private, validates patches and rejects stale-device overwrites", async () => {
    expect(await readProfile(user)).toEqual({ state: null, revision: 0 });
    const state = initialState();
    state.decision.inputs.capital = 30000;
    expect((await patchProfile(user, 0, state)).revision).toBe(1);
    await expect(
      patchProfile(user, 0, { reserve: state.reserve }),
    ).rejects.toMatchObject({ status: 409 });
    await expect(patchProfile(user, 1, { admin: true })).rejects.toMatchObject({
      status: 400,
    });
    await expect(
      patchProfile(user, 1, { reserve: { current: -1 } }),
    ).rejects.toThrow();
    expect(await readProfile(other)).toEqual({ state: null, revision: 0 });
    expect((await readProfile(user)).state?.decision.inputs.capital).toBe(
      30000,
    );
    const row = await store.db.query<{ encrypted: string }>(
      "SELECT encrypted FROM capital_private.profiles WHERE user_id=$1",
      [user],
    );
    expect(row.rows[0].encrypted).not.toContain("30000");
  });
  it("records only opted-in bounded events and deduplicates retries", async () => {
    const event = eventSchema.parse({
      id: randomUUID(),
      name: "feature_use",
      feature: "fund",
      device: "mobile",
      capital: 999999,
    });
    expect(event).not.toHaveProperty("capital");
    await recordEvents(user, [event]);
    expect(
      (await store.db.query("SELECT * FROM capital_private.events")).rows,
    ).toHaveLength(0);
    await store.db.query(
      "UPDATE capital_private.users SET analytics=true WHERE id=$1",
      [user],
    );
    await recordEvents(user, [event]);
    await recordEvents(user, [event]);
    expect(
      (await store.db.query("SELECT * FROM capital_private.events")).rows,
    ).toHaveLength(1);
    expect(() =>
      eventSchema.parse({ ...event, feature: "account-password" }),
    ).toThrow();
  });
  it("rejects cross-origin writes and oversized streaming bodies", async () => {
    const request = new Request("http://localhost:3000/api/profile", {
      method: "POST",
      headers: {
        origin: "https://evil.example",
        "content-type": "application/json",
      },
      body: "{}",
    });
    expect(() => sameOrigin(request)).toThrow(ApiError);
    await expect(
      body(
        new Request("http://localhost:3000", {
          method: "POST",
          body: "x".repeat(101),
        }),
        100,
      ),
    ).rejects.toMatchObject({ status: 413 });
  });
  it("uses a database-backed rate limit across independent calls", async () => {
    await rateLimit("test", 2, 60);
    await rateLimit("test", 2, 60);
    await expect(rateLimit("test", 2, 60)).rejects.toMatchObject({
      status: 429,
    });
  });
  it("sends only changed profile sections", () => {
    const old = initialState(),
      next = {
        ...old,
        decision: {
          ...old.decision,
          inputs: { ...old.decision.inputs, capital: 500 },
        },
      };
    expect(Object.keys(changedSections(old, next))).toEqual(["decision"]);
    expect(changedSections(old, old)).toEqual({});
  });
  it("creates every personal table in a private schema with RLS enabled", async () => {
    const tables = await store.db.query<{ relrowsecurity: boolean }>(
      "SELECT relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='capital_private' AND c.relkind='r'",
    );
    expect(tables.rows.length).toBe(9);
    expect(tables.rows.every((t) => t.relrowsecurity)).toBe(true);
  });
});
