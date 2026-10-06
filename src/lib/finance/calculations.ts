export type Currency = "UAH" | "USD" | "EUR";
export const finite = (n: number) => {
  if (!Number.isFinite(n)) throw new Error("Потрібне скінченне число");
  return n;
};
export const nonnegative = (n: number) => {
  finite(n);
  if (n < 0) throw new Error("Значення не може бути від’ємним");
  return n;
};
export const money = (n: number) =>
  Math.round((finite(n) + Number.EPSILON) * 100) / 100;
export const sum = (values: number[]) =>
  values.reduce((a, b) => a + finite(b), 0);
export function monthlyAmount(
  amount: number,
  frequency: "monthly" | "weekly" | "annual" | "once",
) {
  nonnegative(amount);
  return frequency === "weekly"
    ? (amount * 52) / 12
    : frequency === "annual"
      ? amount / 12
      : frequency === "once"
        ? amount
        : amount;
}
export function cashFlow(
  income: number,
  essential: number,
  other: number,
  debt: number,
) {
  [income, essential, other, debt].forEach(nonnegative);
  return {
    income,
    essential,
    other,
    debt,
    expenses: essential + other + debt,
    free: money(income - essential - other - debt),
  };
}
export function reserve(
  essential: number,
  months: number,
  current: number,
  contribution: number,
) {
  [essential, months, current, contribution].forEach(nonnegative);
  const target = essential * months,
    gap = Math.max(0, target - current);
  return {
    target,
    gap,
    progress: target ? Math.min(100, (current / target) * 100) : 0,
    months:
      gap === 0 ? 0 : contribution > 0 ? Math.ceil(gap / contribution) : null,
  };
}
export function realReturn(nominal: number, inflation: number) {
  if (nominal < -1 || inflation <= -1) throw new Error("Некоректна ставка");
  return (1 + finite(nominal)) / (1 + finite(inflation)) - 1;
}
export function inflationAdjusted(
  value: number,
  inflation: number,
  years: number,
) {
  if (inflation <= -1) throw new Error("Некоректна інфляція");
  return finite(value) / Math.pow(1 + inflation, nonnegative(years));
}
export function growth(
  principal: number,
  monthly: number,
  annualRate: number,
  months: number,
) {
  [principal, monthly, months].forEach(nonnegative);
  if (annualRate <= -1) throw new Error("Ставка має бути більшою за -100%");
  const r = Math.pow(1 + finite(annualRate), 1 / 12) - 1;
  return r === 0
    ? principal + monthly * months
    : principal * Math.pow(1 + r, months) +
        (monthly * (Math.pow(1 + r, months) - 1)) / r;
}
export function goalMonths(
  target: number,
  current: number,
  monthly: number,
  rate = 0,
) {
  [target, current, monthly].forEach(nonnegative);
  if (current >= target) return 0;
  if (monthly === 0 && rate <= 0) return null;
  for (let m = 1; m <= 1200; m++)
    if (growth(current, monthly, rate, m) >= target) return m;
  return null;
}
export function addMonths(date: string, months: number) {
  const d = new Date(date + "T12:00:00Z"),
    day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const end = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0),
  ).getUTCDate();
  d.setUTCDate(Math.min(day, end));
  return d.toISOString().slice(0, 10);
}
export function requiredContribution(
  target: number,
  current: number,
  months: number,
) {
  [target, current, months].forEach(nonnegative);
  return months === 0
    ? target <= current
      ? 0
      : null
    : Math.max(0, (target - current) / months);
}
export function fxValue(units: number, rate: number) {
  nonnegative(units);
  if (rate <= 0) throw new Error("Курс має бути додатним");
  return units * finite(rate);
}
export function metal(
  budget: number,
  pricePerGram: number,
  buySpread: number,
  sellSpread: number,
  priceChange: number,
  years: number,
  fees = 0,
) {
  [budget, years, fees].forEach(nonnegative);
  if (
    pricePerGram <= 0 ||
    buySpread < 0 ||
    sellSpread < 0 ||
    sellSpread >= 1 ||
    priceChange <= -1
  )
    throw new Error("Некоректні параметри металу");
  const grams = Math.max(0, budget - fees) / (pricePerGram * (1 + buySpread));
  const finalPrice = pricePerGram * Math.pow(1 + priceChange, years);
  return {
    grams,
    value: Math.max(0, grams * finalPrice * (1 - sellSpread) - fees),
    purchaseSpread: buySpread,
    saleSpread: sellSpread,
  };
}
export function deposit(
  principal: number,
  annualRate: number,
  months: number,
  tax: number,
  capitalize: boolean,
  fees = 0,
) {
  [principal, annualRate, months, fees].forEach(nonnegative);
  if (tax < 0 || tax > 1) throw new Error("Некоректна частка податку");
  let balance = principal,
    interest = 0;
  for (let m = 0; m < months; m++) {
    const net = ((balance * annualRate) / 12) * (1 - tax);
    interest += net;
    if (capitalize) balance += net;
  }
  return { principal, interest, tax, fees, value: principal + interest - fees };
}
export function mortgagePayment(
  principal: number,
  annualRate: number,
  months: number,
) {
  [principal, annualRate, months].forEach(nonnegative);
  if (!Number.isInteger(months) || months < 1)
    throw new Error("Строк має бути додатною кількістю місяців");
  const r = annualRate / 12;
  return r === 0
    ? principal / months
    : (principal * r) / (1 - Math.pow(1 + r, -months));
}
export type MortgageRow = {
  month: number;
  rate: number;
  payment: number;
  interest: number;
  principal: number;
  balance: number;
};
export function mortgage(
  principal: number,
  months: number,
  stages: { fromMonth: number; annualRate: number }[],
) {
  nonnegative(principal);
  if (!Number.isInteger(months) || months < 1 || stages[0]?.fromMonth !== 1)
    throw new Error("Некоректний графік");
  const rows: MortgageRow[] = [];
  let balance = principal,
    payment = 0;
  for (let m = 1; m <= months; m++) {
    const stage = [...stages].reverse().find((s) => s.fromMonth <= m)!;
    if (m === 1 || stages.some((s) => s.fromMonth === m))
      payment = mortgagePayment(balance, stage.annualRate, months - m + 1);
    const interest = (balance * stage.annualRate) / 12,
      paid = Math.min(balance, payment - interest);
    balance = Math.max(0, balance - paid);
    rows.push({
      month: m,
      rate: stage.annualRate,
      payment: interest + paid,
      interest,
      principal: paid,
      balance,
    });
  }
  return {
    rows,
    total: sum(rows.map((r) => r.payment)),
    interest: sum(rows.map((r) => r.interest)),
    firstPayment: rows[0].payment,
    laterPayment: rows.find((r) => r.month === 121)?.payment ?? rows[0].payment,
  };
}
export function requiredCashCapital(
  monthlyPayment: number,
  yieldRate: number,
  tax: number,
  feeRate: number,
) {
  nonnegative(monthlyPayment);
  [yieldRate, tax, feeRate].forEach(nonnegative);
  const net = yieldRate * (1 - tax) - feeRate;
  return net > 0 ? (monthlyPayment * 12) / net : null;
}
export type Allocation = { id: string; percent: number; locked: boolean };
export function changeAllocation<T extends Allocation>(
  items: T[],
  id: string,
  value: number,
): T[] {
  const target = items.find((i) => i.id === id);
  if (!target || target.locked) return items;
  const locked = sum(items.filter((i) => i.locked).map((i) => i.percent));
  const next = Math.max(0, Math.min(100 - locked, finite(value)));
  const others = items.filter((i) => i.id !== id && !i.locked);
  if (!others.length)
    return items.map((i) =>
      i.id === id ? { ...i, percent: 100 - locked } : i,
    );
  const prior = sum(others.map((i) => i.percent));
  const remaining = 100 - locked - next;
  const changed = items.map((i) =>
    i.locked
      ? i
      : i.id === id
        ? { ...i, percent: next }
        : {
            ...i,
            percent: prior
              ? (remaining * i.percent) / prior
              : remaining / others.length,
          },
  );
  const last = others[others.length - 1].id;
  return changed.map((i) =>
    i.id === last
      ? { ...i, percent: i.percent + 100 - sum(changed.map((j) => j.percent)) }
      : i,
  );
}
export type DatedFlow = { date: string; amount: number };
const day = (date: string) => {
  const n = Date.parse(date + "T00:00:00Z");
  if (!Number.isFinite(n)) throw new Error("Некоректна дата");
  return n;
};
export function xirr(flows: DatedFlow[]): number | null {
  if (!flows.some((f) => f.amount < 0) || !flows.some((f) => f.amount > 0))
    return null;
  const sorted = [...flows].sort((a, b) => day(a.date) - day(b.date));
  const start = day(sorted[0].date);
  if (day(sorted.at(-1)!.date) === start) return null;
  const f = (r: number) =>
    sum(
      sorted.map(
        (v) =>
          v.amount / Math.pow(1 + r, (day(v.date) - start) / 86400000 / 365),
      ),
    );
  let lo = -0.999999,
    hi = 1;
  for (let i = 0; i < 30 && f(lo) * f(hi) > 0; i++) hi = hi * 2 + 1;
  if (f(lo) * f(hi) > 0) return null;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (f(lo) * f(mid) <= 0) hi = mid;
    else lo = mid;
  }
  const result = (lo + hi) / 2;
  return Number.isFinite(result) ? result : null;
}
export type Bond = {
  isin: string;
  currency: Currency;
  nominal: number;
  maturity: string;
  couponRate: number | null;
  payments: { date: string; amount: number; kind: "coupon" | "principal" }[];
  issueDate?: string;
  military?: boolean;
};
export function bondPurchase(
  bond: Bond,
  budget: number,
  dirtyPrice: number,
  purchaseDate: string,
  fixedFee = 0,
  feeRate = 0,
) {
  [budget, fixedFee, feeRate].forEach(nonnegative);
  if (dirtyPrice <= 0 || day(purchaseDate) >= day(bond.maturity))
    throw new Error("Перевірте ціну та дату купівлі");
  const count = Math.max(
    0,
    Math.floor((budget - fixedFee) / (dirtyPrice * (1 + feeRate))),
  );
  const invested = count ? count * dirtyPrice * (1 + feeRate) + fixedFee : 0;
  const future = bond.payments
    .filter((f) => day(f.date) > day(purchaseDate))
    .map((f) => ({ date: f.date, amount: f.amount * count }));
  const total = sum(future.map((f) => f.amount));
  return {
    count,
    invested,
    remaining: budget - invested,
    flows: future,
    total,
    profit: total - invested,
    yield: count
      ? xirr([{ date: purchaseDate, amount: -invested }, ...future])
      : null,
  };
}
export function annualCpi(points: { date: string; value: number }[]) {
  const years = new Map<string, { date: string; value: number }[]>();
  for (const p of points) {
    const key = p.date.slice(0, 4);
    years.set(key, [...(years.get(key) || []), p]);
  }
  return [...years]
    .flatMap(([year, rows]) => {
      const months = new Set(rows.map((p) => p.date.slice(0, 7)));
      if (rows.length !== 12 || months.size !== 12) return [];
      return [
        {
          year: Number(year),
          value: (rows.reduce((a, p) => (a * p.value) / 100, 1) - 1) * 100,
        },
      ];
    })
    .sort((a, b) => a.year - b.year);
}
export function cagr(first: number, last: number, years: number) {
  if (first <= 0 || last <= 0 || years <= 0)
    throw new Error("Недостатній історичний період");
  return Math.pow(last / first, 1 / years) - 1;
}
