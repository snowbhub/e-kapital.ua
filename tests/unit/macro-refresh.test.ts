import { afterEach, describe, expect, it, vi } from "vitest";
import { getSnapshot } from "../../src/lib/data/market";
import {
  applyMacroRefresh,
  monthlyCheckpoints,
  refreshMacroData,
} from "../../src/lib/data/macro-refresh";
import { fetchOfficial } from "../../src/lib/data/providers";
vi.mock("../../src/lib/data/providers", async (original) => ({
  ...(await original<typeof import("../../src/lib/data/providers")>()),
  fetchOfficial: vi.fn(),
}));
afterEach(() => vi.mocked(fetchOfficial).mockReset());
const date = "2026-10-07T12:00:00.000Z";
describe("daily macro refresh", () => {
  it("keeps the last chronological point per month without mutating input", () => {
    const points = getSnapshot({ history: true }).history.usd;
    const reversed = [...points].reverse();
    const compact = monthlyCheckpoints(reversed);
    expect(compact.length).toBe(134);
    expect(compact.at(-1)).toEqual(points.at(-1));
    expect(reversed[0]).toEqual(points.at(-1));
  });
  it("retains CPI and FX plus the real prior success timestamp on failure", async () => {
    vi.mocked(fetchOfficial).mockRejectedValue(new Error("HTTP 503"));
    const previous = getSnapshot();
    const next = applyMacroRefresh(
      previous,
      await refreshMacroData("2026-10-07"),
    );
    expect(next.cpi).toEqual(previous.cpi);
    expect(next.history).toEqual(previous.history);
    for (const id of ["cpi", "history-usd", "history-eur"]) {
      expect(next.health.find((h) => h.id === id)?.lastSuccess).toBe(
        previous.health.find((h) => h.id === id)?.lastSuccess ?? null,
      );
      expect(next.health.find((h) => h.id === id)?.error).toBe("HTTP 503");
    }
    expect(fetchOfficial).toHaveBeenCalledTimes(3);
  });
  it("updates an independently successful series and does not erase other sources", () => {
    const previous = getSnapshot();
    const point = {
      ...previous.history.usd.at(-1)!,
      date: "2026-10-07",
      value: 50,
    };
    const next = applyMacroRefresh(previous, [
      {
        id: "usd",
        url: point.meta.sourceUrl,
        checkedAt: date,
        points: [...previous.history.usd, point],
        error: null,
      },
    ]);
    expect(next.history.usd.at(-1)?.value).toBe(50);
    expect(next.history.usd.length).toBeLessThanOrEqual(134);
    expect(next.history.eur).toEqual(previous.history.eur);
    expect(previous.history.usd.at(-1)?.value).not.toBe(50);
    expect(next.health.find((h) => h.id === "history-usd")?.lastSuccess).toBe(
      date,
    );
  });
  it("rejects a stale upstream series instead of rolling data back", () => {
    const previous = getSnapshot();
    const next = applyMacroRefresh(previous, [
      {
        id: "cpi",
        url: previous.cpi[0].meta.sourceUrl,
        checkedAt: date,
        points: previous.cpi.slice(0, -1),
        error: null,
      },
    ]);
    expect(next.cpi).toEqual(previous.cpi);
    expect(next.health.find((h) => h.id === "cpi")?.error).toContain("старішу");
  });
});
