import { type Market } from "./schema";
import { fetchOfficial, parseNbu, sources } from "./providers";

export async function fetchNbuRates() {
  const rates = parseNbu(JSON.parse(await fetchOfficial(sources.nbu)));
  if (rates.length !== 4 || new Set(rates.map((rate) => rate.code)).size !== 4)
    throw new Error("Неповний набір USD/EUR/XAU/XAG");
  return rates;
}

// Cache the attempt's timestamp along with its result, never the request time.
export async function refreshNbuRates() {
  try {
    const rates = await fetchNbuRates();
    return { rates, checkedAt: new Date().toISOString(), error: null };
  } catch (error) {
    return {
      rates: null,
      checkedAt: new Date().toISOString(),
      error: (error as Error).message,
    };
  }
}

export function applyNbuRefresh(
  market: Market,
  refresh: Awaited<ReturnType<typeof refreshNbuRates>>,
) {
  const previous = market.health.find((source) => source.id === "nbu");
  if (refresh.rates) market.rates = refresh.rates;
  market.health = market.health
    .filter((source) => source.id !== "nbu")
    .concat({
      id: "nbu",
      name: "НБУ: офіційні курси та метали",
      sourceUrl: sources.nbu,
      frequency: "Щоденно",
      lastSuccess: refresh.rates
        ? refresh.checkedAt
        : (previous?.lastSuccess ?? null),
      lastAttempt: refresh.checkedAt,
      error: refresh.error,
      records:
        refresh.rates?.length ?? previous?.records ?? market.rates.length,
    });
  return market;
}
