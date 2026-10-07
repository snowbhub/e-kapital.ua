import * as cheerio from "cheerio";
import { fundSchema, type Market } from "./schema";
import { fetchOfficial, parseFund, sources } from "./providers";

const newsUrl = "https://www.inzhur.reit/news";
export type FundRefreshResult = {
  id: "inzhur" | "energy" | "inzhur-dividends";
  sourceUrl: string;
  checkedAt: string;
  fund: Market["funds"][number] | null;
  distribution: Market["funds"][number]["distributions"][number] | null;
  error: string | null;
};
const months = [
  "січень",
  "лютий",
  "березень",
  "квітень",
  "травень",
  "червень",
  "липень",
  "серпень",
  "вересень",
  "жовтень",
  "листопад",
  "грудень",
];
const datedMonths = [
  "січня",
  "лютого",
  "березня",
  "квітня",
  "травня",
  "червня",
  "липня",
  "серпня",
  "вересня",
  "жовтня",
  "листопада",
  "грудня",
];
const officialNews = (url: URL) =>
  url.protocol === "https:" &&
  url.hostname === "www.inzhur.reit" &&
  !url.username &&
  !url.password &&
  /^\/news\/inzhur-viplativ-dividendi-za-[a-z0-9-]+$/.test(url.pathname);

export function dividendNewsLinks(html: string) {
  const $ = cheerio.load(html);
  return [
    ...new Set(
      $("main a[href]")
        .map((_, a) => {
          try {
            const url = new URL($(a).attr("href")!, newsUrl);
            return officialNews(url) ? url.href : null;
          } catch {
            return null;
          }
        })
        .get()
        .filter(Boolean),
    ),
  ].slice(0, 3);
}
export function parseDividendNews(
  html: string,
  sourceUrl: string,
  date: string,
) {
  if (!officialNews(new URL(sourceUrl)))
    throw new Error("Непідтверджене джерело виплати");
  const $ = cheerio.load(html);
  $("script,style").remove();
  const title = $("h1").text().replace(/\s+/g, " ").trim();
  const heading = title.match(
    /^Inzhur виплатив дивіденди за (\S+) (\d{4}) року$/,
  );
  const text = $("main").text().replace(/\s+/g, " ");
  if (!heading || !/фонду\s+Inzhur REIT/.test(text))
    throw new Error("Не підтверджено фонд і звітний місяць");
  const month = months.indexOf(heading[1].toLowerCase());
  const published = text.match(
    new RegExp(`(\\d{1,2})\\s+(${datedMonths.join("|")})\\s+(\\d{4})`),
  );
  if (month < 0 || !published) throw new Error("Немає дати публікації виплати");
  const publishedAt = `${published[3]}-${String(datedMonths.indexOf(published[2]) + 1).padStart(2, "0")}-${published[1].padStart(2, "0")}`;
  const period = `${heading[2]}-${String(month + 1).padStart(2, "0")}-01`;
  const gross = text.match(
    new RegExp(
      `Дивіденди на 1 сертифікат\\s*за\\s*${heading[1]}\\s*:\\s*₴\\s*([\\d,.]+)\\s*\\|[^₴]{0,100}до податків`,
    ),
  );
  const completedPeriod = new Date(Date.UTC(Number(heading[2]), month + 1, 1))
    .toISOString()
    .slice(0, 10);
  if (!gross || publishedAt > date || publishedAt < completedPeriod)
    throw new Error(
      "Немає перевіреної виплати до податків або публікація ще не відбулася",
    );
  return fundSchema.shape.distributions.element.parse({
    date: period,
    amount: Number(gross[1].replace(",", ".")),
    dateBasis: "period",
    sourceUrl,
    publishedAt,
    retrievedAt: new Date().toISOString(),
  });
}

