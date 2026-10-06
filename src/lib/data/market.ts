import snapshot from "../../../data/market.json";
import bankSnapshot from "../../../data/banks.json";
import { parseStoredMarket, marketSchema, type Market } from "./schema";
import { applyNbuRefresh, refreshNbuRates } from "./nbu-refresh";
import { unstable_cache } from "next/cache";
import { refreshBanks } from "./bank-providers";
export function getSnapshot({ history = false } = {}): Market {
  const market = parseStoredMarket(snapshot);
  const banks = marketSchema
    .pick({ deposits: true, fxQuotes: true, health: true })
    .parse(bankSnapshot);
  // Bootstrap verified public offers; scheduled snapshots supersede this seed.
  for (const bank of new Set(banks.deposits.map((o) => o.bank))) {
    const seed = banks.deposits.filter((o) => o.bank === bank);
    const current = market.deposits.filter((o) => o.bank === bank);
    if (
      !current.length ||
      current[0].meta.retrievedAt < seed[0].meta.retrievedAt
    )
      market.deposits = [
        ...market.deposits.filter((o) => o.bank !== bank),
        ...seed,
      ];
  }
  if (
    !market.fxQuotes.length ||
    market.fxQuotes[0].meta.retrievedAt < banks.fxQuotes[0]?.meta.retrievedAt
  )
    market.fxQuotes = banks.fxQuotes;
  for (const h of banks.health) {
    const current = market.health.find((x) => x.id === h.id);
    if (!current || (current.lastAttempt ?? "") < (h.lastAttempt ?? ""))
      market.health = [...market.health.filter((x) => x.id !== h.id), h];
  }
  if (!history) market.history = {};
  return market;
}
const refreshRates = unstable_cache(
  refreshNbuRates,
  ["official-nbu-rates-v2"],
  { revalidate: 86400 },
);
const refreshOffers = unstable_cache(
  async () => marketSchema.parse(await refreshBanks(getSnapshot())),
  ["official-bank-offers-v1"],
  { revalidate: 21600 },
);
export async function getMarket() {
  const [market, rates] = await Promise.all([refreshOffers(), refreshRates()]);
  return applyNbuRefresh(market, rates);
}
