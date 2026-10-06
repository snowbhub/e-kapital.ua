import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { emptyMarket } from "../../src/lib/data/schema";
import { fetchOfficial, parseNbu, sources } from "../../src/lib/data/providers";
import {
  applyNbuRefresh,
  fetchNbuRates,
  refreshNbuRates,
} from "../../src/lib/data/nbu-refresh";
import { syncMarket } from "../../src/lib/data/sync";
vi.mock("../../src/lib/data/bank-providers", () => ({
  refreshBanks: vi.fn(async (market) => market),
}));

vi.mock("../../src/lib/data/providers", async (original) => ({
  ...(await original<typeof import("../../src/lib/data/providers")>()),
  fetchOfficial: vi.fn(),
}));

const rows = ["USD", "EUR", "XAU", "XAG"].map((cc, i) => ({
  cc,
  rate: 40 + i,
  exchangedate: "06.10.2026",
}));
const checkedAt = "2026-10-06T08:00:00.000Z";
const previousAt = "2026-10-05T08:00:00.000Z";
function previousMarket() {
  return {
    ...structuredClone(emptyMarket),
    rates: parseNbu(rows.map((row) => ({ ...row, rate: row.rate - 1 }))),
    health: [
      {
        id: "nbu",
        name: "НБУ",
        sourceUrl: sources.nbu,
        frequency: "Щоденно",
        lastSuccess: previousAt,
        lastAttempt: previousAt,
        error: null,
        records: 4,
      },
    ],
  };
}

describe("NBU refresh and last-known-good data", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(checkedAt);
    vi.mocked(fetchOfficial).mockReset();
    vi.mocked(fetchOfficial).mockResolvedValue(JSON.stringify(rows));
  });
  afterEach(() => vi.useRealTimers());

  it("keeps the real fetch timestamp when the cached result is reused", async () => {
    const result = await refreshNbuRates();
    vi.setSystemTime("2026-10-06T19:00:00.000Z");
    const market = applyNbuRefresh(previousMarket(), result);
    expect(market.health[0]).toMatchObject({
      lastSuccess: checkedAt,
      lastAttempt: checkedAt,
      error: null,
    });
    expect(market.rates[0].meta.retrievedAt).toBe(checkedAt);
    expect(fetchOfficial).toHaveBeenCalledTimes(1);
  });

  it("reports runtime failures while preserving verified rates and success time", async () => {
    vi.mocked(fetchOfficial).mockRejectedValue(new Error("HTTP 403"));
    const previous = previousMarket();
    const market = applyNbuRefresh(
      structuredClone(previous),
      await refreshNbuRates(),
    );
    expect(market.rates).toEqual(previous.rates);
    expect(market.health[0]).toMatchObject({
      lastSuccess: previousAt,
      lastAttempt: checkedAt,
      error: "HTTP 403",
      records: 4,
    });
  });

  it("rejects partial and duplicate currency sets", async () => {
    vi.mocked(fetchOfficial).mockResolvedValue(
      JSON.stringify(rows.slice(0, 3)),
    );
    await expect(fetchNbuRates()).rejects.toThrow("Неповний набір");
    vi.mocked(fetchOfficial).mockResolvedValue(
      JSON.stringify([rows[0], rows[1], rows[2], rows[2]]),
    );
    await expect(fetchNbuRates()).rejects.toThrow("Неповний набір");
  });

  it("scheduled ingestion never replaces a valid snapshot with a partial response", async () => {
    const previous = previousMarket();
    vi.mocked(fetchOfficial).mockImplementation(async (url) => {
      if (url === sources.nbu) return JSON.stringify(rows.slice(0, 2));
      throw new Error("Unavailable test source");
    });
    const market = await syncMarket(previous, { history: false });
    expect(market.rates).toEqual(previous.rates);
    expect(market.health.find((source) => source.id === "nbu")).toMatchObject({
      lastSuccess: previousAt,
      lastAttempt: checkedAt,
      error: "Неповний набір USD/EUR/XAU/XAG",
      records: 4,
    });
    expect(previous.health[0].error).toBeNull();
  });
});
