import type { DepositOffer, FxQuote, Market } from "../data/schema";
import { decisionReferences, projectInvestment } from "./decision";

export type Currency = "UAH" | "USD" | "EUR";
export type AutomaticInput = {
  capital: number;
  monthly: number;
  months: number;
  currency: Currency;
  purpose: "grow" | "income" | "home";
};
export const automaticTax = {
  deposit: 23,
  fund: 14,
  bonds: 0,
  checked: "2026-10-06",
  depositSource: "https://www.oschadbank.ua/deposit/moya-peremoga",
  fundSource:
    "https://www.inzhur.reit/blog/dividendi-poryadok-viplat-ta-opodatkuvannya",
};
const day = 86400000;
const ageDays = (date: string, today: string) =>
  (Date.parse(today) - Date.parse(date)) / day;
export function recentInflation(market: Market, date: string) {
  const points = market.cpi
    .filter((p) => p.date <= date)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-12);
  if (points.length !== 12) return null;
  for (let i = 1; i < 12; i++) {
    const a = new Date(points[i - 1].date),
      b = new Date(points[i].date);
    if (
      (b.getUTCFullYear() - a.getUTCFullYear()) * 12 +
        b.getUTCMonth() -
        a.getUTCMonth() !==
      1
    )
      return null;
  }
  if (ageDays(points[11].date, date) > 100) return null;
  return {
    rate: (points.reduce((p, x) => (p * x.value) / 100, 1) - 1) * 100,
    date: points[11].date,
    sourceUrl: points[11].meta.sourceUrl,
  };
}
function monthAt(date: string, n: number) {
  const d = new Date(date + "T00:00:00Z");
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1));
  const last = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  target.setUTCDate(Math.min(d.getUTCDate(), last));
  return target.getTime();
}
export function usableQuotes(market: Market, date: string) {
  return market.fxQuotes.filter(
    (q) =>
      ageDays(q.meta.effectiveDate, date) <= 4 &&
      ageDays(q.meta.effectiveDate, date) >= 0,
  );
}
function price(currency: Currency, quotes: FxQuote[], side: "buy" | "sell") {
  if (currency === "UAH") return 1;
  return quotes.find((q) => q.currency === currency)?.[side] ?? null;
}
export function toUahInputs(
  input: AutomaticInput,
  market: Market,
  date: string,
) {
  const fx =
    input.currency === "UAH"
      ? 1
      : (price(input.currency, usableQuotes(market, date), "buy") ??
        market.rates.find((r) => r.code === input.currency)?.value ??
        0);
  return {
    ...input,
    capital: input.capital * fx,
    monthly: input.monthly * fx,
    currency: "UAH" as const,
  };
}
export type AutomaticOption = {
  id: string;
  title: string;
  subtitle: string;
  currency: Currency;
  kind: "cash" | "deposit" | "bond" | "fund" | "fx";
  total: number;
  real: number | null;
  gain: number;
  income: number;
  tax: number;
  contributed: number;
  cashPerMonth: number;
  nominalCurrency: number;
  rate: number;
  netRate: number;
  months: number;
  sourceUrl: string;
  sourceDate: string;
  notes: string[];
  rows: { month: number; value: number }[];
  offer?: DepositOffer;
  eligible: boolean;
  availability: string;
  best?: boolean;
};

