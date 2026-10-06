import { describe, it, expect, vi } from "vitest";
import { getSnapshot } from "../../src/lib/data/market";
import {
  automaticOptions,
  depositProjection,
  recentInflation,
  usableQuotes,
} from "../../src/lib/finance/automatic";
import {
  parseMonoDeposits,
  parsePumbDeposits,
  parseMonoFx,
  refreshBanks,
} from "../../src/lib/data/bank-providers";
import { decisionInputsSchema } from "../../src/lib/storage/decision";
import bankSnapshot from "../../data/banks.json";
import { marketSchema } from "../../src/lib/data/schema";
const date = "2026-10-06";
const snapshot = getSnapshot();
// Fixed historical fixture; scheduled live-market updates must not move test dates.
const market = marketSchema.parse({
  ...snapshot,
  ...bankSnapshot,
  cpi: Array.from({ length: 12 }, (_, i) => ({
    date: new Date(Date.UTC(2025, 8 + i, 1)).toISOString().slice(0, 10),
    value: 100.5,
    meta: snapshot.cpi[0].meta,
  })),
});
const input = {
  capital: 100000,
  monthly: 0,
  months: 12,
  currency: "UAH" as const,
  purpose: "grow" as const,
};
const offer = market.deposits.find((o) => o.id === "mono-UAH-12")!;
describe("automatic financial decisions", () => {
  it("preserves last verified offers when official sources are unavailable", async () => {
    const spy = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new Error("Unavailable"));
    try {
      const previous = structuredClone(market);
      const next = await refreshBanks(previous);
      expect(next.deposits).toEqual(previous.deposits);
      expect(next.fxQuotes).toEqual(previous.fxQuotes);
      expect(next.health.find((h) => h.id === "bank-mono")?.error).toBe(
        "Unavailable",
      );
      expect(previous).toEqual(market);
    } finally {
      spy.mockRestore();
    }
  });
  it("has verified factual offers in three currencies", () => {
    expect(market.deposits.length).toBe(28);
    expect(new Set(market.deposits.map((o) => o.currency)).size).toBe(3);
    expect(
      market.deposits
        .filter((o) => o.bank === "ПУМБ")
        .every((o) => !o.replenishable && o.termDays),
    ).toBe(true);
  });
  it("subtracts resident interest tax and compounds only net interest", () => {
    const p = depositProjection(offer, input, market.fxQuotes, 8, date)!;
    expect(p.total).toBeGreaterThan(112000);
    expect(p.total).toBeLessThan(114000);
    expect(p.income / p.tax).toBeCloseTo(77 / 23, 7);
    expect(p.real).toBeCloseTo(p.total / 1.08, 5);
  });
  it("does not earn on forbidden extra payments", () => {
    const fixed = {
      ...offer,
      replenishable: false,
      payout: "monthly" as const,
    };
    const a = depositProjection(fixed, input, market.fxQuotes, 8, date)!;
    const b = depositProjection(
      fixed,
      { ...input, monthly: 5000 },
      market.fxQuotes,
      8,
      date,
    )!;
    expect(b.total - a.total).toBeCloseTo(60000, 5);
    expect(b.income).toBeCloseTo(a.income, 5);
  });
  it("respects minimum amounts, exact maturity days and FX conversion limit", () => {
    expect(
      depositProjection(
        offer,
        { ...input, capital: 999, monthly: 0 },
        market.fxQuotes,
        8,
        date,
      ),
    ).toBeNull();
    const pumb = market.deposits.find((o) => o.id === "pumb-UAH-12")!;
    expect(depositProjection(pumb, input, market.fxQuotes, 8, date)).toBeNull();
    const usd = market.deposits.find((o) => o.id === "mono-USD-12")!;
    expect(
      depositProjection(
        usd,
        { ...input, capital: 250000 },
        market.fxQuotes,
        8,
        date,
      ),
    ).toBeNull();
  });
  it("includes spread and taxes for foreign deposits", () => {
    const usd = market.deposits.find((o) => o.id === "mono-USD-12")!;
    const p = depositProjection(
      { ...usd, rate: 0 },
      input,
      market.fxQuotes,
      8,
      date,
    )!;
    expect(p.total).toBeLessThan(input.capital);
    expect(p.total).toBeCloseTo(
      (100000 * market.fxQuotes[0].buy) / market.fxQuotes[0].sell,
      5,
    );
  });
  it("uses a consecutive historical CPI series, never a missing-data zero", () => {
    expect(recentInflation(market, date)?.rate).toBeGreaterThan(0);
    expect(recentInflation(market, date)?.rate).toBeCloseTo(
      (1.005 ** 12 - 1) * 100,
      8,
    );
    expect(recentInflation({ ...market, cpi: [] }, date)).toBeNull();
    expect(recentInflation(market, "2027-02-01")).toBeNull();
    expect(
      automaticOptions({ ...market, cpi: [] }, input, date).cash.real,
    ).toBeNull();
  });
  it("excludes stale offers and stale currency quotes", () => {
    expect(automaticOptions(market, input, "2026-10-15").deposits).toHaveLength(
      0,
    );
    expect(usableQuotes(market, "2026-10-15")).toHaveLength(0);
  });
  it("preserves currency of old saved plans through migration", () => {
    expect(decisionInputsSchema.parse({ capital: 1000 }).currency).toBe("UAH");
  });
  it("rejects changed or empty bank pages and incomplete FX feeds", () => {
    expect(() => parseMonoDeposits("<html>captcha</html>")).toThrow();
    expect(() => parsePumbDeposits("<html>maintenance</html>")).toThrow();
    expect(() => parseMonoFx([])).toThrow();
  });
});
