import { marketSchema, emptyMarket, type Market } from "./schema";
import { parseFundNav, parseFundDistributions } from "./fund-workbook";
import { fetchNbuRates } from "./nbu-refresh";
import { refreshBanks } from "./bank-providers";
import { applyFundRefresh, refreshFundPublicData } from "./fund-refresh";
import {
  sources,
  fetchOfficial,
  parseNbuHistory,
  parseMilitary,
  parseDepository,
  parseFund,
  parseEoselia,
  parseCpi,
  fundDocumentsUrl,
  parseFundDocuments,
} from "./providers";
export const cpiUrl = `${sources.sdmx}/data/SSSU,DF_PRICE_CHANGE_CONSUMER_GOODS_SERVICE,27.2.0/INDEX_CONSUMPRICE.PREV_MONTH.UA00000000000000000.0.M?startPeriod=2010-01`;
export async function syncMarket(
  previous: Market = emptyMarket,
  { history = true } = {},
) {
  const next: Market = structuredClone(previous);
  const attempt = new Date().toISOString();
  const jobs: [string, string, string, string, () => Promise<number>][] = [
    [
      "nbu",
      "НБУ: офіційні курси та метали",
      sources.nbu,
      "Щоденно",
      async () => {
        next.rates = await fetchNbuRates();
        return next.rates.length;
      },
    ],
    [
      "military",
      "Мінфін: військові облігації",
      sources.military,
      "Щоденно",
      async () => {
        const rows = parseMilitary(await fetchOfficial(sources.military));
        const previousById = new Map(next.bonds.map((b) => [b.isin, b]));
        next.bonds = rows.map((r) => ({
          ...r,
          payments: previousById.get(r.isin)?.payments ?? [],
          couponRate: previousById.get(r.isin)?.couponRate ?? null,
        }));
        return rows.length;
      },
    ],
    [
      "depository",
      "НБУ: довідник та платежі ОВДП",
      sources.bonds,
      "Щоденно",
      async () => {
        const rows = parseDepository(
          JSON.parse(await fetchOfficial(sources.bonds)),
        );
        const current = new Map(next.bonds.map((b) => [b.isin, b]));
        next.bonds = rows.map((r) => ({
          ...r,
          military: current.get(r.isin)?.military ?? false,
          publishedRate: current.get(r.isin)?.publishedRate ?? null,
          lastPlacement: current.get(r.isin)?.lastPlacement ?? null,
        }));
        return rows.length;
      },
    ],
    ...(["inzhur", "energy"] as const).map(
      (id) =>
        [
          id,
          id === "inzhur" ? "Inzhur REIT" : "Inzhur Energy",
          sources[id],
          "Щоденно; звіти щомісяця",
          async () => {
            const fund = parseFund(await fetchOfficial(sources[id]), id);
            const old = next.funds.find((f) => f.id === id);
            fund.reports = old?.reports ?? [];
            fund.distributions = old?.distributions ?? [];
            next.funds = [...next.funds.filter((f) => f.id !== id), fund];
            return 1;
          },
        ] as [string, string, string, string, () => Promise<number>],
    ),
    [
      "eoselia",
      "Дія / Укрфінжитло: єОселя",
      sources.eoselia,
      "Щоденна перевірка умов",
      async () => {
        const [html, age] = await Promise.all([
          fetchOfficial(sources.eoselia),
          fetchOfficial(sources.eoseliaAge),
        ]);
        next.eoselia = parseEoselia(html, age);
        return 1;
      },
    ],
    [
      "cpi",
      "Держстат: місячний CPI (SDMX)",
      cpiUrl,
      "Щомісяця",
      async () => {
        next.cpi = parseCpi(
          await fetchOfficial(
            process.env.CPI_SDMX_URL || cpiUrl,
            "application/vnd.sdmx.structurespecificdata+xml;version=2.1",
          ),
          process.env.CPI_SDMX_URL || cpiUrl,
        );
        return next.cpi.length;
      },
    ],
  ];
  for (const id of ["inzhur", "energy"] as const) {
    jobs.push([
      `${id}-reports`,
      `${id === "inzhur" ? "Inzhur REIT" : "Inzhur Energy"}: звіти та історія`,
      fundDocumentsUrl(id),
      "Щомісяця",
      async () => {
        const reports = parseFundDocuments(
          JSON.parse(await fetchOfficial(fundDocumentsUrl(id))),
        );
        const fund = next.funds.find((f) => f.id === id);
        if (!fund) throw new Error("Немає показників фонду");
        let points = next.history[id];
        let distributions = fund.distributions;
        const navReport = reports.find(
          (r) => /історичні дані/i.test(r.title) && /\.xlsx$/.test(r.url),
        );
        const dividendReport = reports.find(
          (r) =>
            /Історія виплати дивідендів/i.test(r.title) &&
            /\.xlsx$/.test(r.url),
        );
        const download = async (url: string) => {
          if (new URL(url).hostname !== "d2zk2gr3fhkmim.cloudfront.net")
            throw new Error("Непідтверджений хост звіту");
          const r = await fetch(url, {
            signal: AbortSignal.timeout(20000),
            redirect: "error",
          });
          if (!r.ok) throw new Error(`Звіт HTTP ${r.status}`);
          return new Uint8Array(await r.arrayBuffer());
        };
        if (navReport)
          points = parseFundNav(await download(navReport.url), navReport.url);
        if (dividendReport)
          distributions = parseFundDistributions(
            await download(dividendReport.url),
          );
        fund.reports = reports;
        fund.distributions = distributions;
        if (points) next.history[id] = points;
        return reports.length;
      },
    ]);
  }
  // Source jobs are sequential: the NBU payment merge depends on the military catalog.
  for (const [id, name, sourceUrl, frequency, job] of jobs) {
    const prior = previous.health.find((h) => h.id === id);
    try {
      const records = await job();
      next.health = next.health
        .filter((h) => h.id !== id)
        .concat({
          id,
          name,
          sourceUrl,
          frequency,
          lastSuccess: attempt,
          lastAttempt: attempt,
          error: null,
          records,
        });
    } catch (e) {
      next.health = next.health
        .filter((h) => h.id !== id)
        .concat({
          id,
          name,
          sourceUrl,
          frequency,
          lastSuccess: prior?.lastSuccess ?? null,
          lastAttempt: attempt,
          error: (e as Error).message,
          records: prior?.records ?? 0,
        });
    }
  }
  if (history) {
    for (const [code, id] of [
      ["USD", "usd"],
      ["EUR", "eur"],
      ["XAU", "gold"],
      ["XAG", "silver"],
    ]) {
      const end = new Date().toISOString().slice(0, 10).replaceAll("-", "");
      const url = `${sources.nbuHistory}?start=20100101&end=${end}&valcode=${code.toLowerCase()}&sort=exchangedate&order=asc&json`;
      const prior = previous.health.find((h) => h.id === `history-${id}`);
      try {
        const rows = parseNbuHistory(JSON.parse(await fetchOfficial(url)), url);
        next.history[id] = rows;
        next.health = next.health
          .filter((h) => h.id !== `history-${id}`)
          .concat({
            id: `history-${id}`,
            name: `НБУ: історія ${code}`,
            sourceUrl: url,
            frequency: "Щоденно",
            lastSuccess: attempt,
            lastAttempt: attempt,
            error: null,
            records: rows.length,
          });
      } catch (e) {
        next.health = next.health
          .filter((h) => h.id !== `history-${id}`)
          .concat({
            id: `history-${id}`,
            name: `НБУ: історія ${code}`,
            sourceUrl: url,
            frequency: "Щоденно",
            lastSuccess: prior?.lastSuccess ?? null,
            lastAttempt: attempt,
            error: (e as Error).message,
            records: prior?.records ?? 0,
          });
      }
    }
  }
  return marketSchema.parse(
    applyFundRefresh(await refreshBanks(next), await refreshFundPublicData()),
  );
}
