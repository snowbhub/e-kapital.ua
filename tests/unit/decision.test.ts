import { describe, it, expect } from "vitest";
import {
  projectInvestment,
  compareHousing,
  decisionReferences,
  type ProjectionInput,
  type HousingInput,
} from "../../src/lib/finance/decision";
import { stateSchema, initialState } from "../../src/lib/storage/schema";
import { getSnapshot } from "../../src/lib/data/market";

const base: ProjectionInput = {
  capital: 100000,
  monthly: 1000,
  months: 12,
  cashRate: 0,
  priceRate: 0,
  tax: 0,
  annualFee: 0,
  entryFee: 0,
  exitFee: 0,
  inflation: 0,
  reinvest: true,
};
const market = getSnapshot();
const home: HousingInput = {
  capital: 300000,
  monthly: 5000,
  months: 12,
  price: 1000000,
  down: 200000,
  fees: 0,
  rent: 10000,
  upkeep: 0,
  years: 20,
  age: 30,
  subsidized: false,
  investmentRate: 0,
  houseGrowth: 0,
  rentGrowth: 0,
};
describe("investment decision arithmetic", () => {
  it("keeps contributed cash separate from investment gain", () => {
    const r = projectInvestment(base);
    expect(r.total).toBe(112000);
    expect(r.gain).toBe(0);
    expect(r.payouts).toBe(0);
  });
  it("pays monthly cash without adding the same payout to assets", () => {
    const r = projectInvestment({
      ...base,
      cashRate: 12,
      reinvest: false,
      tax: 20,
    });
    expect(r.payouts).toBeCloseTo(10128, 5);
    expect(r.finalAssets).toBe(112000);
    expect(r.total).toBeCloseTo(122128, 5);
  });
  it("charges entry on each contribution and exit once", () => {
    const r = projectInvestment({ ...base, entryFee: 2, exitFee: 1 });
    expect(r.total).toBeCloseTo(112000 * 0.98 * 0.99, 5);
    expect(r.contributed).toBe(112000);
  });
  it("keeps price growth separate from income and adjusts purchasing power", () => {
    const r = projectInvestment({
      ...base,
      monthly: 0,
      priceRate: 20,
      inflation: 20,
    });
    expect(r.total).toBeCloseTo(120000, 5);
    expect(r.cashPerMonth).toBe(0);
    expect(r.real).toBeCloseTo(100000, 5);
  });
  it("a falling asset can lose money despite positive cash distributions", () => {
    const r = projectInvestment({
      ...base,
      monthly: 0,
      priceRate: -20,
      cashRate: 5,
      reinvest: false,
    });
    expect(r.gain).toBeLessThan(0);
    expect(r.payouts).toBeGreaterThan(0);
  });
});
describe("housing decisions with equal budgets", () => {
  it("uses rent plus savings as the shared monthly budget", () => {
    const r = compareHousing(home, market.eoselia)!;
    expect(r.budget).toBe(15000);
    expect(r.waitNet).toBe(360000);
    expect(r.buyNet).toBeGreaterThan(0);
    expect(r.debt).toBeLessThan(800000);
  });
  it("cash purchase saves rent without counting the down payment twice", () => {
    const r = compareHousing(
      { ...home, capital: 1000000, down: 1000000 },
      market.eoselia,
    )!;
    expect(r.waitNet).toBe(1060000);
    expect(r.buyNet).toBe(1180000);
    expect(r.debt).toBe(0);
  });
  it("does not fabricate a purchase when upfront capital is insufficient", () => {
    const r = compareHousing(
      { ...home, capital: 100000, fees: 10000 },
      market.eoselia,
    )!;
    expect(r.gap).toBe(110000);
    expect(r.eligible).toBe(false);
    expect(r.buyNet).toBeNull();
  });
  it("exposes unfunded payments instead of silently adding credit", () => {
    const r = compareHousing(
      { ...home, capital: 200000, monthly: 0, rent: 0 },
      market.eoselia,
    )!;
    expect(r.buyDeficit).toBeGreaterThan(0);
    expect(r.firstSurplus).toBeLessThan(0);
  });
  it("respects the rate change and returns no invented mortgage when terms are missing", () => {
    const r = compareHousing({ ...home, months: 240 }, market.eoselia)!;
    expect(r.loan.laterPayment).toBeGreaterThan(r.loan.firstPayment);
    expect(r.debt).toBe(0);
    expect(compareHousing(home, null)).toBeNull();
  });
});
describe("references and compatibility", () => {
  it("chooses a dated future UAH issue and does not parse USD fund marketing as a UAH forecast", () => {
    const r = decisionReferences(market, "2026-10-06");
    expect((r.bond?.maturity ?? "") > "2026-10-06").toBe(true);
    expect(r.bond?.currency).toBe("UAH");
    expect(r.fundCashRate).toBeCloseTo(
      ((r.distribution!.amount * 12) / r.fund!.purchasePrice) * 100,
      8,
    );
  });
  it("upgrades older device profiles without dropping holdings or budgets", () => {
    const old = { ...initialState(), decision: undefined };
    old.portfolio.capital = 55000;
    const migrated = stateSchema.parse(old);
    expect(migrated.decision.inputs.capital).toBe(0);
    expect(migrated.portfolio.capital).toBe(55000);
    expect(migrated.decision.plans).toEqual([]);
  });
});
