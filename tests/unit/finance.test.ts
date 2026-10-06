import { describe, it, expect } from "vitest";
import {
  cashFlow,
  monthlyAmount,
  reserve,
  changeAllocation,
  growth,
  realReturn,
  inflationAdjusted,
  goalMonths,
  addMonths,
  requiredContribution,
  mortgage,
  mortgagePayment,
  deposit,
  metal,
  xirr,
  bondPurchase,
  annualCpi,
  requiredCashCapital,
  fxValue,
  cagr,
} from "../../src/lib/finance/calculations";
import {
  assetProjection,
  projectPortfolio,
  portfolioMetrics,
  historicalReplay,
} from "../../src/lib/finance/portfolio";
import { emptyScenario } from "../../src/lib/finance/assets";
import {
  initialState,
  rollover,
  stateSchema,
} from "../../src/lib/storage/schema";
import { encryptBackup, decryptBackup } from "../../src/lib/storage/db";
describe("cash flow and frequency", () => {
  it("separates essentials, other and debt without double counting", () =>
    expect(cashFlow(65000, 30000, 10000, 3000)).toEqual({
      income: 65000,
      essential: 30000,
      other: 10000,
      debt: 3000,
      expenses: 43000,
      free: 22000,
    }));
  it("preserves a deficit", () =>
    expect(cashFlow(1000, 1500, 200, 0).free).toBe(-700));
  it.each([
    ["monthly", 1200],
    ["weekly", 5200],
    ["annual", 100],
    ["once", 1200],
  ] as const)("annualizes %s", (f, value) =>
    expect(monthlyAmount(1200, f)).toBe(value),
  );
  it.each([NaN, Infinity, -1])("rejects invalid amount %s", (n) =>
    expect(() => cashFlow(n, 0, 0, 0)).toThrow(),
  );
});
describe("reserve and goals", () => {
  it("uses only the chosen months and contribution", () =>
    expect(reserve(20000, 6, 40000, 5000)).toMatchObject({
      target: 120000,
      gap: 80000,
      months: 16,
    }));
  it("does not create a target date for zero contribution", () =>
    expect(reserve(1000, 3, 0, 0).months).toBeNull());
  it("clamps an overfunded reserve", () =>
    expect(reserve(1000, 1, 2000, 0)).toMatchObject({
      gap: 0,
      progress: 100,
      months: 0,
    }));
  it("baseline goal has zero return", () =>
    expect(goalMonths(100000, 10000, 5000)).toBe(18));
  it("recognizes completed goal", () =>
    expect(goalMonths(100, 200, 0)).toBe(0));
  it("has no invented completion with no saving", () =>
    expect(goalMonths(100, 0, 0)).toBeNull());
  it("solves monthly compound contribution consistently", () => {
    const m = goalMonths(100000, 10000, 500, 0.08)!;
    expect(growth(10000, 500, 0.08, m)).toBeGreaterThanOrEqual(100000);
    expect(growth(10000, 500, 0.08, m - 1)).toBeLessThan(100000);
  });
  it("handles end of month and leap year", () =>
    expect(addMonths("2024-01-31", 1)).toBe("2024-02-29"));
  it("required contribution excludes return", () =>
    expect(requiredContribution(100000, 40000, 12)).toBe(5000));
});
describe("allocation invariants", () => {
  it("keeps locked allocation while redistributing", () => {
    const items = [
      { id: "usd", percent: 20, locked: true },
      { id: "gold", percent: 30, locked: false },
      { id: "cash", percent: 50, locked: false },
    ];
    const changed = changeAllocation(items, "gold", 50);
    expect(changed.map((i) => i.percent)).toEqual([20, 50, 30]);
  });
  it("does not change a locked target", () => {
    const a = [{ id: "x", percent: 100, locked: true }];
    expect(changeAllocation(a, "x", 20)).toBe(a);
  });
  it("never loses 100% across repeated changes", () => {
    let rows = initialState().portfolio.allocation;
    for (let i = 0; i < 500; i++) {
      rows = changeAllocation(rows, rows[i % rows.length].id, (i * 31) % 120);
      expect(rows.reduce((n, x) => n + x.percent, 0)).toBeCloseTo(100, 10);
      expect(rows.every((x) => x.percent >= -1e-10)).toBe(true);
    }
  });
  it("handles all residual unlocked rows initially zero", () => {
    const rows = changeAllocation(
      [
        { id: "a", percent: 100, locked: false },
        { id: "b", percent: 0, locked: false },
        { id: "c", percent: 0, locked: false },
      ],
      "a",
      80,
    );
    expect(rows.map((x) => x.percent)).toEqual([80, 10, 10]);
  });
});
describe("inflation, FX, contribution timing", () => {
  it("uses Fisher ratio, not subtraction", () =>
    expect(realReturn(0.1, 0.08)).toBeCloseTo(1.1 / 1.08 - 1));
  it("deflates using compound CPI", () =>
    expect(inflationAdjusted(12100, 0.1, 2)).toBeCloseTo(10000));
  it("preserves zero-rate baseline", () =>
    expect(growth(100, 10, 0, 12)).toBe(220));
  it("adds contributions at the end of each month", () =>
    expect(growth(0, 100, Math.pow(1.01, 12) - 1, 2)).toBeCloseTo(201));
  it("FX is units times rate", () => expect(fxValue(100, 40)).toBe(4000));
  it("annualizes historical change by actual horizon", () =>
    expect(cagr(100, 121, 2)).toBeCloseTo(0.1));
  it("rejects -100% inflation", () =>
    expect(() => inflationAdjusted(100, -1, 1)).toThrow());
});
describe("mortgage and eOselya rate stages", () => {
  it("zero interest returns principal divided by months", () =>
    expect(mortgagePayment(120000, 0, 120)).toBe(1000));
  it("recalculates payment on remaining principal after 10 years", () => {
    const r = mortgage(2400000, 240, [
      { fromMonth: 1, annualRate: 0.03 },
      { fromMonth: 121, annualRate: 0.06 },
    ]);
    expect(r.rows[120].payment).toBeCloseTo(
      mortgagePayment(r.rows[119].balance, 0.06, 120),
    );
    expect(r.laterPayment).toBeGreaterThan(r.firstPayment);
    expect(r.rows.at(-1)!.balance).toBeCloseTo(0, 6);
    expect(r.total).toBeCloseTo(2400000 + r.interest);
  });
  it("does not apply the second rate to a shorter loan", () => {
    const r = mortgage(1000, 60, [
      { fromMonth: 1, annualRate: 0.03 },
      { fromMonth: 121, annualRate: 0.06 },
    ]);
    expect(r.rows.every((row) => row.rate === 0.03)).toBe(true);
  });
  it("does not convert price growth to monthly cash income", () =>
    expect(requiredCashCapital(10000, 0, 0, 0)).toBeNull());
  it("subtracts tax and fee in cash-capital model", () =>
    expect(requiredCashCapital(1000, 0.1, 0.2, 0.01)).toBeCloseTo(
      12000 / 0.07,
    ));
});
describe("deposit, metal and different asset models", () => {
  it("tax applies only to interest, no capitalization", () =>
    expect(deposit(10000, 0.12, 12, 0.23, false, 100).value).toBeCloseTo(
      10824,
    ));
  it("capitalizes net interest monthly", () =>
    expect(deposit(10000, 0.12, 12, 0.23, true).value).toBeCloseTo(
      10000 * Math.pow(1 + (0.12 / 12) * 0.77, 12),
    ));
  it("metal loses buy and sell spreads even with no price change", () => {
    const r = metal(1100, 100, 0.1, 0.05, 0, 1);
    expect(r.grams).toBeCloseTo(10);
    expect(r.value).toBeCloseTo(950);
  });
  it("cash has no nominal yield", () =>
    expect(
      assetProjection("cash", 1000, 100, 12, {
        ...emptyScenario,
        deposit: 20,
        fundCash: 20,
      }).value,
    ).toBe(2200));
  it("USD has only FX movement, no coupon", () => {
    const r = assetProjection("usd", 1000, 0, 12, {
      ...emptyScenario,
      usd: 10,
    });
    expect(r.value).toBeCloseTo(1100);
    expect(r.cash).toBe(0);
  });
  it("fund separates NAV growth and paid distributions", () => {
    const r = assetProjection("inzhur", 1000, 0, 12, {
      ...emptyScenario,
      fundCash: 12,
      fundNav: 0,
    });
    expect(r.value).toBe(1000);
    expect(r.cash).toBeCloseTo(120);
  });
  it("energy does not inherit REIT distributions", () =>
    expect(
      assetProjection("energy", 1000, 0, 12, { ...emptyScenario, fundCash: 20 })
        .cash,
    ).toBe(0));
  it("reinvestment does not double-count cash", () => {
    const r = assetProjection("inzhur", 1000, 0, 12, {
      ...emptyScenario,
      fundCash: 12,
      reinvest: true,
    });
    expect(r.cash).toBe(0);
    expect(r.value).toBeCloseTo(1000 * Math.pow(1.01, 12));
  });
});
describe("bond cashflows and XIRR", () => {
  it("known one-year XIRR is ten percent", () =>
    expect(
      xirr([
        { date: "2025-01-01", amount: -1000 },
        { date: "2026-01-01", amount: 1100 },
      ]),
    ).toBeCloseTo(0.1, 8));
  it("returns null for only one sign or same date", () => {
    expect(xirr([{ date: "2025-01-01", amount: 100 }])).toBeNull();
    expect(
      xirr([
        { date: "2025-01-01", amount: -100 },
        { date: "2025-01-01", amount: 110 },
      ]),
    ).toBeNull();
  });
  it("count includes fixed and proportional fees", () => {
    const r = bondPurchase(
      {
        isin: "UA0000000001",
        currency: "UAH",
        nominal: 1000,
        maturity: "2026-01-01",
        couponRate: 10,
        payments: [{ date: "2026-01-01", amount: 1100, kind: "principal" }],
      },
      2500,
      990,
      "2025-01-01",
      10,
      0.01,
    );
    expect(r.count).toBe(2);
    expect(r.invested).toBeCloseTo(2009.8);
    expect(r.remaining).toBeCloseTo(490.2);
    expect(r.total).toBe(2200);
    expect(r.yield).not.toBeCloseTo(0.1, 3);
  });
  it("excludes coupons already paid on purchase day", () => {
    const r = bondPurchase(
      {
        isin: "UA0000000001",
        currency: "UAH",
        nominal: 1000,
        maturity: "2026-01-01",
        couponRate: 10,
        payments: [
          { date: "2025-01-01", amount: 100, kind: "coupon" },
          { date: "2026-01-01", amount: 1000, kind: "principal" },
        ],
      },
      1000,
      1000,
      "2025-01-01",
    );
    expect(r.flows).toHaveLength(1);
  });
});
describe("historical data and aggregate", () => {
  it("only creates yearly inflation for all 12 months", () => {
    const rows = Array.from({ length: 12 }, (_, i) => ({
      date: `2025-${String(i + 1).padStart(2, "0")}-01`,
      value: 101,
    }));
    expect(annualCpi(rows)[0].value).toBeCloseTo(
      (Math.pow(1.01, 12) - 1) * 100,
    );
    expect(annualCpi(rows.slice(0, 11))).toEqual([]);
    expect(annualCpi([...rows.slice(0, 11), rows[0]])).toEqual([]);
  });
  it("refuses to synthesize missing fund history", () =>
    expect(
      historicalReplay(
        100,
        [{ id: "inzhur", percent: 100 }],
        {},
        "2025-01-01",
        "2026-01-01",
      ).missing,
    ).toEqual(["inzhur"]));
  it("keeps cash and actual FX series aligned", () => {
    const r = historicalReplay(
      100,
      [
        { id: "cash", percent: 50 },
        { id: "usd", percent: 50 },
      ],
      {
        usd: [
          { date: "2025-01-01", value: 40 },
          { date: "2026-01-01", value: 44 },
        ],
      },
      "2025-01-01",
      "2026-01-01",
    );
    expect(r.points.at(-1)!.value).toBeCloseTo(105);
  });
  it("portfolio aggregate matches contributions at zero assumptions", () => {
    const r = projectPortfolio(
      1000,
      100,
      initialState().portfolio.allocation,
      1,
      emptyScenario,
    ).at(-1)!;
    expect(r.nominal).toBe(2200);
    expect(r.real).toBe(2200);
    expect(r.contributed).toBe(2200);
  });
  it("exposure is an intersecting descriptive metric", () =>
    expect(
      portfolioMetrics([
        { id: "usd", percent: 20 },
        { id: "ovdp", percent: 30 },
        { id: "cash", percent: 50 },
      ]),
    ).toMatchObject({
      uah: 80,
      usd: 20,
      fixed: 30,
      cash: 50,
      liquid: 70,
      concentration: 50,
    }));
});
describe("local state and encrypted backup", () => {
  it("validates a blank real profile", () =>
    expect(stateSchema.safeParse(initialState()).success).toBe(true));
  it("new month starts empty and preserves previous plan", () => {
    const s = initialState();
    s.currentPeriod = "2026-09";
    s.periods = [
      {
        ...s.periods[0],
        id: "2026-09",
        actual: {
          income: 65000,
          expenses: 40000,
          reserve: 0,
          goals: 0,
          invest: 7500,
        },
        checkedIn: true,
      },
    ];
    const next = rollover(s, new Date("2026-10-06T12:00:00Z"));
    expect(next.periods).toHaveLength(2);
    expect(next.periods[1].incomes).toEqual([]);
    expect(next.periods[0].actual.invest).toBe(7500);
    expect(rollover(next, new Date("2026-10-07")).periods).toHaveLength(2);
  });
  it("rejects corrupt financial allocations and unsupported assets", () => {
    const s = initialState();
    s.portfolio.allocation[0].percent = 50;
    expect(stateSchema.safeParse(s).success).toBe(false);
  });
  it("encrypts, decrypts and rejects a wrong password", async () => {
    const s = initialState();
    s.reserve.current = 12345;
    const raw = await encryptBackup(s, "my-long-password");
    expect(raw).not.toContain("12345");
    expect(await decryptBackup(raw, "my-long-password")).toEqual(s);
    await expect(decryptBackup(raw, "another-password")).rejects.toThrow();
  });
});
