import { afterEach, describe, expect, it, vi } from "vitest";
import { getSnapshot } from "../../src/lib/data/market";
import {
  applyFundRefresh,
  dividendNewsLinks,
  parseDividendNews,
  refreshFundPublicData,
  type FundRefreshResult,
} from "../../src/lib/data/fund-refresh";
import { fetchOfficial } from "../../src/lib/data/providers";
import { decisionReferences } from "../../src/lib/finance/decision";
vi.mock("../../src/lib/data/providers", async (original) => ({
  ...(await original<typeof import("../../src/lib/data/providers")>()),
  fetchOfficial: vi.fn(),
}));
afterEach(() => vi.mocked(fetchOfficial).mockReset());
const url =
  "https://www.inzhur.reit/news/inzhur-viplativ-dividendi-za-serpen-2026-roku";
const html = `<main><h1>Inzhur виплатив дивіденди за серпень 2026 року</h1><p>10 вересня 2026</p><p>Виплата фонду Inzhur REIT.</p><p>Дивіденди на 1 сертифікат за серпень:</p><p>₴0,0930 | $0,00208 — до податків.</p><p>₴0,0800 | $0,0018 — після податків.</p><p>Дивіденди на 1 сертифікат за останні 12 місяців:</p><p>₴1,0315 | $0,0237 — до податків.</p></main>`;
const date = "2026-10-07";
describe("official fund updates", () => {
  it("reads gross monthly per-unit income, not net income or annual aggregate", () => {
    expect(parseDividendNews(html, url, date)).toMatchObject({
      date: "2026-08-01",
      amount: 0.093,
      dateBasis: "period",
      publishedAt: "2026-09-10",
      sourceUrl: url,
    });
  });
  it("rejects an unpublished future result and an article about another fund", () => {
    expect(() => parseDividendNews(html, url, "2026-09-09")).toThrow();
    expect(() =>
      parseDividendNews(
        html.replace("фонду Inzhur REIT", "фонду Inzhur Energy"),
        url,
        date,
      ),
    ).toThrow();
  });
  it("fails rather than grossing up an unverifiable net-only amount", () => {
    expect(() =>
      parseDividendNews(
        html.replace("₴0,0930 | $0,00208 — до податків.", ""),
        url,
        date,
      ),
    ).toThrow();
  });
  it("only discovers bounded official news links", () => {
    const list = `<main><a href="${url}">news</a><a href="https://other.example/news/inzhur-viplativ-dividendi-za-serpen-2026-roku">fake</a><a href="${url}">duplicate</a><a href="/offer/inzhur-reit">offer</a></main>`;
    expect(dividendNewsLinks(list)).toEqual([url]);
    expect(() =>
      parseDividendNews(
        html,
        url.replace("www.inzhur.reit", "other.example"),
        date,
      ),
    ).toThrow();
  });
  it("supplements a stale workbook while preserving NAV and all older periods", () => {
    const previous = getSnapshot(),
      d = parseDividendNews(html, url, date);
    const next = applyFundRefresh(previous, [
      {
        id: "inzhur-dividends",
        sourceUrl: url,
        checkedAt: "2026-10-07T12:00:00.000Z",
        fund: null,
        distribution: d,
        error: null,
      },
    ]);
    const f = next.funds.find((f) => f.id === "inzhur")!;
    expect(f.nav).toBe(previous.funds.find((f) => f.id === "inzhur")!.nav);
    expect(f.distributions.at(-1)).toMatchObject(d);
    expect(
      previous.funds.find((f) => f.id === "inzhur")!.distributions,
    ).not.toContainEqual(d);
    expect(decisionReferences(next, date).distribution?.amount).toBe(0.093);
    expect(
      decisionReferences(next, "2026-09-09").distribution?.amount,
    ).not.toBe(0.093);
  });
  it("retains published evidence and the last successful check on failure", async () => {
    vi.mocked(fetchOfficial).mockRejectedValue(new Error("Source unavailable"));
    const previous = getSnapshot();
    const next = applyFundRefresh(previous, await refreshFundPublicData(date));
    expect(next.funds).toEqual(previous.funds);
    expect(next.health.find((h) => h.id === "inzhur")?.lastSuccess).toBe(
      previous.health.find((h) => h.id === "inzhur")?.lastSuccess ?? null,
    );
    expect(next.health.find((h) => h.id === "inzhur-dividends")?.error).toBe(
      "Source unavailable",
    );
  });
  it("does not duplicate a period when the same news is rechecked", () => {
    const d = parseDividendNews(html, url, date);
    const results: FundRefreshResult[] = [
      {
        id: "inzhur-dividends",
        sourceUrl: url,
        checkedAt: "2026-10-07T12:00:00.000Z",
        fund: null,
        distribution: d,
        error: null,
      },
    ];
    const once = applyFundRefresh(getSnapshot(), results);
    const twice = applyFundRefresh(once, results);
    expect(
      twice.funds
        .find((f) => f.id === "inzhur")!
        .distributions.filter((p) => p.date === d.date),
    ).toHaveLength(1);
  });
});
