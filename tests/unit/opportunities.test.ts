import { describe, it, expect } from "vitest";
import { getSnapshot } from "../../src/lib/data/market";
import { marketSchema } from "../../src/lib/data/schema";
import bankSnapshot from "../../data/banks.json";
import {
  buildOpportunities,
  historicalContext,
  macroScenarios,
  opportunityValue,
  type Macro,
} from "../../src/lib/finance/opportunities";
import { depositProjection } from "../../src/lib/finance/automatic";
import { businessModel, rentalModel } from "../../src/lib/finance/ventures";
const date = "2026-10-06";
const snapshot = getSnapshot();
const market = marketSchema.parse({ ...snapshot, ...bankSnapshot });
const input = {
  capital: 100000,
  monthly: 5000,
  months: 12,
  currency: "UAH" as const,
  purpose: "grow" as const,
};
const macro: Macro = {
  id: "history5",
  name: "test",
  inflation: 10,
  growth: { USD: 10, EUR: 8 },
  start: date,
  end: date,
  source: "https://bank.gov.ua/",
};
describe("opportunity engine", () => {
  it("ships compact monthly history with full 5 and 10 year windows", () => {
    expect(snapshot.history.usd.length).toBeLessThanOrEqual(134);
    const five = historicalContext(snapshot, 5, date)!;
    const ten = historicalContext(snapshot, 10, date)!;
    expect(five).not.toBeNull();
    expect(ten).not.toBeNull();
    expect(Math.pow(1 + five.growth.USD / 100, 5)).toBeCloseTo(
      five.ratios.USD,
      8,
    );
    expect(Math.pow(1 + ten.inflation / 100, 10)).toBeCloseTo(
      ten.inflationFactor,
      8,
    );
  });
  it("rejects incomplete CPI and FX rather than assume zero", () => {
    expect(
      historicalContext(
        {
          ...snapshot,
          cpi: snapshot.cpi.filter((_, i) => i !== snapshot.cpi.length - 6),
        },
        5,
        date,
      ),
    ).toBeNull();
    expect(historicalContext({ ...snapshot, history: {} }, 5, date)).toBeNull();
    expect(historicalContext(snapshot, 5, "2027-10-01")).toBeNull();
  });
  it("labels empirical scenarios separately and computes a historical stress", () => {
    const macros = macroScenarios(snapshot, date);
    expect(macros.map((m) => m.id)).toEqual([
      "stable",
      "history5",
      "history10",
      "stress",
    ]);
    expect(macros.at(-1)!.inflation).toBeGreaterThanOrEqual(
      macros[1].inflation,
    );
  });
  it("does not grow nominal UAH cash", () => {
    const o = buildOpportunities(market, input, macro, date).find(
      (o) => o.id === "cash-UAH",
    )!;
    expect(o.rows.at(-1)!.value).toBe(160000);
    expect(
      opportunityValue(160000, 12, "UAH", macro, market, true),
    ).toBeCloseTo(160000 / 1.1, 6);
  });
  it("buys each future USD contribution at that month's scenario quote", () => {
    const o = buildOpportunities(market, input, macro, date).find(
      (o) => o.id === "cash-USD",
    )!;
    const q = market.fxQuotes.find((q) => q.currency === "USD")!;
    let expected = input.capital / q.sell;
    for (let m = 1; m <= 12; m++)
      expected += 5000 / (q.sell * Math.pow(1.1, m / 12));
    expect(o.rows.at(-1)!.value).toBeCloseTo(expected * q.buy * 1.1, 7);
    const naive = (160000 / q.sell) * q.buy * 1.1;
    expect(o.rows.at(-1)!.value).toBeLessThan(naive);
  });
  it("keeps uninvested USD savings constant when USD is the reference", () => {
    const o = buildOpportunities(
      market,
      { ...input, currency: "USD" },
      macro,
      date,
    ).find((o) => o.id === "cash-USD")!;
    expect(
      opportunityValue(o.rows.at(-1)!.value, 12, "USD", macro, market),
    ).toBeCloseTo(160000, 7);
  });
  it("does not change fixed UAH deposit cash flows when FX changes", () => {
    const offer = market.deposits.find((o) => o.id === "mono-UAH-12")!;
    const a = depositProjection(offer, input, market.fxQuotes, 10, date)!;
    const b = depositProjection(
      offer,
      input,
      market.fxQuotes,
      10,
      date,
      macro.growth,
    )!;
    expect(a.rows).toEqual(b.rows);
  });
  it("does not offer deposits below their minimum and uses actual spread", () => {
    const options = buildOpportunities(
      market,
      { ...input, capital: 10, monthly: 0 },
      macro,
      date,
    );
    expect(options.some((o) => o.kind === "deposit")).toBe(false);
    expect(
      opportunityValue(1000, 0, "USD", macro, { ...market, fxQuotes: [] }),
    ).toBeNull();
  });
  it("mixes real half-sized fund and currency cash flows, including whole units", () => {
    const options = buildOpportunities(market, input, macro, date);
    const mix = options.find((o) => o.id === "mix")!,
      dollar = options.find((o) => o.id === "cash-USD")!;
    const fundHalf = buildOpportunities(
      market,
      { ...input, capital: input.capital / 2, monthly: input.monthly / 2 },
      macro,
      date,
    ).find((o) => o.id === "fund")!;
    for (let m = 0; m <= 12; m++)
      expect(mix.rows[m].value).toBeCloseTo(
        fundHalf.rows[m].value + dollar.rows[m].value / 2,
        7,
      );
  });
});
describe("concrete venture economics", () => {
  it("deducts group 3 revenue taxes, not profit taxes, and mandatory ESV", () => {
    const p = businessModel({
      investment: 200000,
      revenue: 80000,
      expenses: 60000,
      group: "3",
      months: 60,
      esvExempt: false,
      salesDrop: 0,
    });
    expect(p.taxes).toBeCloseTo(6702.34, 2);
    expect(p.net).toBeCloseTo(13297.66, 2);
    expect(p.breakEven).toBeCloseTo(61902.34 / 0.94, 2);
  });
  it("shows no payback for loss-making business and detects tax-group limit", () => {
    const p = businessModel({
      investment: 200000,
      revenue: 80000,
      expenses: 60000,
      group: "3",
      months: 60,
      esvExempt: false,
      salesDrop: 40,
    });
    expect(p.net).toBeLessThan(0);
    expect(p.payback).toBeNull();
    expect(
      businessModel({
        investment: 1,
        revenue: 1000000,
        expenses: 0,
        group: "2",
        months: 12,
        esvExempt: false,
        salesDrop: 0,
      }).overLimit,
    ).toBe(true);
  });
  it("accounts for vacancy, rent tax and repairs in rental yield", () => {
    const p = rentalModel({
      price: 1800000,
      repair: 300000,
      entryFees: 50000,
      rent: 15000,
      emptyMonths: 1,
      upkeep: 1500,
      months: 60,
      saleChange: 0,
      saleFees: 0,
    });
    expect(p.investment).toBe(2150000);
    expect(p.income).toBe(545250);
    expect(p.netYield).toBeCloseTo((109050 / 2150000) * 100, 6);
    expect(
      rentalModel({
        price: 1,
        repair: 0,
        entryFees: 0,
        rent: 100,
        emptyMonths: 12,
        upkeep: 1,
        months: 12,
        saleChange: 0,
        saleFees: 0,
      }).payback,
    ).toBeNull();
  });
});
