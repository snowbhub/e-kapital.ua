import { it, expect, describe } from "vitest";
import { readFileSync } from "node:fs";
import {
  parseMilitary,
  parseFund,
  parseEoselia,
  parseCpi,
  parseNbu,
  parseNbuHistory,
  parseDepository,
} from "../../src/lib/data/providers";
import {
  marketSchema,
  parseStoredMarket,
  storeMarket,
} from "../../src/lib/data/schema";
const fixture = (name: string) =>
  readFileSync(`tests/fixtures/${name}`, "utf8");
describe("official provider parsers", () => {
  it("preserves currency from each separate military table", () => {
    const rows = parseMilitary(fixture("military.html"));
    expect(rows).toHaveLength(21);
    expect(rows.find((r) => r.isin === "UA4000239065")?.currency).toBe("EUR");
    expect(rows.find((r) => r.isin === "UA4000236541")?.currency).toBe("USD");
    expect(
      rows.every((r) => r.couponRate === null && r.payments.length === 0),
    ).toBe(true);
  });
  it("fails on changed military markup", () =>
    expect(() => parseMilitary("<html><p>new page</p></html>")).toThrow());
  it("reads current fund NAV and purchase price independently", () => {
    const r = parseFund(fixture("inzhur.html"), "inzhur");
    expect(r.nav).toBe(11.5775);
    expect(r.purchasePrice).toBe(11.6064);
    expect(r.meta.effectiveDateBasis).toBe("retrieved");
    expect(r.actualReturn).toContain("15,91");
  });
  it("rejects a missing fund field rather than recording zero", () =>
    expect(() => parseFund("<p>Inzhur REIT</p>", "inzhur")).toThrow());
  it("reads eOselya two-stage rates and age-specific downpayment", () => {
    const r = parseEoselia(
      fixture("eoselia.html"),
      fixture("eoselia-age.html"),
    );
    expect(r.subsidized).toEqual([3, 6]);
    expect(r.standard).toEqual([7, 10]);
    expect(r.youthMaxAge).toBe(25);
    expect(r.youthDownPayment).toBe(10);
    expect(r.maxYears).toBe(20);
  });
  it("fails if program terms are missing", () =>
    expect(() =>
      parseEoselia("<p>New terms</p>", fixture("eoselia-age.html")),
    ).toThrow());
  it("normalizes SDMX monthly periods and one national series", () => {
    const rows = parseCpi(fixture("cpi.xml"), "https://stat.gov.ua/");
    expect(rows[0]).toMatchObject({ date: "2010-01-01", value: 101.8 });
    expect(rows.at(-1)?.date).toBe("2026-08-01");
    expect(rows.length).toBe(200);
  });
  it("does not accept a different indicator as CPI", () =>
    expect(() =>
      parseCpi(
        fixture("cpi.xml").replace(
          'INDICATOR="INDEX_CONSUMPRICE"',
          'INDICATOR="CORE_INFL"',
        ),
        "https://stat.gov.ua/",
      ),
    ).toThrow());
  it("normalizes NBU units, not raw 100-unit quote", () => {
    const rows = parseNbu([
      {
        cc: "USD",
        rate: 4000,
        units: 100,
        rate_per_unit: 40,
        exchangedate: "01.10.2026",
      },
    ]);
    expect(rows[0].value).toBe(40);
    expect(rows[0].meta.effectiveDate).toBe("2026-10-01");
  });
  it("conflicting duplicate historical dates fail", () =>
    expect(() =>
      parseNbuHistory(
        [
          { cc: "USD", rate: 40, exchangedate: "01.10.2026" },
          { cc: "USD", rate: 41, exchangedate: "01.10.2026" },
        ],
        "https://bank.gov.ua/",
      ),
    ).toThrow());
  it("reads actual depository payment types without inventing a coupon", () => {
    const rows = parseDepository([
      {
        cpcode: "UA4000239065",
        nominal: 1000,
        auk_proc: 3,
        pgs_date: "2027-11-18",
        val_code: "978",
        cptype: "DCP",
        payments: [{ pay_date: "2027-11-18", pay_type: 2, pay_val: 1000 }],
      },
    ]);
    expect(rows[0].currency).toBe("EUR");
    expect(rows[0].payments[0].kind).toBe("principal");
  });
  it("production snapshot passes schema with source metadata", () =>
    expect(
      marketSchema.safeParse(
        parseStoredMarket(JSON.parse(readFileSync("data/market.json", "utf8"))),
      ).success,
    ).toBe(true));
});

import {
  parseFundNav,
  parseFundDistributions,
} from "../../src/lib/data/fund-workbook";
import { parseFundDocuments } from "../../src/lib/data/providers";
it("extracts published fund NAV rows from XLSX cached cells", () => {
  const points = parseFundNav(
    new Uint8Array(readFileSync("tests/fixtures/fund-nav.xlsx")),
    "https://www.inzhur.reit/",
  );
  expect(points[0]).toMatchObject({ date: "2025-09-09", value: 10 });
  expect(points.length).toBeGreaterThan(200);
  expect(points.every((p) => p.meta.dataType === "historical")).toBe(true);
});
it("reads monthly per-certificate distributions without inventing a payment date", () => {
  const rows = parseFundDistributions(
    new Uint8Array(readFileSync("tests/fixtures/fund-div.xlsx")),
  );
  expect(rows[0]).toEqual({
    date: "2025-09-01",
    amount: 0.0835,
    dateBasis: "period",
  });
  expect(rows).toHaveLength(10);
});
it("discovers original documents through the issuer public catalog", () => {
  const reports = parseFundDocuments(
    JSON.parse(fixture("fund-documents.json")),
  );
  expect(
    reports.find((r) => r.title.includes("Історія виплати дивідендів"))?.url,
  ).toMatch(/\.xlsx$/);
});
it("does not combine adjacent published return values", () => {
  const f = parseFund(fixture("inzhur.html"), "inzhur");
  expect(f.publishedExpectation).toBe("від 9,5% у USD");
  expect(f.actualReturn).toBe("15,91% у USD");
});
it("rejects a monthly CPI gap instead of calculating an annual result", () => {
  const xml = fixture("cpi.xml").replace(
    /<Obs[^>]*TIME_PERIOD="2010-M02"[^>]*\/>/,
    "",
  );
  expect(xml).not.toBe(fixture("cpi.xml"));
  expect(() => parseCpi(xml, "https://stat.gov.ua/")).toThrow();
});
it("reads Energy certificate price history with its own published header", () => {
  const rows = parseFundNav(
    new Uint8Array(readFileSync("tests/fixtures/energy-nav.xlsx")),
    "https://www.inzhur.reit/",
  );
  expect(rows[0]).toMatchObject({ date: "2024-11-14", value: 6034.19 });
  expect(rows.length).toBeGreaterThan(400);
});
it("accepts the distinct Energy NAV label without making its expectation a fact", () => {
  const f = parseFund(fixture("energy.html"), "energy");
  expect(f.nav).toBe(6655.3606);
  expect(f.purchasePrice).toBe(6671.999);
  expect(f.publishedExpectation).toBe("15% річних у USD");
  expect(f.actualReturn).toBeNull();
});

it("compact snapshot preserves historical dates, values and source", () => {
  const market = parseStoredMarket(
    JSON.parse(readFileSync("data/market.json", "utf8")),
  );
  const roundtrip = parseStoredMarket(storeMarket(market));
  expect(roundtrip.history.usd?.length).toBe(market.history.usd?.length);
  expect(roundtrip.history.inzhur[0]).toEqual(market.history.inzhur[0]);
});
