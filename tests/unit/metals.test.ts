import { describe, expect, it } from "vitest";
import {
  parseMetalQuotes,
  metalPurchase,
} from "../../src/lib/data/metal-quotes";
const row = (size: string, buy: string, sell: string) => ({
  size,
  prices: { purchaseRate: buy, saleRate: sell },
});
const raw = {
  status: true,
  metalRates: {
    gold: {
      date: "07.10.2026",
      rates: {
        one: { "1": row("1", "6 835.00", "8 155.00") },
        two: { "1": row("1", "5000", "6000") },
      },
    },
    silver: {
      date: "07.10.2026",
      rates: { one: { "10": row("10", "91.55", "264.05") } },
    },
  },
};
describe("physical metal quotes", () => {
  it("reads bank purchase and sale in UAH per gram, for the disclosed category only", () => {
    const q = parseMetalQuotes(raw, "2026-10-07T12:00:00.000Z", "2026-10-07");
    expect(q).toHaveLength(2);
    expect(q.find((q) => q.metal === "XAU")).toMatchObject({
      grams: 1,
      buy: 6835,
      sell: 8155,
      date: "2026-10-07",
    });
  });
  it("counts whole bars, leaves unspent cash and exposes the entry/exit spread", () => {
    const quote = parseMetalQuotes(
      raw,
      "2026-10-07T12:00:00.000Z",
      "2026-10-07",
    ).find((q) => q.metal === "XAU")!;
    expect(metalPurchase(10000, quote)).toMatchObject({
      count: 1,
      grams: 1,
      spent: 8155,
      left: 1845,
      buyback: 6835,
      total: 8680,
      spreadLoss: 1320,
    });
    expect(metalPurchase(100, quote).count).toBe(0);
  });
  it("rejects zero, future and expired public quotes", () => {
    expect(() =>
      parseMetalQuotes(raw, "2026-10-07T12:00:00.000Z", "2026-10-06"),
    ).toThrow();
    expect(() =>
      parseMetalQuotes(raw, "2026-10-07T12:00:00.000Z", "2026-10-15"),
    ).toThrow();
    const zero = structuredClone(raw);
    zero.metalRates.gold.rates.one["1"].prices.saleRate = "0";
    zero.metalRates.silver.rates.one["10"].prices.saleRate = "0";
    expect(() =>
      parseMetalQuotes(zero, "2026-10-07T12:00:00.000Z", "2026-10-07"),
    ).toThrow();
  });
});
