import snapshot from "../../../data/market.json";
import { parseStoredMarket, type Market } from "./schema";
import { parseNbu, fetchOfficial, sources } from "./providers";
import { unstable_cache } from "next/cache";
export function getSnapshot({ history = false } = {}): Market {
  const market = parseStoredMarket(snapshot);
  if (!history) market.history = {};
  return market;
}
const refreshRates = unstable_cache(
  async () => {
    try {
      return {
        rates: parseNbu(JSON.parse(await fetchOfficial(sources.nbu))),
        error: null,
      };
    } catch (e) {
      return { rates: null, error: (e as Error).message };
    }
  },
  ["official-nbu-rates"],
  { revalidate: 86400 },
);
export async function getMarket() {
  const market = getSnapshot();
  const live = await refreshRates();
  if (live.rates?.length === 4) {
    market.rates = live.rates;
    const id = "nbu";
    market.health = market.health
      .filter((h) => h.id !== id)
      .concat({
        id,
        name: "НБУ: офіційні курси та метали",
        sourceUrl: sources.nbu,
        frequency: "Щоденно",
        lastSuccess: new Date().toISOString(),
        lastAttempt: new Date().toISOString(),
        error: null,
        records: 4,
      });
  }
  return market;
}
