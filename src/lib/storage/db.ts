import { openDB } from "idb";
import { stateSchema, type State } from "./schema";
const db = () =>
  openDB("e-kapital", 1, {
    upgrade(db) {
      db.createObjectStore("state");
    },
  });
export async function loadState(scope = "profile") {
  const d = await db();
  const raw = await d.get("state", scope);
  d.close();
  return raw ? stateSchema.parse(raw) : null;
}
export async function saveState(state: State, scope = "profile") {
  const parsed = stateSchema.parse(state);
  const d = await db();
  await d.put("state", parsed, scope);
  d.close();
}
export async function deleteState(scope = "profile") {
  const d = await db();
  await d.delete("state", scope);
  await d.delete("state", `cloud:${scope}`);
  d.close();
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (key?.startsWith("ek:")) localStorage.removeItem(key);
  }
  const names = await caches.keys();
  await Promise.all(
    names.filter((k) => k.startsWith("ek-user-")).map((k) => caches.delete(k)),
  );
}
export async function cloudBaseline(scope: string) {
  const d = await db(),
    raw = await d.get("state", `cloud:${scope}`);
  d.close();
  return raw
    ? { revision: Number(raw.revision), state: stateSchema.parse(raw.state) }
    : null;
}
export async function saveCloudBaseline(
  scope: string,
  revision: number,
  state: State,
) {
  const d = await db();
  await d.put(
    "state",
    { revision, state: stateSchema.parse(state) },
    `cloud:${scope}`,
  );
  d.close();
}
const bytes = (s: string) => new TextEncoder().encode(s);
const base64 = (a: Uint8Array) =>
  btoa(Array.from(a, (b) => String.fromCharCode(b)).join(""));
const unbase64 = (s: string) =>
  Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
async function key(password: string, salt: Uint8Array) {
  if (password.length < 10)
    throw new Error("Пароль має містити щонайменше 10 символів");
  const material = await crypto.subtle.importKey(
    "raw",
    bytes(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations: 310000,
      hash: "SHA-256",
    },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}
export async function encryptBackup(state: State, password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16)),
    iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    await key(password, salt),
    bytes(JSON.stringify(stateSchema.parse(state))),
  );
  return JSON.stringify({
    format: "e-kapital-encrypted",
    version: 1,
    kdf: "PBKDF2-SHA256",
    iterations: 310000,
    salt: base64(salt),
    iv: base64(iv),
    data: base64(new Uint8Array(encrypted)),
  });
}
export async function decryptBackup(raw: string, password: string) {
  if (raw.length > 15000000) throw new Error("Файл завеликий");
  const box = JSON.parse(raw);
  if (
    box.format !== "e-kapital-encrypted" ||
    box.version !== 1 ||
    box.iterations !== 310000
  )
    throw new Error("Непідтримуваний backup");
  try {
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: unbase64(box.iv) },
      await key(password, unbase64(box.salt)),
      unbase64(box.data),
    );
    return stateSchema.parse(JSON.parse(new TextDecoder().decode(plain)));
  } catch {
    throw new Error("Пароль неправильний або файл пошкоджено");
  }
}
