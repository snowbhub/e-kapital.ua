import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
} from "node:crypto";
import { isIP } from "node:net";
import { siteUrl } from "../site";
import { database } from "./database";
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export const token = () => randomBytes(32).toString("base64url");
export const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export function encrypt(value: unknown, purpose: string) {
  const iv = randomBytes(12),
    c = createCipheriv(
      "aes-256-gcm",
      Buffer.from(process.env.DATA_ENCRYPTION_KEY!, "hex"),
      iv,
    );
  c.setAAD(Buffer.from(purpose));
  const data = Buffer.concat([
    c.update(JSON.stringify(value), "utf8"),
    c.final(),
  ]);
  return [iv, c.getAuthTag(), data]
    .map((b) => b.toString("base64url"))
    .join(".");
}
export function decrypt(value: string, purpose: string): unknown {
  const [iv, tag, data] = value
    .split(".")
    .map((v) => Buffer.from(v, "base64url"));
  const c = createDecipheriv(
    "aes-256-gcm",
    Buffer.from(process.env.DATA_ENCRYPTION_KEY!, "hex"),
    iv,
  );
  c.setAAD(Buffer.from(purpose));
  c.setAuthTag(tag);
  return JSON.parse(
    Buffer.concat([c.update(data), c.final()]).toString("utf8"),
  );
}
export function origin() {
  return new URL(siteUrl()).origin;
}
export function sameOrigin(request: Request) {
  if (request.headers.get("origin") !== origin())
    throw new ApiError(403, "Запит з іншого сайту відхилено");
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    throw new ApiError(415, "Потрібен JSON");
}
export async function body(request: Request, maximum = 50000) {
  if (Number(request.headers.get("content-length")) > maximum)
    throw new ApiError(413, "Запит завеликий");
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, "Порожній запит");
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > maximum) {
      await reader.cancel();
      throw new ApiError(413, "Запит завеликий");
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new ApiError(400, "Некоректний JSON");
  }
}
export function clientIp(request: Request) {
  if (process.env.TRUST_RAILWAY_PROXY !== "true") return null;
  const ip = request.headers.get("x-real-ip")?.trim();
  return ip && isIP(ip) ? ip : null;
}
export async function rateLimit(key: string, maximum: number, seconds: number) {
  const secret = process.env.DATA_ENCRYPTION_KEY!;
  const hash = createHmac("sha256", secret).update(key).digest("hex");
  const result = await (
    await database()
  ).query(
    `INSERT INTO capital_private.limits(key,count,expires_at)
 VALUES($1,1,now()+$2*interval '1 second') ON CONFLICT(key) DO UPDATE SET
 count=CASE WHEN capital_private.limits.expires_at<now() THEN 1 ELSE capital_private.limits.count+1 END,
 expires_at=CASE WHEN capital_private.limits.expires_at<now() THEN excluded.expires_at ELSE capital_private.limits.expires_at END RETURNING count`,
    [hash, seconds],
  );
  if (result.rows[0].count > maximum)
    throw new ApiError(429, "Забагато запитів. Спробуйте пізніше.");
}
export const privateJson = (
  data: unknown,
  status = 200,
  headers: Record<string, string> = {},
) =>
  Response.json(data, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      Vary: "Cookie",
      ...headers,
    },
  });
export function failure(e: unknown) {
  if (e instanceof ApiError) return privateJson({ error: e.message }, e.status);
  return privateJson(
    { error: "Сервер тимчасово недоступний. Ваші дані на пристрої збережені." },
    503,
  );
}
