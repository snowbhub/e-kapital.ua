import { assets, type AssetId, type Scenario } from "./assets";
import {
  deposit,
  fxValue,
  growth,
  inflationAdjusted,
  metal,
  sum,
} from "./calculations";
export function assetProjection(
  id: AssetId,
  principal: number,
  monthly: number,
  months: number,
  s: Scenario,
) {
  const asset = assets.find((a) => a.id === id)!;
  const years = months / 12;
  let value = principal,
    cash = 0;
  if (asset.kind === "cash") value = principal + monthly * months;
  if (asset.kind === "fx") {
    const r = (id === "usd" ? s.usd : s.eur) / 100;
    value = growth(principal, monthly, r, months);
  }
  if (asset.kind === "metal") {
    const r = (id === "gold" ? s.gold : s.silver) / 100;
    value = metal(
      principal,
      1,
      s.buySpread / 100,
      s.sellSpread / 100,
      r,
      years,
      0,
    ).value;
    for (let m = 1; m <= months; m++)
      value += metal(
        monthly,
        1,
        s.buySpread / 100,
        s.sellSpread / 100,
        r,
        (months - m) / 12,
        0,
      ).value;
  }
  if (asset.kind === "deposit") {
    value = deposit(
      principal,
      s.deposit / 100,
      months,
      s.tax / 100,
      true,
      0,
    ).value;
    for (let m = 1; m <= months; m++)
      value += deposit(
        monthly,
        s.deposit / 100,
        months - m,
        s.tax / 100,
        true,
        0,
      ).value;
  }
  if (asset.kind === "fund" || asset.kind === "bond") {
    const cashRate =
      ((asset.kind === "fund" ? (id === "energy" ? 0 : s.fundCash) : s.bond) /
        100) *
      (1 - s.tax / 100);
    const navRate = asset.kind === "fund" ? s.fundNav / 100 : 0;
    const navMonth = Math.pow(1 + navRate, 1 / 12) - 1;
    let fx = 1;
    const fxMonth = id === "fx-bond" ? Math.pow(1 + s.usd / 100, 1 / 12) : 1;
    for (let m = 1; m <= months; m++) {
      fx *= fxMonth;
      const distribution = (value * cashRate) / 12;
      cash += distribution * fx;
      value =
        value * (1 + navMonth) + (s.reinvest ? distribution : 0) + monthly / fx;
    }
    if (s.reinvest) cash = 0;
    value *= fx;
  }
  const fee = ((principal + monthly * months) * s.fee) / 100;
  return {
    value: Math.max(0, value - fee),
    cash,
    contributed: principal + monthly * months,
  };
}
export function projectPortfolio(
  capital: number,
  monthly: number,
  allocation: { id: string; percent: number }[],
  years: number,
  scenario: Scenario,
) {
  const points = [];
  for (let m = 0; m <= years * 12; m++) {
    const results = allocation.map((a) =>
      assetProjection(
        a.id as AssetId,
        (capital * a.percent) / 100,
        (monthly * a.percent) / 100,
        m,
        scenario,
      ),
    );
    const value = sum(results.map((r) => r.value)),
      cash = sum(results.map((r) => r.cash)),
      contributed = capital + monthly * m;
    points.push({
      month: m,
      nominal: value + cash,
      invested: value,
      cash,
      real: inflationAdjusted(value + cash, scenario.inflation / 100, m / 12),
      contributed,
    });
  }
  return points;
}
export function portfolioMetrics(
  allocation: { id: string; percent: number }[],
) {
  const match = (fn: (a: (typeof assets)[number]) => boolean) =>
    sum(
      allocation
        .filter((a) => {
          const asset = assets.find((x) => x.id === a.id);
          return asset && fn(asset);
        })
        .map((a) => a.percent),
    );
  return {
    uah: match((a) => a.currency === "UAH"),
    usd: match((a) => a.currency === "USD"),
    eur: match((a) => a.currency === "EUR"),
    metal: match((a) => a.group === "metal"),
    fixed: match((a) => a.group === "fixed"),
    estate: match((a) => a.group === "estate"),
    cash: match((a) => a.group === "cash"),
    concentration: Math.max(0, ...allocation.map((a) => a.percent)),
    liquid: match((a) => ["cash", "fx"].includes(a.kind)),
  };
}
export type HistoryPoint = { date: string; value: number };
export function historicalReplay(
  capital: number,
  allocation: { id: string; percent: number }[],
  series: Record<string, HistoryPoint[]>,
  from: string,
  to: string,
) {
  const active = allocation.filter((a) => a.percent > 0);
  const missing = active
    .filter(
      (a) =>
        a.id !== "cash" &&
        (["inzhur", "energy", "ovdp", "military", "fx-bond"].includes(a.id) ||
          !series[a.id]?.length ||
          series[a.id][0].date > from ||
          series[a.id].at(-1)!.date < to),
    )
    .map((a) => a.id);
  if (missing.length) return { missing, points: [] };
  if (active.every((a) => a.id === "cash"))
    return {
      missing: [],
      points: [
        { date: from, value: capital },
        { date: to, value: capital },
      ],
    };
  const dates = [
    ...new Set(
      active.flatMap(
        (a) =>
          series[a.id]
            ?.filter((p) => p.date >= from && p.date <= to)
            .map((p) => p.date) || [],
      ),
    ),
  ].sort();
  const common = dates.filter((date) =>
    active.every(
      (a) => a.id === "cash" || series[a.id].some((p) => p.date === date),
    ),
  );
  const points = common.map((date) => ({
    date,
    value: sum(
      active.map((a) => {
        if (a.id === "cash") return (capital * a.percent) / 100;
        const first = series[a.id].find((p) => p.date >= from)!,
          current = series[a.id].find((p) => p.date === date)!;
        return fxValue(
          (capital * a.percent) / 100 / first.value,
          current.value,
        );
      }),
    ),
  }));
  return { missing, points };
}
