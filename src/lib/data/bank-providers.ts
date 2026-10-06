import * as cheerio from "cheerio";
import { z } from "zod";
import type { DepositOffer, FxQuote, Market, Meta } from "./schema";

export const bankSources = {
  mono: "https://monobank.ua/deposit",
  pumb: "https://www.pumb.ua/deposit/profitable",
  oschad: "https://www.oschadbank.ua/deposit/moya-peremoga",
  monoFx: "https://api.monobank.ua/bank/currency",
};
const currencies = ["UAH", "USD", "EUR"] as const;
const clean = (s: string) => s.replace(/\s+/g, " ").trim();
const number = (s: string) => Number(s.replace(/\s/g, "").replace(",", "."));
const metadata = (source: string, sourceUrl: string, at: string): Meta => ({
  source,
  sourceUrl,
  retrievedAt: at,
  effectiveDate: at.slice(0, 10),
  dataType: "terms",
  freshness: "daily",
  effectiveDateBasis: "retrieved",
});
export function parseMonoDeposits(
  html: string,
  at = new Date().toISOString(),
): DepositOffer[] {
  const $ = cheerio.load(html);
  const table = $("table")
    .filter((_, t) => /Термін.*Гривня.*Долар.*Євро/s.test($(t).text()))
    .first();
  const body = clean($("body").text());
  if (
    !body.includes("100 $ / 100 €") ||
    !/1\s*000 ₴/.test(body) ||
    !body.includes("не менше ніж 3 місяці")
  )
    throw new Error(
      "Змінилися мінімальні суми або правила поповнення monobank",
    );
  const rows: DepositOffer[] = [];
  table.find("tr").each((_, tr) => {
    const cells = $(tr)
      .find("th, td")
      .map((_, td) => clean($(td).text()))
      .get();
    if (cells.length !== 4) return;
    if (/Термін/.test(cells[0])) return;
    const term = cells[0].match(/^(\d+)-(\d+) міс/);
    if (!term || cells.slice(1).some((s) => !/^\d+(?:[.,]\d+)?%$/.test(s)))
      throw new Error("Невідомий формат ставок monobank");
    currencies.forEach((currency, i) =>
      rows.push({
        id: `mono-${currency}-${term[1]}`,
        bank: "monobank / Універсал Банк",
        product: "Фіксований депозит",
        currency,
        minMonths: Number(term[1]),
        maxMonths: Number(term[2]),
        termDays: null,
        rate: number(cells[i + 1].replace("%", "")),
        minimum: currency === "UAH" ? 1000 : 100,
        maximum: null,
        payout: "capitalized",
        replenishable: true,
        topUpCutoffMonths: 3,
        earlyWithdrawal: false,
        notes:
          "Поповнення для строку від 4 міс., до останніх 3 міс.; не більше початкової суми за місяць. Проценти — на картку або з капіталізацією. Дострокового закриття немає.",
        meta: metadata("monobank: офіційні умови", bankSources.mono, at),
      }),
    );
  });
  if (rows.length !== 12) throw new Error("Неповна таблиця ставок monobank");
  return rows;
}
export function parsePumbDeposits(
  html: string,
  at = new Date().toISOString(),
): DepositOffer[] {
  const $ = cheerio.load(html);
  const text = clean($(".deposit-interest-rates").text());
  const blocks = text.split("Сума").slice(1);
  if (blocks.length !== 3)
    throw new Error("Не знайдено три валютні таблиці ПУМБ");
  return blocks.flatMap((block, i) => {
    const terms = [
      ...new Set([...block.matchAll(/(\d+) міс\./g)].map((m) => Number(m[1]))),
    ];
    const rates = [...block.matchAll(/(\d+(?:[.,]\d+)?)%/g)].map((m) =>
      number(m[1]),
    );
    const amount = block.match(/від ([\d ]+) до ([\d ]+)/);
    const days = [...block.matchAll(/на (\d+) дн/g)].map((m) => Number(m[1]));
    if (
      !amount ||
      terms.length !== rates.length ||
      days.length !== rates.length ||
      terms.length < 4
    )
      throw new Error("Неповні строки, ліміти або ставки ПУМБ");
    return terms.map((term, j): DepositOffer => ({
      id: `pumb-${currencies[i]}-${term}`,
      bank: "ПУМБ",
      product: "Дохідний",
      currency: currencies[i],
      minMonths: term,
      maxMonths: term,
      termDays: days[j],
      rate: rates[j],
      minimum: number(amount[1]),
      maximum: number(amount[2]),
      payout: "monthly",
      replenishable: false,
      topUpCutoffMonths: 0,
      earlyWithdrawal: false,
      notes:
        "Базова ставка без бонусу лояльності. Проценти на картку щомісяця. Поповнення та дострокове закриття не передбачені.",
      meta: metadata("ПУМБ: офіційні ставки", bankSources.pumb, at),
    }));
  });
}
export function parseOschadDeposits(
  html: string,
  at = new Date().toISOString(),
): DepositOffer[] {
  const $ = cheerio.load(html);
  const rows: DepositOffer[] = [];
  const text = clean($("body").text());
  if (!/10\s*000/.test(text) || !/5\s*000/.test(text) || !/1\s*000/.test(text))
    throw new Error("Не підтверджені суми Ощадбанку");
  $("tr").each((_, tr) => {
    const cells = $(tr)
      .find("td")
      .map((_, td) => clean($(td).text()))
      .get();
    const term = cells[0]?.match(/^(\d+) місяц.*?\((грн|usd|eur)\)/i);
    const rate = cells[1]?.match(/^(\d+(?:[.,]\d+)?)%$/);
    if (!term || !rate) return;
    // The extra five-day offer is not a three-calendar-month contract.
    if (cells[0].includes("+ 5")) return;
    const currency = ({ грн: "UAH", usd: "USD", eur: "EUR" } as const)[
      term[2].toLowerCase() as "грн" | "usd" | "eur"
    ];
    rows.push({
      id: `oschad-${currency}-${term[1]}`,
      bank: "Ощадбанк",
      product: "Моя Перемога",
      currency,
      minMonths: Number(term[1]),
      maxMonths: Number(term[1]),
      termDays: null,
      rate: number(rate[1]),
      minimum: currency === "UAH" ? 10000 : currency === "USD" ? 5000 : 1000,
      maximum: null,
      payout: "maturity",
      replenishable: false,
      topUpCutoffMonths: 0,
      earlyWithdrawal: false,
      notes:
        "Без поповнення та дострокового повернення; проценти в кінці строку.",
      meta: metadata("Ощадбанк: офіційні ставки", bankSources.oschad, at),
    });
  });
  if (!rows.length)
    throw new Error(
      "Ощадбанк не надав таблицю ставок (можливий захист від автоматичних запитів)",
    );
  return rows;
}
export function parseMonoFx(
  raw: unknown,
  at = new Date().toISOString(),
): FxQuote[] {
  const rows = z
    .array(
      z.object({
        currencyCodeA: z.number(),
        currencyCodeB: z.number(),
        date: z.number(),
        rateBuy: z.number().optional(),
        rateSell: z.number().optional(),
      }),
    )
    .parse(raw);
  const result = rows
    .filter(
      (r) => [840, 978].includes(r.currencyCodeA) && r.currencyCodeB === 980,
    )
    .map((r) => ({
      bank: "monobank / Універсал Банк",
      currency: r.currencyCodeA === 840 ? ("USD" as const) : ("EUR" as const),
      buy: r.rateBuy!,
      sell: r.rateSell!,
      channel:
        "Картковий курс monobank; курс конвертації депозиту перевіряється перед відкриттям",
      meta: {
        ...metadata("monobank: публічний валютний API", bankSources.monoFx, at),
        dataType: "fact" as const,
        effectiveDate: new Date(r.date * 1000).toISOString().slice(0, 10),
        effectiveDateBasis: "published" as const,
      },
    }));
  if (
    result.length !== 2 ||
    result.some((r) => !(r.buy > 0 && r.sell >= r.buy))
  )
    throw new Error("Неповний валютний спред monobank");
  return result;
}
export async function refreshBanks(previous: Market): Promise<Market> {
  const next = {
    ...previous,
    deposits: [...previous.deposits],
    fxQuotes: [...previous.fxQuotes],
    health: [...previous.health],
  };
  const at = new Date().toISOString();
  const jobs = [
    {
      id: "bank-mono",
      name: "Депозити monobank",
      url: bankSources.mono,
      bank: "monobank / Універсал Банк",
      parser: parseMonoDeposits,
    },
    {
      id: "bank-pumb",
      name: "Депозити ПУМБ",
      url: bankSources.pumb,
      bank: "ПУМБ",
      parser: parsePumbDeposits,
    },
    {
      id: "bank-oschad",
      name: "Депозити Ощадбанку",
      url: bankSources.oschad,
      bank: "Ощадбанк",
      parser: parseOschadDeposits,
    },
  ];
  const results = await Promise.allSettled(
    jobs.map(async (job) => {
      const response = await fetch(job.url, {
        signal: AbortSignal.timeout(10000),
        redirect: "error",
        headers: { "User-Agent": "e-kapital public financial comparison" },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const body = await response.text();
      if (body.length > 3000000) throw new Error("Відповідь завелика");
      return job.parser(body, at);
    }),
  );
  results.forEach((result, i) => {
    const job = jobs[i],
      prior = previous.health.find((h) => h.id === job.id);
    if (result.status === "fulfilled")
      next.deposits = [
        ...next.deposits.filter((o) => o.bank !== job.bank),
        ...result.value,
      ];
    next.health = [
      ...next.health.filter((h) => h.id !== job.id),
      {
        id: job.id,
        name: job.name,
        sourceUrl: job.url,
        frequency: "Кожні 6 годин",
        lastSuccess:
          result.status === "fulfilled" ? at : (prior?.lastSuccess ?? null),
        lastAttempt: at,
        error:
          result.status === "rejected" ? String(result.reason.message) : null,
        records:
          result.status === "fulfilled"
            ? result.value.length
            : (prior?.records ?? 0),
      },
    ];
  });
  try {
    const r = await fetch(bankSources.monoFx, {
      signal: AbortSignal.timeout(8000),
      redirect: "error",
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    next.fxQuotes = parseMonoFx(await r.json(), at);
    next.health = [
      ...next.health.filter((h) => h.id !== "bank-fx"),
      {
        id: "bank-fx",
        name: "Банківський курс і спред",
        sourceUrl: bankSources.monoFx,
        frequency: "Кожні 6 годин",
        lastSuccess: at,
        lastAttempt: at,
        error: null,
        records: next.fxQuotes.length,
      },
    ];
  } catch (e) {
    const prior = previous.health.find((h) => h.id === "bank-fx");
    next.health = [
      ...next.health.filter((h) => h.id !== "bank-fx"),
      {
        id: "bank-fx",
        name: "Банківський курс і спред",
        sourceUrl: bankSources.monoFx,
        frequency: "Кожні 6 годин",
        lastSuccess: prior?.lastSuccess ?? null,
        lastAttempt: at,
        error: (e as Error).message,
        records: previous.fxQuotes.length,
      },
    ];
  }
  return next;
}
