import { z } from "zod";
export const metalQuoteSchema = z
  .object({
    metal: z.enum(["XAU", "XAG"]),
    grams: z.number().positive().max(1000),
    buy: z.number().positive(),
    sell: z.number().positive(),
    date: z.iso.date(),
    retrievedAt: z.iso.datetime(),
  })
  .refine((q) => q.sell >= q.buy, "Непідтверджений спред");
export type MetalQuote = z.infer<typeof metalQuoteSchema>;
export const metalSource = "https://privatbank.ua/pb/ajax/bank-metall-courses";
export const metalPage = "https://privatbank.ua/banking-metals";
export function parseMetalQuotes(
  raw: unknown,
  retrievedAt: string,
  date = new Date().toISOString().slice(0, 10),
) {
  const data = z
      .object({
        status: z.literal(true),
        metalRates: z.record(z.string(), z.unknown()),
      })
      .parse(raw),
    quotes: MetalQuote[] = [];
  for (const [key, code] of [
    ["gold", "XAU"],
    ["silver", "XAG"],
  ] as const) {
    const metal = z
      .object({
        date: z.string().regex(/^\d{2}\.\d{2}\.\d{4}$/),
        rates: z.object({
          one: z.record(
            z.string(),
            z.object({
              size: z.string(),
              prices: z.object({
                purchaseRate: z.string(),
                saleRate: z.string(),
              }),
            }),
          ),
        }),
      })
      .parse(data.metalRates[key]);
    const effective = metal.date.split(".").reverse().join("-");
    if (
      effective > date ||
      Date.parse(date) - Date.parse(effective) > 7 * 86400000
    )
      continue;
    for (const q of Object.values(metal.rates.one)) {
      const result = metalQuoteSchema.safeParse({
        metal: code,
        grams: Number(q.size),
        buy: Number(q.prices.purchaseRate.replace(/\s/g, "")),
        sell: Number(q.prices.saleRate.replace(/\s/g, "")),
        date: effective,
        retrievedAt,
      });
      if (result.success) quotes.push(result.data);
    }
  }
  if (!quotes.length) throw Error("Немає свіжих ненульових котировок металів");
  return quotes.sort(
    (a, b) => a.metal.localeCompare(b.metal) || a.grams - b.grams,
  );
}
export function metalPurchase(budget: number, quote: MetalQuote) {
  const cost = quote.grams * quote.sell,
    count = Math.floor(budget / cost),
    spent = count * cost,
    left = budget - spent;
  const buyback = count * quote.grams * quote.buy;
  return {
    count,
    grams: count * quote.grams,
    spent,
    left,
    buyback,
    total: buyback + left,
    spreadLoss: spent - buyback,
    breakEvenGrowth: (quote.sell / quote.buy - 1) * 100,
  };
}
