import { describe, expect, it } from "vitest";
import { getSnapshot } from "../../src/lib/data/market";
import { acceptMarketResponse } from "../../src/lib/data/client-market";
describe("market payload release compatibility", () => {
  const previous = getSnapshot();
  it("keeps verified bank data when an older cached response lacks the new fields", () => {
    const { deposits, fxQuotes, ...old } = previous;
    expect(deposits.length).toBeGreaterThan(0);
    expect(fxQuotes.length).toBe(2);
    const result = acceptMarketResponse(previous, {
      ...old,
      health: old.health.filter((h) => !h.id.startsWith("bank-")),
    });
    expect(result.deposits).toEqual(deposits);
    expect(result.fxQuotes).toEqual(fxQuotes);
    expect(result.health.filter((h) => h.id.startsWith("bank-"))).toEqual(
      previous.health.filter((h) => h.id.startsWith("bank-")),
    );
  });
  it("rejects malformed data without replacing the working snapshot", () => {
    expect(acceptMarketResponse(previous, { error: "Temporary failure" })).toBe(
      previous,
    );
    expect(
      acceptMarketResponse(previous, { ...previous, fxQuotes: "bad" }),
    ).toBe(previous);
  });
  it("accepts current responses, including intentionally empty offer arrays", () => {
    expect(
      acceptMarketResponse(previous, {
        ...previous,
        deposits: [],
        fxQuotes: [],
      }).deposits,
    ).toEqual([]);
  });
});
