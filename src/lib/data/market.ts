import snapshot from "../../../data/market.json";
import { parseStoredMarket, type Market } from "./schema";
import { applyNbuRefresh, refreshNbuRates } from "./nbu-refresh";
import { unstable_cache } from "next/cache";
export function getSnapshot({ history = false } = {}): Market {
  const market = parseStoredMarket(snapshot);
  if (!history) market.history = {};
  return market;
}
const refreshRates = unstable_cache(
  refreshNbuRates,
  ["official-nbu-rates-v2"],
  { revalidate: 86400 },
);
export async function getMarket() {
  const market = getSnapshot();
  return applyNbuRefresh(market, await refreshRates());
}
