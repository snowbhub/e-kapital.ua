import { growth, mortgage } from "./calculations";
import type { Eoselia, Market } from "../data/schema";

export type ProjectionInput = {
  capital: number;
  monthly: number;
  months: number;
  cashRate: number;
  priceRate: number;
  tax: number;
  annualFee: number;
  entryFee: number;
  exitFee: number;
  inflation: number;
  reinvest: boolean;
};
export function projectInvestment(p: ProjectionInput) {
  let assets = p.capital * (1 - p.entryFee / 100),
    payouts = 0;
  const priceFactor = Math.pow(1 + p.priceRate / 100, 1 / 12);
  const rows = [{ month: 0, value: p.capital, paid: 0 }];
  for (let m = 1; m <= p.months; m++) {
    const cash = ((assets * p.cashRate) / 1200) * (1 - p.tax / 100);
    const fees = (assets * p.annualFee) / 1200;
    assets = Math.max(0, assets * priceFactor - fees);
    if (p.reinvest) assets += cash;
    else payouts += cash;
    assets += p.monthly * (1 - p.entryFee / 100);
    if (m % 12 === 0 || m === p.months)
      rows.push({ month: m, value: assets + payouts, paid: payouts });
  }
  const finalAssets = assets * (1 - p.exitFee / 100);
  const total = finalAssets + payouts;
  const contributed = p.capital + p.monthly * p.months;
  return {
    total,
    finalAssets,
    payouts,
    contributed,
    gain: total - contributed,
    real: total / Math.pow(1 + p.inflation / 100, p.months / 12),
    cashPerMonth: ((assets * p.cashRate) / 1200) * (1 - p.tax / 100),
    rows,
  };
}

// References are visible starting points for assumptions, not provider quotes.
export function decisionReferences(market: Market, date: string) {
  const bonds = market.bonds
    .filter(
      (b) =>
        b.currency === "UAH" && b.maturity > date && b.publishedRate !== null,
    )
    .sort(
      (a, b) =>
        (b.lastPlacement ?? "").localeCompare(a.lastPlacement ?? "") ||
        a.isin.localeCompare(b.isin),
    );
  const fund = market.funds.find((f) => f.id === "inzhur");
  const latest = fund?.distributions
    .filter((d) => d.date <= date && (!d.publishedAt || d.publishedAt <= date))
    .sort((a, b) => a.date.localeCompare(b.date))
    .at(-1);
  return {
    bond: bonds[0] ?? null,
    fund: fund ?? null,
    distribution: latest ?? null,
    fundCashRate:
      fund && latest ? ((latest.amount * 12) / fund.purchasePrice) * 100 : null,
  };
}

export type HousingInput = {
  capital: number;
  monthly: number;
  months: number;
  price: number;
  down: number;
  fees: number;
  rent: number;
  upkeep: number;
  years: number;
  age: number;
  subsidized: boolean;
  investmentRate: number;
  houseGrowth: number;
  rentGrowth: number;
};
export function compareHousing(p: HousingInput, terms: Eoselia | null) {
  if (!terms || p.price <= 0) return null;
  const rates = p.subsidized ? terms.subsidized : terms.standard;
  const years = Math.min(
    p.years,
    terms.maxYears,
    Math.max(0, terms.maxAge - p.age),
  );
  const minimum =
    (p.price *
      (p.age <= terms.youthMaxAge
        ? terms.youthDownPayment
        : terms.downPayment)) /
    100;
  if (years < 1) return null;
  const loan = mortgage(Math.max(0, p.price - p.down), years * 12, [
    { fromMonth: 1, annualRate: rates[0] / 100 },
    { fromMonth: terms.changeAfterMonths + 1, annualRate: rates[1] / 100 },
  ]);
  const gap = Math.max(0, p.down + p.fees - p.capital);
  const eligible =
    p.age >= terms.minAge &&
    p.age <= terms.maxAge &&
    p.down >= minimum &&
    p.down <= p.price &&
    gap === 0;
  const budget = p.monthly + p.rent;
  let waitAssets = p.capital,
    buyAssets = Math.max(0, p.capital - p.down - p.fees),
    waitDeficit = 0,
    buyDeficit = 0;
  const rows: { month: number; wait: number; buy: number | null }[] = [];
  let waitMonths: number | null = p.capital >= minimum + p.fees ? 0 : null;
  for (let m = 1; m <= p.months; m++) {
    const rent = p.rent * Math.pow(1 + p.rentGrowth / 100, (m - 1) / 12);
    const payment = loan.rows[m - 1]?.payment ?? 0;
    const upkeep = p.upkeep * Math.pow(1 + p.houseGrowth / 100, (m - 1) / 12);
    // Both paths use the same total housing + savings budget. Unfunded outflows
    // are tracked separately; the model never invents new borrowing.
    const waitFlow = budget - rent,
      buyFlow = budget - payment - upkeep;
    waitAssets = growth(waitAssets, 0, p.investmentRate / 100, 1) + waitFlow;
    buyAssets = growth(buyAssets, 0, p.investmentRate / 100, 1) + buyFlow;
    if (waitAssets < 0) {
      waitDeficit -= waitAssets;
      waitAssets = 0;
    }
    if (buyAssets < 0) {
      buyDeficit -= buyAssets;
      buyAssets = 0;
    }
    const house = p.price * Math.pow(1 + p.houseGrowth / 100, m / 12);
    const balance = loan.rows[m - 1]?.balance ?? 0;
    const target = (house * minimum) / p.price + p.fees;
    if (waitMonths === null && waitAssets >= target) waitMonths = m;
    if (m % 12 === 0 || m === p.months)
      rows.push({
        month: m,
        wait: waitAssets - waitDeficit,
        buy: eligible ? house - balance + buyAssets - buyDeficit : null,
      });
  }
  const houseValue = p.price * Math.pow(1 + p.houseGrowth / 100, p.months / 12);
  const debt = loan.rows[p.months - 1]?.balance ?? 0;
  const waitNet = waitAssets - waitDeficit;
  const buyNet = eligible ? houseValue - debt + buyAssets - buyDeficit : null;
  const firstSurplus = budget - loan.firstPayment - p.upkeep;
  const laterSurplus =
    budget -
    (p.months > terms.changeAfterMonths
      ? loan.laterPayment
      : loan.firstPayment) -
    p.upkeep;
  const cashYieldNeeded =
    buyAssets > 0 ? ((loan.firstPayment * 12) / buyAssets) * 100 : null;
  return {
    eligible,
    minimum,
    gap,
    years,
    loan,
    budget,
    waitNet,
    buyNet,
    buyAssets,
    waitAssets,
    debt,
    houseValue,
    waitDeficit,
    buyDeficit,
    firstSurplus,
    laterSurplus,
    waitMonths,
    rows,
    cashYieldNeeded,
  };
}
