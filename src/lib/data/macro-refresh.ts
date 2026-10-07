import type { Market } from "./schema";
import { fetchOfficial, parseCpi, parseNbuHistory, sources } from "./providers";

const cpiUrl = `${sources.sdmx}/data/SSSU,DF_PRICE_CHANGE_CONSUMER_GOODS_SERVICE,27.2.0/INDEX_CONSUMPRICE.PREV_MONTH.UA00000000000000000.0.M?startPeriod=2010-01`;
export function monthlyCheckpoints(points: Market["cpi"]) {
  const months = new Map<string, Market["cpi"][number]>();
  for (const point of [...points].sort((a, b) => a.date.localeCompare(b.date)))
    months.set(point.date.slice(0, 7), point);
  return [...months.values()].slice(-134);
}

// Public data only. Independent failures never erase last verified series.
export async function refreshMacroData(
  date = new Date().toISOString().slice(0, 10),
) {
  const start = `${Number(date.slice(0, 4)) - 12}0101`;
  const end = date.replaceAll("-", "");
  return Promise.all(
    ["cpi", "usd", "eur"].map(async (id) => {
      const url =
        id === "cpi"
          ? cpiUrl
          : `${sources.nbuHistory}?start=${start}&end=${end}&valcode=${id}&sort=exchangedate&order=asc&json`;
      try {
        const body = await fetchOfficial(
          url,
          id === "cpi"
            ? "application/vnd.sdmx.structurespecificdata+xml;version=2.1"
            : "application/json",
        );
        const points = (
          id === "cpi"
            ? parseCpi(body, url)
            : monthlyCheckpoints(parseNbuHistory(JSON.parse(body), url))
        ).filter((p) => p.date <= date);
        if (points.length < 120)
          throw new Error("Недостатня десятирічна історія");
        return {
          id,
          url,
          points,
          checkedAt: new Date().toISOString(),
          error: null,
        };
      } catch (error) {
        return {
          id,
          url,
          points: null,
          checkedAt: new Date().toISOString(),
          error: (error as Error).message,
        };
      }
    }),
  );
}

export function applyMacroRefresh(
  market: Market,
  results: Awaited<ReturnType<typeof refreshMacroData>>,
): Market {
  const next = {
    ...market,
    history: { ...market.history },
    health: [...market.health],
  };
  for (const result of results) {
    const id = result.id === "cpi" ? "cpi" : `history-${result.id}`;
    const previous = next.health.find((h) => h.id === id);
    const old =
      result.id === "cpi" ? market.cpi : (market.history[result.id] ?? []);
    // A stale upstream response must not roll back a newer verified month.
    const accepted =
      result.points && result.points.at(-1)!.date >= (old.at(-1)?.date ?? "");
    if (accepted) {
      if (result.id === "cpi") next.cpi = result.points!;
      else
        next.history[result.id] = monthlyCheckpoints([
          ...old,
          ...result.points!,
        ]);
    }
    next.health = next.health
      .filter((h) => h.id !== id)
      .concat({
        id,
        name:
          result.id === "cpi"
            ? "Держстат: інфляція"
            : `НБУ: історія ${result.id.toUpperCase()}`,
        sourceUrl: result.url,
        frequency: "Перевірка щодня",
        lastAttempt: result.checkedAt,
        lastSuccess: accepted
          ? result.checkedAt
          : (previous?.lastSuccess ?? null),
        records: accepted ? result.points!.length : old.length,
        error:
          result.error ??
          (accepted
            ? null
            : "Джерело повернуло старішу історію; збережено останню перевірену"),
      });
  }
  return next;
}
