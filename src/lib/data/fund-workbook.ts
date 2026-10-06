import { unzipSync, strFromU8 } from "fflate";
import { XMLParser } from "fast-xml-parser";
import { historyPointSchema } from "./schema";
import { meta } from "./providers";

type Cell = { r: string; t?: string; v?: string | number; is?: { t?: string } };
type Row = { c?: Cell | Cell[] };
type Shared = { t?: string; r?: { t: string } | { t: string }[] };
const list = <T>(v: T | T[] | undefined): T[] =>
  v === undefined ? [] : Array.isArray(v) ? v : [v];
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  parseTagValue: false,
  removeNSPrefix: true,
  processEntities: false,
});
// Only read cached numeric values; formulas, macros and external links never execute.
export function workbookRows(bytes: Uint8Array) {
  if (bytes.length > 10000000) throw new Error("Завеликий звіт фонду");
  const archive = unzipSync(bytes, {
    filter: (f) =>
      f.originalSize < 15000000 &&
      (/^xl\/worksheets\/sheet\d+\.xml$/.test(f.name) ||
        f.name === "xl/sharedStrings.xml"),
  });
  const shared = archive["xl/sharedStrings.xml"]
    ? (parser.parse(strFromU8(archive["xl/sharedStrings.xml"])) as {
        sst: { si: Shared | Shared[] };
      })
    : null;
  const strings = list(shared?.sst.si).map(
    (s) =>
      s.t ??
      list(s.r)
        .map((r) => r.t)
        .join(""),
  );
  return Object.entries(archive)
    .filter(([name]) => /^xl\/worksheets\/sheet\d+\.xml$/.test(name))
    .map(([, bytes]) => {
      const sheet = parser.parse(strFromU8(bytes)) as {
        worksheet: { sheetData: { row?: Row | Row[] } };
      };
      return list(sheet.worksheet?.sheetData?.row).map((row) =>
        Object.fromEntries(
          list(row.c).map((c) => [
            c.r.replace(/\d/g, ""),
            c.t === "s"
              ? strings[Number(c.v)]
              : c.t === "inlineStr"
                ? (c.is?.t ?? "")
                : c.v === undefined
                  ? ""
                  : Number.isFinite(Number(c.v))
                    ? Number(c.v)
                    : String(c.v),
          ]),
        ),
      );
    });
}
const excelDate = (serial: number) =>
  new Date(Date.UTC(1899, 11, 30) + serial * 86400000)
    .toISOString()
    .slice(0, 10);
export function parseFundNav(bytes: Uint8Array, url: string) {
  const rows = workbookRows(bytes).flat();
  if (
    !rows.some(
      (r) =>
        r.A === "Дата" &&
        /^(Вартість ВЧА 1 ЦП, грн|Вартість 1 ЦП, грн)$/.test(String(r.B)),
    )
  )
    throw new Error("Змінилися заголовки історії ВЧА");
  const points = rows
    .filter(
      (r) =>
        typeof r.A === "number" &&
        r.A > 40000 &&
        r.A < 80000 &&
        typeof r.B === "number",
    )
    .map((r) => {
      const date = excelDate(r.A as number);
      return historyPointSchema.parse({
        date,
        value: r.B,
        meta: meta(
          "Inzhur — історична вартість сертифіката",
          url,
          date,
          "historical",
          "historical",
        ),
      });
    });
  const byDate = new Map(points.map((p) => [p.date, p]));
  if (points.length < 2 || byDate.size !== points.length)
    throw new Error("Недостатня або дубльована історія ВЧА");
  return points.sort((a, b) => a.date.localeCompare(b.date));
}
const months = [
  "січень",
  "лютий",
  "березень",
  "квітень",
  "травень",
  "червень",
  "липень",
  "серпень",
  "вересень",
  "жовтень",
  "листопад",
  "грудень",
];
export function parseFundDistributions(bytes: Uint8Array) {
  const result: { date: string; amount: number; dateBasis: "period" }[] = [];
  for (const rows of workbookRows(bytes)) {
    let year = 0,
      columns: Record<string, number> = {};
    for (const row of rows) {
      const candidate = Object.values(row).find(
        (v) =>
          typeof v === "number" &&
          Number.isInteger(v) &&
          v >= 2000 &&
          v <= 2100,
      );
      if (candidate) {
        year = Number(candidate);
        columns = {};
      }
      for (const [column, value] of Object.entries(row)) {
        const m = months.indexOf(String(value).toLowerCase().trim());
        if (m >= 0) columns[column] = m + 1;
      }
      if (
        Object.values(row).some((v) =>
          /Прибуток на 1\s*ЦП,\s*грн/i.test(String(v)),
        )
      ) {
        if (!year || !Object.keys(columns).length)
          throw new Error("Не визначено місяці дивідендного звіту");
        for (const [column, month] of Object.entries(columns)) {
          const value = row[column];
          if (typeof value === "number" && value >= 0)
            result.push({
              date: `${year}-${String(month).padStart(2, "0")}-01`,
              amount: value,
              dateBasis: "period",
            });
        }
      }
    }
  }
  if (
    !result.length ||
    new Set(result.map((r) => r.date)).size !== result.length
  )
    throw new Error("Змінився формат дивідендного звіту");
  return result.sort((a, b) => a.date.localeCompare(b.date));
}