// A cash-flow simulation: fixed deposits cannot receive extra payments unless
// the bank permits it. Extra savings wait outside; future renewals use today's
// rate only as an explicit scenario. Returned tax is paid on interest, not capital.
export function depositProjection(
  offer: DepositOffer,
  input: AutomaticInput,
  quotes: FxQuote[],
  inflation: number | null,
  date: string,
): AutomaticOption | null {
  const from = price(input.currency, quotes, "buy"),
    ask = price(offer.currency, quotes, "sell"),
    bid = price(offer.currency, quotes, "buy");
  if (from === null || ask === null || bid === null) return null;
  const convert = input.currency === offer.currency ? 1 : from / ask;
  const capital = input.capital * convert,
    monthly = input.monthly * convert;
  // monobank limits buying foreign currency from UAH for deposits to 200,000 UAH/month.
  if (
    offer.bank.startsWith("monobank") &&
    offer.currency !== "UAH" &&
    input.currency !== offer.currency &&
    (capital * ask > 200000 || monthly * ask > 200000)
  )
    return null;
  const delay =
    capital >= offer.minimum
      ? 0
      : monthly > 0
        ? Math.ceil((offer.minimum - capital) / monthly)
        : Infinity;
  const termMonths = Math.min(offer.maxMonths, input.months - delay);
  if (
    termMonths < offer.minMonths ||
    (offer.maximum !== null && capital > offer.maximum)
  )
    return null;
  const start = Date.parse(date + "T00:00:00Z"),
    end = monthAt(date, input.months);
  const termEnd = (startAt: number) =>
    offer.termDays
      ? startAt + offer.termDays * day
      : monthAt(new Date(startAt).toISOString().slice(0, 10), termMonths);
  if (termEnd(monthAt(date, delay)) > end) return null;
  let outside = capital,
    balance = 0,
    accrued = 0,
    totalTax = 0,
    income = 0,
    incomeWallet = 0,
    initialDeposit = 0,
    maturity = 0,
    started = 0;
  let nextMonth = 1;
  const rows = [{ month: 0, value: capital * bid }];
  const open = (now: number) => {
    if (balance === 0 && outside >= offer.minimum && termEnd(now) <= end) {
      balance = Math.min(outside, offer.maximum ?? Infinity);
      outside -= balance;
      initialDeposit = balance;
      maturity = termEnd(now);
      started = now;
    }
  };
  const pay = () => {
    const tax = (accrued * automaticTax.deposit) / 100,
      net = accrued - tax;
    totalTax += tax;
    income += net;
    accrued = 0;
    if (input.purpose === "income") incomeWallet += net;
    else if (offer.payout === "capitalized") balance += net;
    else outside += net;
  };
  open(start);
  for (let now = start + day; now <= end; now += day) {
    if (balance > 0) {
      const year = new Date(now).getUTCFullYear();
      const denominator =
        (Date.UTC(year + 1, 0, 1) - Date.UTC(year, 0, 1)) / day;
      accrued += (balance * offer.rate) / 100 / denominator;
    }
    if (balance > 0 && now === maturity) {
      pay();
      outside += balance;
      balance = 0;
      open(now);
    }
    if (now === monthAt(date, nextMonth)) {
      if (balance > 0 && offer.payout !== "maturity") pay();
      outside += monthly;
      if (
        balance > 0 &&
        offer.replenishable &&
        termMonths >= 4 &&
        now <=
          monthAt(
            new Date(started).toISOString().slice(0, 10),
            termMonths - offer.topUpCutoffMonths,
          )
      ) {
        const topUp = Math.min(
          outside,
          initialDeposit,
          Math.max(0, (offer.maximum ?? Infinity) - balance),
        );
        balance += topUp;
        outside -= topUp;
      }
      open(now);
      rows.push({
        month: nextMonth,
        value:
          (outside +
            balance +
            incomeWallet +
            accrued * (1 - automaticTax.deposit / 100)) *
          bid,
      });
      nextMonth++;
    }
  }
  const nominalCurrency =
    outside +
    balance +
    incomeWallet +
    accrued * (1 - automaticTax.deposit / 100);
  const total = nominalCurrency * bid,
    contributed = (input.capital + input.monthly * input.months) * from;
  return {
    id: `deposit:${offer.id}`,
    title: offer.bank,
    subtitle: offer.product,
    currency: offer.currency,
    kind: "deposit",
    total,
    real:
      inflation === null
        ? null
        : total / Math.pow(1 + inflation / 100, input.months / 12),
    gain: total - contributed,
    income: income * bid,
    tax: totalTax * bid,
    contributed,
    cashPerMonth: (income * bid) / input.months,
    nominalCurrency,
    rate: offer.rate,
    netRate: offer.rate * (1 - automaticTax.deposit / 100),
    months: termMonths,
    sourceUrl: offer.meta.sourceUrl,
    sourceDate: offer.meta.effectiveDate,
    eligible: true,
    offer,
    availability: offer.earlyWithdrawal
      ? "За правилами дострокового повернення"
      : "Основна сума заблокована до завершення строку",
    notes: [
      offer.notes,
      `Податок із процентів ${automaticTax.deposit}%. Для фізособи-резидента України.`,
      "Повторні вклади — за сьогоднішньою ставкою в моделі; майбутня ставка може змінитися.",
      ...(input.monthly > 0
        ? [
            "Поповнення враховано за правилами банку. Решта заощаджень чекає поза депозитом.",
          ]
        : []),
      ...(offer.currency !== "UAH"
        ? [
            "Курс у моделі незмінний; банківський спред включено. Фактичний курс депозиту може відрізнятися від публічного карткового.",
          ]
        : []),
    ],
    rows,
  };
}

