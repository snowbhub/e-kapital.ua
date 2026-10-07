import { unstable_cache } from "next/cache";
import { createHash } from "node:crypto";
import snapshot from "../../../../data/metals.json";
import { metalSource, parseMetalQuotes } from "@/lib/data/metal-quotes";
const refresh = unstable_cache(
  async () => {
    const checkedAt = new Date().toISOString();
    try {
      const r = await fetch(metalSource, {
        signal: AbortSignal.timeout(10000),
        redirect: "error",
        cache: "no-store",
      });
      if (!r.ok) throw Error("Source unavailable");
      return {
        quotes: parseMetalQuotes(await r.json(), checkedAt),
        checkedAt,
        error: null,
      };
    } catch {
      let quotes: ReturnType<typeof parseMetalQuotes> = [];
      try {
        quotes = parseMetalQuotes(snapshot.data, snapshot.retrievedAt);
      } catch {}
      return {
        quotes,
        checkedAt,
        error:
          "Свіже оновлення недоступне; останні перевірені котировки показуємо не довше 7 днів.",
      };
    }
  },
  ["official-physical-metal-quotes-v1"],
  { revalidate: 21600 },
);
export async function GET(req: Request) {
  const value = await refresh(),
    content = JSON.stringify(value),
    etag = `"${createHash("sha256").update(content).digest("hex")}"`;
  const headers = {
    ETag: etag,
    "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
  };
  if (req.headers.get("if-none-match") === etag)
    return new Response(null, { status: 304, headers });
  return new Response(content, {
    headers: { ...headers, "Content-Type": "application/json" },
  });
}
