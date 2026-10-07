import { z } from "zod";
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((s) => {
    const d = new Date(s + "T00:00:00Z");
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
  }, "Некоректна календарна дата");
export const metadataSchema = z.object({
  source: z.string(),
  sourceUrl: z.url(),
  retrievedAt: z.iso.datetime(),
  effectiveDate: date,
  dataType: z.enum(["fact", "terms", "issuer-expectation", "historical"]),
  freshness: z.enum(["daily", "monthly", "annual", "historical"]),
  effectiveDateBasis: z.enum(["published", "retrieved"]).default("published"),
});
export const rateSchema = z.object({
  code: z.enum(["USD", "EUR", "XAU", "XAG"]),
  value: z.number().positive(),
  unit: z.enum(["currency", "troy-ounce"]),
  meta: metadataSchema,
});
export const historyPointSchema = z.object({
  date,
  value: z.number().positive(),
  meta: metadataSchema,
});
export const bondSchema = z.object({
  isin: z.string().regex(/^UA\d{10}$/),
  currency: z.enum(["UAH", "USD", "EUR"]),
  nominal: z.number().positive(),
  maturity: date,
  couponRate: z.number().min(0).max(100).nullable(),
  publishedRate: z.number().min(0).max(100).nullable(),
  lastPlacement: date.nullable(),
  kind: z.enum(["coupon", "discount"]),
  military: z.boolean(),
  payments: z.array(
    z.object({
      date,
      amount: z.number().positive(),
      kind: z.enum(["coupon", "principal"]),
    }),
  ),
  meta: metadataSchema,
});
export const fundSchema = z.object({
  id: z.enum(["inzhur", "energy"]),
  name: z.string(),
  nav: z.number().positive(),
  purchasePrice: z.number().positive(),
  publishedExpectation: z.string().nullable(),
  actualReturn: z.string().nullable(),
  feeNotes: z.array(z.string()),
  reports: z.array(z.object({ title: z.string(), url: z.url() })),
  distributions: z.array(
    z.object({
      date,
      amount: z.number().min(0),
      dateBasis: z.enum(["payment", "period"]).default("payment"),
      sourceUrl: z.url().optional(),
      publishedAt: date.optional(),
      retrievedAt: z.iso.datetime().optional(),
    }),
  ),
  meta: metadataSchema,
});
export const eoseliaSchema = z.object({
  subsidized: z.array(z.number().min(0).max(100)).length(2),
  standard: z.array(z.number().min(0).max(100)).length(2),
  changeAfterMonths: z.number().int().positive(),
  maxYears: z.number().int().positive(),
  minAge: z.number().int().positive(),
  maxAge: z.number().int().positive(),
  downPayment: z.number().positive().max(100),
  youthDownPayment: z.number().positive().max(100),
  youthMaxAge: z.number().int().positive(),
  categories: z.array(
    z.object({ id: z.string(), name: z.string(), subsidized: z.boolean() }),
  ),
  banks: z.array(z.string()),
  meta: metadataSchema,
});
export const marketSchema = z.object({
  deposits: z
    .array(
      z.object({
        id: z.string(),
        bank: z.string(),
        product: z.string(),
        currency: z.enum(["UAH", "USD", "EUR"]),
        minMonths: z.number().int().positive(),
        maxMonths: z.number().int().positive(),
        termDays: z.number().int().positive().nullable(),
        rate: z.number().min(0).max(100),
        minimum: z.number().positive(),
        maximum: z.number().positive().nullable(),
        payout: z.enum(["monthly", "capitalized", "maturity"]),
        replenishable: z.boolean(),
        topUpCutoffMonths: z.number().int().min(0),
        earlyWithdrawal: z.boolean(),
        notes: z.string(),
        meta: metadataSchema,
      }),
    )
    .default([]),
  fxQuotes: z
    .array(
      z.object({
        bank: z.string(),
        currency: z.enum(["USD", "EUR"]),
        buy: z.number().positive(),
        sell: z.number().positive(),
        channel: z.string(),
        meta: metadataSchema,
      }),
    )
    .default([]),
  rates: z.array(rateSchema),
  bonds: z.array(bondSchema),
  funds: z.array(fundSchema),
  eoselia: eoseliaSchema.nullable(),
  cpi: z.array(historyPointSchema),
  history: z.record(z.string(), z.array(historyPointSchema)),
  health: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      sourceUrl: z.url(),
      frequency: z.string(),
      lastSuccess: z.string().nullable(),
      lastAttempt: z.string(),
      error: z.string().nullable(),
      records: z.number().int().min(0),
    }),
  ),
});
export type Market = z.infer<typeof marketSchema>;
export type DepositOffer = Market["deposits"][number];
export type FxQuote = Market["fxQuotes"][number];
export type MarketBond = z.infer<typeof bondSchema>;
export type MarketFund = z.infer<typeof fundSchema>;
export type Eoselia = z.infer<typeof eoseliaSchema>;
export type Meta = z.infer<typeof metadataSchema>;
export const emptyMarket: Market = {
  deposits: [],
  fxQuotes: [],
  rates: [],
  bonds: [],
  funds: [],
  eoselia: null,
  cpi: [],
  history: {},
  health: [],
};

const storedMarketSchema = marketSchema.extend({
  history: z.record(
    z.string(),
    z.union([
      z.array(historyPointSchema),
      z.object({
        meta: metadataSchema,
        points: z.array(z.tuple([date, z.number().positive()])),
      }),
    ]),
  ),
});
export function parseStoredMarket(input: unknown): Market {
  const stored = storedMarketSchema.parse(input);
  return {
    ...stored,
    history: Object.fromEntries(
      Object.entries(stored.history).map(([asset, dataset]) => [
        asset,
        Array.isArray(dataset)
          ? dataset
          : dataset.points.map(([date, value]) => ({
              date,
              value,
              meta: { ...dataset.meta, effectiveDate: date },
            })),
      ]),
    ),
  };
}
export function storeMarket(market: Market) {
  const valid = marketSchema.parse(market);
  return {
    ...valid,
    history: Object.fromEntries(
      Object.entries(valid.history).map(([asset, points]) => [
        asset,
        points.length
          ? {
              meta: points.at(-1)!.meta,
              points: points.map((p) => [p.date, p.value]),
            }
          : [],
      ]),
    ),
  };
}