export async function refreshFundPublicData(
  date = new Date().toISOString().slice(0, 10),
): Promise<FundRefreshResult[]> {
  return Promise.all([
    ...(["inzhur", "energy"] as const).map(async (id) => {
      const checkedAt = new Date().toISOString();
      try {
        return {
          id,
          sourceUrl: sources[id],
          checkedAt,
          fund: parseFund(await fetchOfficial(sources[id]), id),
          distribution: null,
          error: null,
        };
      } catch (error) {
        return {
          id,
          sourceUrl: sources[id],
          checkedAt,
          fund: null,
          distribution: null,
          error: (error as Error).message,
        };
      }
    }),
    (async () => {
      const id = "inzhur-dividends" as const,
        checkedAt = new Date().toISOString();
      try {
        const links = dividendNewsLinks(
          await fetchOfficial(newsUrl, "text/html", 8000),
        );
        if (!links.length)
          throw new Error("Не знайдено офіційних повідомлень про виплату");
        const results = await Promise.allSettled(
          links.map(async (url) =>
            parseDividendNews(
              await fetchOfficial(url, "text/html", 8000),
              url,
              date,
            ),
          ),
        );
        const valid = results
          .flatMap((r) => (r.status === "fulfilled" ? [r.value] : []))
          .sort((a, b) => a.date.localeCompare(b.date));
        if (!valid.length)
          throw new Error("Не вдалося підтвердити повідомлення про виплату");
        const distribution = valid.at(-1)!;
        return {
          id,
          sourceUrl: distribution.sourceUrl!,
          checkedAt,
          fund: null,
          distribution,
          error: null,
        };
      } catch (error) {
        return {
          id,
          sourceUrl: newsUrl,
          checkedAt,
          fund: null,
          distribution: null,
          error: (error as Error).message,
        };
      }
    })(),
  ]);
}
export function applyFundRefresh(
  market: Market,
  results: FundRefreshResult[],
): Market {
  const next = {
    ...market,
    funds: [...market.funds],
    health: [...market.health],
  };
  for (const result of results) {
    const previous = next.health.find((h) => h.id === result.id);
    let accepted = false;
    if (result.fund) {
      const old = next.funds.find((f) => f.id === result.fund!.id);
      if (!old || result.fund.meta.retrievedAt >= old.meta.retrievedAt) {
        next.funds = [
          ...next.funds.filter((f) => f.id !== result.fund!.id),
          {
            ...result.fund,
            reports: old?.reports ?? [],
            distributions: old?.distributions ?? [],
          },
        ];
        accepted = true;
      }
    }
    if (result.distribution) {
      const old = next.funds.find((f) => f.id === "inzhur");
      if (old) {
        const d = result.distribution;
        const existing = old.distributions.find(
          (p) => p.date === d.date && p.dateBasis === d.dateBasis,
        );
        if (!existing?.publishedAt || existing.publishedAt <= d.publishedAt!) {
          const distributions = [
            ...old.distributions.filter(
              (p) => p.date !== d.date || p.dateBasis !== d.dateBasis,
            ),
            d,
          ].sort((a, b) => a.date.localeCompare(b.date));
          next.funds = next.funds.map((f) =>
            f.id === "inzhur" ? { ...f, distributions } : f,
          );
          accepted = true;
        }
      }
    }
    next.health = next.health
      .filter((h) => h.id !== result.id)
      .concat({
        id: result.id,
        name:
          result.id === "inzhur-dividends"
            ? "Inzhur REIT: офіційні повідомлення про виплати"
            : result.id === "inzhur"
              ? "Inzhur REIT"
              : "Inzhur Energy",
        sourceUrl: result.sourceUrl,
        frequency: "Перевірка кожні 6 годин",
        lastAttempt: result.checkedAt,
        lastSuccess: accepted
          ? result.checkedAt
          : (previous?.lastSuccess ?? null),
        error:
          result.error ??
          (accepted
            ? null
            : "Нові дані не застосовано; збережено останні перевірені"),
        records: accepted ? 1 : (previous?.records ?? 0),
      });
  }
  return next;
}
