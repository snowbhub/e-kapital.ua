import { z } from "zod";
import { assets, type AssetId } from "../finance/assets";
const assetId = z.enum(assets.map((a) => a.id) as [AssetId, ...AssetId[]]);
export const currencySchema = z.enum(["UAH", "USD", "EUR"]);
const amount = z.number().finite().min(0).max(1e12);
const id = z.string().min(1).max(100);
const text = z.string().max(160);
const period = z.string().regex(/^\d{4}-\d{2}$/);
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (v) =>
      !Number.isNaN(Date.parse(v)) &&
      new Date(v + "T00:00:00Z").toISOString().slice(0, 10) === v,
    "Некоректна дата",
  );
const line = z.object({
  id,
  name: text,
  amount,
  currency: currencySchema,
  frequency: z.enum(["monthly", "weekly", "annual", "once"]),
  regular: z.boolean(),
  essential: z.boolean(),
  debt: z.boolean(),
});
const plan = z
  .object({
    reserve: amount.max(100),
    goals: amount.max(100),
    invest: amount.max(100),
    free: amount.max(100),
  })
  .refine(
    (v) => Math.abs(v.reserve + v.goals + v.invest + v.free - 100) < 0.01,
    "Розподіл має дорівнювати 100%",
  );
const scenario = z.object({
  usd: z.number().min(-99).max(100),
  eur: z.number().min(-99).max(100),
  gold: z.number().min(-99).max(100),
  silver: z.number().min(-99).max(100),
  fundCash: amount.max(100),
  fundNav: z.number().min(-99).max(100),
  deposit: amount.max(100),
  bond: amount.max(100),
  inflation: z.number().min(-99).max(100),
  tax: amount.max(100),
  fee: amount.max(100),
  buySpread: amount.max(100),
  sellSpread: amount.max(99),
  reinvest: z.boolean(),
});
export const stateSchema = z.object({
  version: z.literal(1),
  onboarded: z.boolean(),
  currentPeriod: period,
  periods: z
    .array(
      z.object({
        id: period,
        incomes: z.array(line).max(100),
        expenses: z.array(line).max(200),
        plan,
        actual: z.object({
          income: amount,
          expenses: amount,
          reserve: amount,
          goals: amount,
          invest: amount,
        }),
        checkedIn: z.boolean(),
      }),
    )
    .max(1200),
  reserve: z.object({
    current: amount,
    months: amount.max(120),
    monthly: amount,
    storage: z
      .object({
        UAH: amount.max(100),
        USD: amount.max(100),
        EUR: amount.max(100),
      })
      .refine((v) => Math.abs(v.UAH + v.USD + v.EUR - 100) < 0.01),
  }),
  goals: z
    .array(
      z.object({
        id,
        name: text,
        type: text,
        target: amount,
        current: amount,
        monthly: amount,
        currency: currencySchema,
        date,
        scenarioEnabled: z.boolean(),
        rate: z.number().min(-99).max(100),
        city: text,
      }),
    )
    .max(200),
  portfolio: z.object({
    capital: amount,
    monthly: amount,
    years: z.number().int().min(1).max(30),
    allocation: z
      .array(
        z.object({
          id: assetId,
          percent: amount.max(100),
          locked: z.boolean(),
        }),
      )
      .length(11)
      .refine(
        (v) =>
          Math.abs(v.reduce((s, a) => s + a.percent, 0) - 100) < 0.01 &&
          new Set(v.map((a) => a.id)).size === v.length,
      ),
    scenario,
    savedScenarios: z
      .array(z.object({ id, name: text, scenario, createdAt: z.string() }))
      .max(100),
  }),
  holdings: z
    .array(
      z.object({
        id,
        assetId,
        name: text,
        value: amount,
        currency: currencySchema,
        bucket: z.enum(["liquid", "investment", "goal"]),
      }),
    )
    .max(500),
  liabilities: z
    .array(
      z.object({ id, name: text, value: amount, currency: currencySchema }),
    )
    .max(200),
  transactions: z
    .array(
      z.object({
        id,
        date,
        assetId,
        type: z.enum([
          "buy",
          "sell",
          "contribution",
          "redemption",
          "dividend",
          "coupon",
        ]),
        amount,
        currency: currencySchema,
        note: text,
      }),
    )
    .max(10000),
  snapshots: z
    .array(
      z.object({
        date,
        netWorth: z.number().finite(),
        contributions: amount,
        goalProgress: amount,
        allocation: z.array(
          z.object({ id: assetId, percent: amount.max(100) }),
        ),
      }),
    )
    .max(5000),
  manualFx: z.object({
    USD: z.number().positive().nullable(),
    EUR: z.number().positive().nullable(),
  }),
});
export type State = z.infer<typeof stateSchema>;
export type Line = z.infer<typeof line>;
export function monthKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
export const blankPeriod = (id = monthKey()): State["periods"][number] => ({
  id,
  incomes: [],
  expenses: [],
  plan: { reserve: 0, goals: 0, invest: 0, free: 100 },
  actual: { income: 0, expenses: 0, reserve: 0, goals: 0, invest: 0 },
  checkedIn: false,
});
export function initialState(): State {
  return {
    version: 1,
    onboarded: false,
    currentPeriod: monthKey(),
    periods: [blankPeriod()],
    reserve: {
      current: 0,
      months: 3,
      monthly: 0,
      storage: { UAH: 100, USD: 0, EUR: 0 },
    },
    goals: [],
    portfolio: {
      capital: 0,
      monthly: 0,
      years: 5,
      allocation: [
        { id: "ovdp", percent: 0, locked: false },
        { id: "military", percent: 0, locked: false },
        { id: "fx-bond", percent: 0, locked: false },
        { id: "inzhur", percent: 0, locked: false },
        { id: "energy", percent: 0, locked: false },
        { id: "deposit", percent: 0, locked: false },
        { id: "usd", percent: 0, locked: false },
        { id: "eur", percent: 0, locked: false },
        { id: "gold", percent: 0, locked: false },
        { id: "silver", percent: 0, locked: false },
        { id: "cash", percent: 100, locked: false },
      ],
      scenario: {
        usd: 0,
        eur: 0,
        gold: 0,
        silver: 0,
        fundCash: 0,
        fundNav: 0,
        deposit: 0,
        bond: 0,
        inflation: 0,
        tax: 0,
        fee: 0,
        buySpread: 0,
        sellSpread: 0,
        reinvest: false,
      },
      savedScenarios: [],
    },
    holdings: [],
    liabilities: [],
    transactions: [],
    snapshots: [],
    manualFx: { USD: null, EUR: null },
  };
}
export function rollover(state: State, now = new Date()): State {
  const key = monthKey(now);
  if (state.periods.some((p) => p.id === key))
    return { ...state, currentPeriod: key };
  return {
    ...state,
    currentPeriod: key,
    periods: [...state.periods, blankPeriod(key)],
  };
}
