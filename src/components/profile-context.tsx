"use client";
import { createContext, useContext } from "react";
import { useProfile } from "@/lib/storage/use-profile";
import type { Market } from "@/lib/data/schema";
import { emptyMarket } from "@/lib/data/schema";
import { acceptMarketResponse } from "@/lib/data/client-market";
import { useEffect, useState } from "react";
import { monthlyAmount, sum, cashFlow } from "@/lib/finance/calculations";
import type { Line } from "@/lib/storage/schema";
type Profile = ReturnType<typeof useProfile> & { market: Market };
const context = createContext<Profile | null>(null);
export function ProfileProvider({
  children,
  initialMarket = emptyMarket,
}: {
  children: React.ReactNode;
  initialMarket?: Market;
}) {
  const profile = useProfile();
  const [market, setMarket] = useState<Market>(initialMarket);
  useEffect(() => {
    fetch("/api/market?v=bank-offers-v1", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((v) => {
        if (v) setMarket((previous) => acceptMarketResponse(previous, v));
      })
      .catch(() => {});
  }, []);
  return (
    <context.Provider value={{ ...profile, market }}>
      {children}
    </context.Provider>
  );
}
export function useCapital() {
  const p = useContext(context);
  if (!p) throw new Error("ProfileProvider missing");
  return p;
}
export function useNumbers() {
  const { state, market } = useCapital();
  const period = state.periods.find((p) => p.id === state.currentPeriod)!;
  const rates = {
    UAH: 1,
    USD:
      state.manualFx.USD ??
      market.rates.find((r) => r.code === "USD")?.value ??
      null,
    EUR:
      state.manualFx.EUR ??
      market.rates.find((r) => r.code === "EUR")?.value ??
      null,
  };
  const toUah = (value: number, currency: keyof typeof rates) =>
    rates[currency] === null ? null : value * rates[currency]!;
  const lines = (items: Line[]) => {
    const values = items.map((i) =>
      toUah(monthlyAmount(i.amount, i.frequency), i.currency),
    );
    return values.some((v) => v === null) ? null : sum(values as number[]);
  };
  const income = lines(period.incomes),
    essential = lines(period.expenses.filter((l) => l.essential && !l.debt)),
    other = lines(period.expenses.filter((l) => !l.essential && !l.debt)),
    debt = lines(period.expenses.filter((l) => l.debt));
  const flow = [income, essential, other, debt].every((v) => v !== null)
    ? cashFlow(income!, essential!, other!, debt!)
    : null;
  const holdings = state.holdings.map((h) => toUah(h.value, h.currency)),
    liabilities = state.liabilities.map((l) => toUah(l.value, l.currency));
  const total = holdings.some((v) => v === null)
      ? null
      : sum(holdings as number[]),
    owed = liabilities.some((v) => v === null)
      ? null
      : sum(liabilities as number[]);
  const netWorth = total !== null && owed !== null ? total - owed : null;
  return { period, rates, toUah, flow, total, owed, netWorth };
}