export function automaticOptions(
  market: Market,
  input: AutomaticInput,
  date: string,
) {
  const inflation = recentInflation(market, date),
    quotes = usableQuotes(market, date),
    uah = toUahInputs(input, market, date);
  const contributed = uah.capital + uah.monthly * input.months;
  const real = (v: number) =>
    inflation
      ? v / Math.pow(1 + inflation.rate / 100, input.months / 12)
      : null;
  const cash: AutomaticOption = {
    id: "cash",
    title: "Залишити гроші без доходу",
    subtitle: "База для порівняння",
    currency: "UAH",
    kind: "cash",
    total: contributed,
    real: real(contributed),
    gain: 0,
    income: 0,
    tax: 0,
    contributed,
    cashPerMonth: 0,
    nominalCurrency: contributed,
    rate: 0,
    netRate: 0,
    months: input.months,
    sourceUrl: inflation?.sourceUrl ?? "https://stat.gov.ua/",
    sourceDate: inflation?.date ?? date,
    eligible: true,
    availability: "Гроші доступні одразу",
    notes: [
      "Сума не змінюється, але її купівельна спроможність може зменшитися.",
    ],
    rows: [
      { month: 0, value: uah.capital },
      { month: input.months, value: contributed },
    ],
  };
  const deposits = market.deposits
    .filter(
      (o) =>
        ageDays(o.meta.effectiveDate, date) >= 0 &&
        ageDays(o.meta.effectiveDate, date) <= 7,
    )
    .map((o) =>
      depositProjection(o, input, quotes, inflation?.rate ?? null, date),
    )
    .filter((o): o is AutomaticOption => o !== null);
  const bestPerBank = new Map<string, AutomaticOption>();
  for (const option of deposits) {
    const key = `${option.title}-${option.currency}`;
    if (!bestPerBank.has(key) || bestPerBank.get(key)!.total < option.total)
      bestPerBank.set(key, option);
  }
  const ranked = [...bestPerBank.values()].sort((a, b) => b.total - a.total);
  const winners = Object.fromEntries(
    (["UAH", "USD", "EUR"] as const).map((currency) => [
      currency,
      ranked.find((o) => o.currency === currency) ?? null,
    ]),
  ) as Record<Currency, AutomaticOption | null>;
  for (const o of ranked) o.best = winners[o.currency]?.id === o.id;
  const others: AutomaticOption[] = [];
  const refs = decisionReferences(market, date);
  if (refs.bond) {
    const p = projectInvestment({
      ...uah,
      cashRate: refs.bond.publishedRate!,
      priceRate: 0,
      tax: 0,
      annualFee: 0,
      entryFee: 0,
      exitFee: 0,
      inflation: inflation?.rate ?? 0,
      reinvest: input.purpose !== "income",
    });
    others.push({
      id: "bond",
      title: "ОВДП",
      subtitle: "Орієнтир Мінфіну",
      currency: "UAH",
      kind: "bond",
      total: p.total,
      real: real(p.total),
      gain: p.gain,
      income: p.gain,
      tax: 0,
      contributed,
      cashPerMonth: p.cashPerMonth,
      nominalCurrency: p.total,
      rate: refs.bond.publishedRate!,
      netRate: refs.bond.publishedRate!,
      months: input.months,
      sourceUrl: refs.bond.meta.sourceUrl,
      sourceDate: refs.bond.lastPlacement ?? refs.bond.meta.effectiveDate,
      eligible: true,
      availability: `Випуск ${refs.bond.isin}, погашення ${refs.bond.maturity}`,
      notes: [
        "Це дохідність розміщення, не готова ціна купівлі. У брокера ціна, НКД і комісії можуть змінити результат.",
        "Грошові виплати залежать від графіка купонів; щомісячне число — середній еквівалент. Для точного договору використайте калькулятор ОВДП.",
      ],
      rows: p.rows.map((r) => ({ month: r.month, value: r.value })),
    });
  }
  if (refs.fund && refs.distribution) {
    const fund = refs.fund,
      distribution = refs.distribution;
    let units = Math.floor(uah.capital / fund.purchasePrice),
      wallet = uah.capital - units * fund.purchasePrice,
      paidWallet = 0,
      income = 0,
      tax = 0;
    const rows = [{ month: 0, value: uah.capital }];
    for (let m = 1; m <= input.months; m++) {
      const gross = units * distribution.amount,
        paidTax = (gross * automaticTax.fund) / 100;
      income += gross - paidTax;
      tax += paidTax;
      wallet += uah.monthly;
      if (input.purpose === "income") paidWallet += gross - paidTax;
      else wallet += gross - paidTax;
      const more = Math.floor(wallet / fund.purchasePrice);
      units += more;
      wallet -= more * fund.purchasePrice;
      rows.push({ month: m, value: units * fund.nav + wallet + paidWallet });
    }
    const total = units * fund.nav + wallet + paidWallet;
    others.push({
      id: "fund",
      title: "Inzhur REIT",
      subtitle: "Історична виплата → сценарій",
      currency: "UAH",
      kind: "fund",
      total,
      real: real(total),
      gain: total - contributed,
      income,
      tax,
      contributed,
      cashPerMonth:
        Math.floor(uah.capital / fund.purchasePrice) *
        distribution.amount *
        (1 - automaticTax.fund / 100),
      nominalCurrency: total,
      rate: refs.fundCashRate ?? 0,
      netRate: (refs.fundCashRate ?? 0) * (1 - automaticTax.fund / 100),
      months: input.months,
      sourceUrl: fund.meta.sourceUrl,
      sourceDate: distribution.date,
      eligible: true,
      availability:
        "Повернення за правилами викупу фонду, не банківський вклад",
      notes: [
        `Остання опублікована виплата за ${distribution.date.slice(0, 7)} повторюється в моделі; це не гарантований майбутній дохід.`,
        "Податок на дивіденди 14% уже віднято. Купівля цілими сертифікатами; різниця ціни купівлі й ВЧА врахована.",
        "Вартість активу залишена незмінною. ВЧА — оцінка, не гарантована ціна продажу; податок із приросту ціни окремо не виникає в цій моделі.",
        ...(ageDays(distribution.date, date) > 100
          ? [
              "Історія виплат застаріла. Перед інвестицією потрібен новий звіт; дохідність не бере участі в рейтингу банків.",
            ]
          : []),
      ],
      rows,
    });
  }
  return {
    cash,
    deposits: ranked,
    others,
    winners,
    inflation,
    quotes,
    contributed,
  };
}
