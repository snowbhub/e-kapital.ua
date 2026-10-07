import type { Market, DepositOffer } from "../data/schema";
import {
  automaticTax,
  depositProjection,
  usableQuotes,
  recentInflation,
  fxFactor,
  type AutomaticInput,
  type Currency,
  type FxGrowth,
} from "./automatic";
import { decisionReferences } from "./decision";

export type MacroId = "stable" | "history5" | "history10" | "stress";
export type Macro = {
  id: MacroId;
  name: string;
  inflation: number;
  growth: FxGrowth;
  start: string;
  end: string;
  source: string;
};
const byDate = <T extends { date: string }>(points: T[]) =>
  [...points].sort((a, b) => a.date.localeCompare(b.date));
export function historicalContext(market: Market, years: number, date: string) {
  const cpi = byDate(market.cpi.filter((p) => p.date <= date)).slice(
    -years * 12,
  );
  if (cpi.length !== years * 12) return null;
  for (let i = 1; i < cpi.length; i++) {
    const a = new Date(cpi[i - 1].date),
      b = new Date(cpi[i].date);
    if (
      (b.getUTCFullYear() - a.getUTCFullYear()) * 12 +
        b.getUTCMonth() -
        a.getUTCMonth() !==
      1
    )
      return null;
  }
  const endDate = new Date(cpi.at(-1)!.date + "T00:00:00Z");
  endDate.setUTCMonth(endDate.getUTCMonth() + 1);
  endDate.setUTCDate(0);
  const startDate = new Date(cpi[0].date + "T00:00:00Z");
  startDate.setUTCDate(0);
  const start = startDate.toISOString().slice(0, 10),
    end = endDate.toISOString().slice(0, 10);
  if ((Date.parse(date) - Date.parse(end)) / 86400000 > 100) return null;
  const inflationFactor = cpi.reduce((a, p) => (a * p.value) / 100, 1);
  const ratios = {} as FxGrowth;
  for (const currency of ["USD", "EUR"] as const) {
    const points = byDate(
      (market.history[currency.toLowerCase()] ?? []).filter(
        (p) => p.date <= end,
      ),
    );
    const first = points.filter((p) => p.date <= start).at(-1),
      last = points.at(-1);
    if (
      !first ||
      !last ||
      (Date.parse(start) - Date.parse(first.date)) / 86400000 > 35 ||
      (Date.parse(end) - Date.parse(last.date)) / 86400000 > 35
    )
      return null;
    ratios[currency] = last.value / first.value;
  }
  return {
    years,
    start,
    end,
    inflationFactor,
    ratios,
    inflation: (Math.pow(inflationFactor, 1 / years) - 1) * 100,
    growth: {
      USD: (Math.pow(ratios.USD, 1 / years) - 1) * 100,
      EUR: (Math.pow(ratios.EUR, 1 / years) - 1) * 100,
    },
    source: cpi.at(-1)!.meta.sourceUrl,
  };
}
export function macroScenarios(market: Market, date: string): Macro[] {
  const recent = recentInflation(market, date);
  const result: Macro[] = [];
  if (recent)
    result.push({
      id: "stable",
      name: "Курс без змін",
      inflation: recent.rate,
      growth: { USD: 0, EUR: 0 },
      start: recent.date,
      end: recent.date,
      source: recent.sourceUrl,
    });
  for (const years of [5, 10]) {
    const h = historicalContext(market, years, date);
    if (h)
      result.push({
        id: years === 5 ? "history5" : "history10",
        name: `Темп минулих ${years} років`,
        ...h,
      });
  }
  // Stress is the maximum observed rolling 12-month movement, not a percentile,
  // probability or official forecast. CPI and FX extremes need not coincide.
  const ten = historicalContext(market, 10, date);
  if (ten) {
    const cpi = byDate(
      market.cpi.filter((p) => p.date > ten.start && p.date <= ten.end),
    );
    let inflation = 0;
    for (let i = 12; i <= cpi.length; i++)
      inflation = Math.max(
        inflation,
        (cpi.slice(i - 12, i).reduce((a, p) => (a * p.value) / 100, 1) - 1) *
          100,
      );
    const growth = { USD: 0, EUR: 0 };
    for (const currency of ["USD", "EUR"] as const) {
      const monthly = new Map<string, number>();
      for (const p of byDate(
        market.history[currency.toLowerCase()] ?? [],
      ).filter((p) => p.date >= ten.start && p.date <= ten.end))
        monthly.set(p.date.slice(0, 7), p.value);
      for (const [month, value] of monthly) {
        const prior = `${Number(month.slice(0, 4)) - 1}${month.slice(4)}`;
        if (monthly.has(prior))
          growth[currency] = Math.max(
            growth[currency],
            (value / monthly.get(prior)! - 1) * 100,
          );
      }
    }
    result.push({
      id: "stress",
      name: "Повтор важкого року",
      inflation,
      growth,
      start: ten.start,
      end: ten.end,
      source: ten.source,
    });
  }
  return result;
}
export type Opportunity = {
  id: string;
  name: string;
  tag: string;
  currency: Currency;
  kind: "cash" | "deposit" | "bond" | "fund" | "mix";
  rows: { month: number; value: number }[];
  rate: number;
  sourceUrl: string;
  sourceDate: string;
  offer?: DepositOffer;
  notes: string[];
  parts?: string[];
};
export function buildOpportunities(
  market: Market,
  input: AutomaticInput,
  macro: Macro,
  date: string,
) {
  const quotes = usableQuotes(market, date);
  const price = (c: Currency, m: number, side: "buy" | "sell" = "buy") =>
    c === "UAH"
      ? 1
      : (quotes.find((q) => q.currency === c)?.[side] ?? 0) *
        fxFactor(c, m, macro.growth);
  const from = price(input.currency, 0);
  if (!from) return [];
  const contribution = (m: number) => input.monthly * price(input.currency, m);
  const result: Opportunity[] = [];
  for (const currency of ["UAH", "USD", "EUR"] as const) {
    if (!price(currency, 0)) continue;
    let units =
      input.capital *
      (input.currency === currency ? 1 : from / price(currency, 0, "sell"));
    const rows = [{ month: 0, value: units * price(currency, 0) }];
    for (let m = 1; m <= input.months; m++) {
      units +=
        input.currency === currency
          ? input.monthly
          : contribution(m) / price(currency, m, "sell");
      rows.push({ month: m, value: units * price(currency, m) });
    }
    result.push({
      id: `cash-${currency}`,
      name:
        currency === "UAH"
          ? "Просто відкладати"
          : `Купувати ${currency === "USD" ? "долари" : "євро"}`,
      tag: "Без процентного доходу",
      currency,
      kind: "cash",
      rows,
      rate: 0,
      sourceUrl: "https://api.monobank.ua/bank/currency",
      sourceDate: quotes[0]?.meta.effectiveDate ?? date,
      notes: [
        "Публічний картковий курс monobank. Спред купівлі/продажу включено; готівковий курс може відрізнятися.",
        "Валюта теж має інфляцію. Еквівалент у USD/EUR не є виміром її купівельної спроможності.",
      ],
    });
  }
  const best = new Map<string, Opportunity>();
  for (const offer of market.deposits) {
    const age =
      (Date.parse(date) - Date.parse(offer.meta.effectiveDate)) / 86400000;
    if (age < 0 || age > 7) continue;
    const p = depositProjection(
      offer,
      input,
      quotes,
      macro.inflation,
      date,
      macro.growth,
    );
    if (!p) continue;
    const o: Opportunity = {
      id: p.id,
      name: offer.bank,
      tag: `Депозит · ${offer.currency}`,
      currency: offer.currency,
      kind: "deposit",
      rows: p.rows,
      rate: p.netRate,
      sourceUrl: p.sourceUrl,
      sourceDate: p.sourceDate,
      offer,
      notes: p.notes,
    };
    const key = `${offer.bank}-${offer.currency}`;
    if (
      !best.has(key) ||
      best.get(key)!.rows.at(-1)!.value < o.rows.at(-1)!.value
    )
      best.set(key, o);
  }
  result.push(...best.values());
  const refs = decisionReferences(market, date);
  if (refs.bond && input.capital * from >= refs.bond.nominal) {
    const rate = refs.bond.publishedRate!;
    let value = input.capital * from,
      wallet = 0;
    const rows = [{ month: 0, value }];
    for (let m = 1; m <= input.months; m++) {
      const gain = (value * rate) / 1200;
      if (input.purpose === "income") wallet += gain;
      else value += gain;
      value += contribution(m);
      rows.push({ month: m, value: value + wallet });
    }
    result.push({
      id: "bond",
      name: "ОВДП",
      tag: "Сценарій за дохідністю розміщення",
      currency: "UAH",
      kind: "bond",
      rows,
      rate,
      sourceUrl: refs.bond.meta.sourceUrl,
      sourceDate: refs.bond.lastPlacement ?? refs.bond.meta.effectiveDate,
      notes: [
        `Випуск ${refs.bond.isin}. Мінімум перевірено лише для початкового внеску; купівля подальшими внесками тут неперервна, не цілими облігаціями.`,
        `Це орієнтир, не котирування брокера: ціна, НКД і комісії не відомі. Щомісячне нарахування — спрощення, не графік купонів.`,
        `Погашення ${refs.bond.maturity}. Та сама дохідність після погашення та реінвестування — припущення, не доступна сьогодні угода.`,
        `Суверенний, воєнний і ліквідний ризик; податок для фізособи-резидента в моделі 0%.`,
      ],
    });
  }
  if (refs.fund && refs.distribution) {
    const f = refs.fund,
      d = refs.distribution;
    const project = (weight: number): Opportunity => {
      let units = Math.floor((input.capital * from * weight) / f.purchasePrice),
        wallet = input.capital * from * weight - units * f.purchasePrice,
        paid = 0;
      const rows = [{ month: 0, value: units * f.nav + wallet }];
      for (let m = 1; m <= input.months; m++) {
        const payout = units * d.amount * (1 - automaticTax.fund / 100);
        if (input.purpose === "income") paid += payout;
        else wallet += payout;
        wallet += contribution(m) * weight;
        const more = Math.floor(wallet / f.purchasePrice);
        units += more;
        wallet -= more * f.purchasePrice;
        rows.push({ month: m, value: units * f.nav + wallet + paid });
      }
      return {
        id: "fund",
        name: "Inzhur REIT",
        tag: "Історична виплата, не обіцянка",
        currency: "UAH",
        kind: "fund",
        rows,
        rate: (refs.fundCashRate ?? 0) * 0.86,
        sourceUrl: f.meta.sourceUrl,
        sourceDate: d.date,
        notes: [
          `Виплата за ${d.date.slice(0, 7)} повторюється; майбутній дивіденд може зменшитися або зникнути. Податок 14% включено.`,
          `Купівля цілими сертифікатами; оцінка за ВЧА, а не гарантованою ціною продажу. Вартість активу незмінна.`,
          `Воєнний, майновий і ліквідний ризик. Повернення за правилами фонду, не як із картки.`,
        ],
      };
    };
    result.push(project(1));
    const fxHalf = buildCashHalf("USD");
    if (fxHalf) {
      const fundHalf = project(0.5);
      result.push({
        ...fundHalf,
        id: "mix",
        name: "Долар + Inzhur",
        tag: "50% / 50% · без перебалансування",
        kind: "mix",
        rows: fundHalf.rows.map((r, i) => ({
          month: r.month,
          value: r.value + fxHalf[i].value,
        })),
        rate: 0,
        parts: ["50% — купівля USD", "50% — Inzhur REIT"],
        notes: [
          ...fundHalf.notes,
          "Половина кожного внеску спрямовується в USD, половина у фонд. Змішування не усуває ризики й не гарантує кращого результату.",
        ],
      });
    }
  }
  function buildCashHalf(currency: Currency) {
    const cash = result.find((o) => o.id === `cash-${currency}`);
    return cash?.rows.map((r) => ({ ...r, value: r.value / 2 }));
  }
  return result;
}
export function opportunityValue(
  value: number,
  month: number,
  reference: Currency,
  macro: Macro,
  market: Market,
  real = false,
): number | null {
  if (real) return value / Math.pow(1 + macro.inflation / 100, month / 12);
  if (reference === "UAH") return value;
  const quote = market.fxQuotes.find((q) => q.currency === reference);
  return quote
    ? value / (quote.buy * fxFactor(reference, month, macro.growth))
    : null;
}
