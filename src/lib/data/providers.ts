import { z } from "zod";
import * as cheerio from "cheerio";
import { XMLParser } from "fast-xml-parser";
import {
  bondSchema,
  fundSchema,
  eoseliaSchema,
  historyPointSchema,
  rateSchema,
  type Meta,
  type MarketBond,
} from "./schema";
export const sources = {
  nbu: "https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?json",
  nbuHistory: "https://bank.gov.ua/NBU_Exchange/exchange_site",
  bonds: "https://bank.gov.ua/depo_securities?json",
  military: "https://bonds.gov.ua/",
  inzhur: "https://www.inzhur.reit/offer/inzhur-reit",
  energy: "https://www.inzhur.reit/offer/inzhur-energy",
  eoselia: "https://eoselia.diia.gov.ua/",
  eoseliaAge:
    "https://ukrfinzhytlo.in.ua/ieoselia-dlia-molodi-vydano-pershyy-kredyt/",
  sdmx: "https://stat.gov.ua/sdmx/workspaces/default:integration/registry/sdmx/2.1",
};
export const isoDate = (v: string) => {
  const s = v.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(s)) return s.split(".").reverse().join("-");
  throw new Error("Невідомий формат дати");
};
export const meta = (
  source: string,
  sourceUrl: string,
  effectiveDate: string,
  type: Meta["dataType"] = "fact",
  freshness: Meta["freshness"] = "daily",
  basis: Meta["effectiveDateBasis"] = "published",
): Meta => ({
  source,
  sourceUrl,
  retrievedAt: new Date().toISOString(),
  effectiveDate,
  dataType: type,
  freshness,
  effectiveDateBasis: basis,
});
export async function fetchOfficial(
  url: string,
  accept = "*/*",
  timeoutMs = 20000,
) {
  const allowed = [
    "bank.gov.ua",
    "bonds.gov.ua",
    "www.inzhur.reit",
    "stat.gov.ua",
    "ukrfinzhytlo.in.ua",
    "eoselia.diia.gov.ua",
    "api.inzhur.reit",
  ];
  const parsed = new URL(url);
  if (!allowed.includes(parsed.hostname) || parsed.protocol !== "https:")
    throw new Error("Дозволені лише офіційні джерела");
  const response = await fetch(url, {
    headers: {
      Accept: accept,
      "User-Agent":
        "e-kapital/0.1 public-data (+https://github.com/snowbhub/e-kapital)",
    },
    signal: AbortSignal.timeout(timeoutMs),
    redirect: "error",
  });
  if (!response.ok)
    throw new Error(`Джерело відповіло HTTP ${response.status}`);
  const body = await response.text();
  if (body.length > 30000000) throw new Error("Відповідь завелика");
  return body;
}
const nbuRow = z.object({
  cc: z.string(),
  rate: z.number().positive(),
  exchangedate: z.string(),
  units: z.number().positive().optional(),
  rate_per_unit: z.number().positive().optional(),
});
export function parseNbu(raw: unknown) {
  const rows = z.array(nbuRow).min(1).parse(raw);
  return rows
    .filter((r) => ["USD", "EUR", "XAU", "XAG"].includes(r.cc))
    .map((r) =>
      rateSchema.parse({
        code: r.cc,
        value: r.rate_per_unit ?? r.rate / (r.units ?? 1),
        unit: r.cc.startsWith("XA") ? "troy-ounce" : "currency",
        meta: meta(
          "Національний банк України",
          sources.nbu,
          isoDate(r.exchangedate),
        ),
      }),
    );
}
export function parseNbuHistory(raw: unknown, url: string) {
  const rows = z.array(nbuRow).min(2).parse(raw);
  const seen = new Map<string, number>();
  for (const r of rows) {
    const date = isoDate(r.exchangedate);
    const value = r.rate_per_unit ?? r.rate / (r.units ?? 1);
    if (seen.has(date) && seen.get(date) !== value)
      throw new Error("Конфлікт дубльованих дат");
    seen.set(date, value);
  }
  return [...seen]
    .map(([date, value]) =>
      historyPointSchema.parse({
        date,
        value,
        meta: meta("НБУ", url, date, "historical", "historical"),
      }),
    )
    .sort((a, b) => a.date.localeCompare(b.date));
}
export function parseMilitary(html: string) {
  const $ = cheerio.load(html);
  const bonds: MarketBond[] = [];
  let currency: "UAH" | "USD" | "EUR" = "UAH";
  $("tr").each((_, row) => {
    const heading = $(row).closest("table").prev().text();
    if (/Долар|USD/i.test(heading)) currency = "USD";
    else if (/Євро|EUR/i.test(heading)) currency = "EUR";
    else if (/Гривня/i.test(heading)) currency = "UAH";
    const cells = $(row)
      .find("td")
      .map((_, c) => $(c).text().trim().replace(/\s+/g, " "))
      .get();
    const whole = cells.join(" ");
    if (/Долар|USD/i.test(whole) && !/UA\d{10}/.test(whole)) currency = "USD";
    if (/Євро|EUR/i.test(whole) && !/UA\d{10}/.test(whole)) currency = "EUR";
    if (/Гривня/i.test(whole) && !/UA\d{10}/.test(whole)) currency = "UAH";
    const isin = whole.match(/UA\d{10}/)?.[0];
    if (!isin) return;
    const dates = whole.match(/\d{2}\.\d{2}\.\d{4}/g) || [];
    const rate = whole.match(/(\d+[.,]\d+)\s*%/);
    if (dates.length < 2 || !rate)
      throw new Error("Змінилася таблиця військових ОВДП");
    bonds.push(
      bondSchema.parse({
        isin,
        currency,
        nominal: 1000,
        maturity: isoDate(dates[0]!),
        lastPlacement: isoDate(dates[1]!),
        couponRate: null,
        publishedRate: Number(rate[1].replace(",", ".")),
        kind: /дисконт/i.test(whole) ? "discount" : "coupon",
        military: true,
        payments: [],
        meta: meta(
          "Міністерство фінансів — військові облігації",
          sources.military,
          isoDate(dates[1]!),
          "terms",
        ),
      }),
    );
  });
  if (bonds.length < 3) throw new Error("Таблицю ОВДП не знайдено");
  return bonds;
}
const depoRow = z.object({
  cpcode: z.string(),
  nominal: z.coerce.number().positive(),
  auk_proc: z.coerce.number().min(0).max(100),
  pgs_date: z.string(),
  val_code: z.union([z.string(), z.number()]),
  cptype: z.string(),
  payments: z.array(
    z.object({
      pay_date: z.string(),
      pay_type: z.coerce.number(),
      pay_val: z.coerce.number().positive(),
    }),
  ),
});
export function parseDepository(raw: unknown) {
  return z
    .array(depoRow)
    .min(1)
    .parse(raw)
    .filter((r) => r.cptype === "DCP")
    .map((r) => {
      const currency = (
        {
          "980": "UAH",
          "840": "USD",
          "978": "EUR",
          UAH: "UAH",
          USD: "USD",
          EUR: "EUR",
        } as Record<string, string>
      )[String(r.val_code)];
      return bondSchema.parse({
        isin: r.cpcode,
        currency,
        nominal: r.nominal,
        maturity: isoDate(r.pgs_date),
        couponRate: r.auk_proc,
        publishedRate: null,
        lastPlacement: null,
        kind: r.auk_proc ? "coupon" : "discount",
        military: false,
        payments: r.payments
          .filter((p) => [1, 2, 3].includes(p.pay_type))
          .map((p) => ({
            date: isoDate(p.pay_date),
            amount: p.pay_val,
            kind: p.pay_type === 1 ? "coupon" : "principal",
          })),
        meta: meta(
          "Депозитарій НБУ",
          sources.bonds,
          new Date().toISOString().slice(0, 10),
          "terms",
          "daily",
          "retrieved",
        ),
      });
    });
}
const numeric = (s: string) =>
  Number(s.replace(/[\s\u00a0]/g, "").replace(",", "."));
// Decode JSON data embedded by Astro; never execute issuer scripts.
function astroValue(input: unknown): unknown {
  if (!Array.isArray(input) || input.length !== 2)
    throw new Error("Змінився формат Astro даних");
  const [tag, value] = input;
  if (tag === 1 && Array.isArray(value)) return value.map(astroValue);
  if (tag === 0) {
    if (value && typeof value === "object")
      return Object.fromEntries(
        Object.entries(value).map(([k, v]) => [k, astroValue(v)]),
      );
    return value;
  }
  throw new Error("Непідтримуваний тип Astro даних");
}
const resultItem = z.object({
  title: z.string(),
  value: z.string().nullable(),
});
const fundSections = z.object({
  sections: z.array(
    z.object({
      __component: z.string(),
      list: z.array(resultItem).optional(),
      questions: z
        .object({
          data: z.array(
            z.object({ attributes: z.object({ text: z.string() }) }),
          ),
        })
        .optional(),
    }),
  ),
});
export function parseFund(html: string, id: "inzhur" | "energy") {
  const $ = cheerio.load(html),
    raw = $('astro-island[component-url*="DynamicZone"]').attr("props");
  if (!raw) throw new Error("Не знайдено структуровані показники фонду");
  const decoded = Object.fromEntries(
    Object.entries(JSON.parse(raw) as Record<string, unknown>).map(([k, v]) => [
      k,
      astroValue(v),
    ]),
  );
  const sections = fundSections.parse(decoded).sections;
  const items = sections
    .filter((s) => s.__component === "sections.results")
    .flatMap((s) => s.list ?? []);
  const value = (label: RegExp) =>
    items.find((i) => label.test(i.title))?.value ?? null;
  const nav = value(/^ВЧА на (?:1 )?сертифікат$/),
    price = value(/^Ціна купівлі 1 сертифіката$/);
  if (!nav || !price) throw new Error("Змінився формат ВЧА або ціни фонду");
  const feeNotes = sections
    .flatMap((s) => s.questions?.data ?? [])
    .map((q) =>
      cheerio.load(q.attributes.text).text().replace(/\s+/g, " ").trim(),
    )
    .filter((t) => /комісі|винагород|знижк/i.test(t));
  return fundSchema.parse({
    id,
    name: id === "inzhur" ? "Inzhur REIT" : "Inzhur Energy",
    nav: numeric(nav),
    purchasePrice: numeric(price),
    publishedExpectation: value(/^Прогнозована дохідність/),
    actualReturn: value(/^Фактична дохідність/),
    feeNotes: feeNotes.slice(0, 6),
    reports: [],
    distributions: [],
    meta: meta(
      "Inzhur — опубліковані показники фонду",
      sources[id],
      new Date().toISOString().slice(0, 10),
      "fact",
      "daily",
      "retrieved",
    ),
  });
}
export function fundDocumentsUrl(id: "inzhur" | "energy") {
  const category = id === "inzhur" ? 19 : 18;
  return `https://api.inzhur.reit/cms/api/general-document-categories?filters[id]=${category}&populate[documents][populate][documents][fields][0]=date&populate[documents][populate][documents][populate][file][populate]=*&populate[documents][populate][documents][sort][0]=date:DESC`;
}
export function parseFundDocuments(input: unknown) {
  const schema = z
    .object({
      data: z.array(
        z.object({
          attributes: z.object({
            documents: z.object({
              data: z.array(
                z.object({
                  attributes: z.object({
                    name: z.string(),
                    documents: z.array(
                      z.object({
                        date: z.string(),
                        file: z.object({
                          data: z.object({
                            attributes: z.object({ url: z.url() }),
                          }),
                        }),
                      }),
                    ),
                  }),
                }),
              ),
            }),
          }),
        }),
      ),
    })
    .parse(input);
  return schema.data
    .flatMap((c) =>
      c.attributes.documents.data.flatMap((d) =>
        d.attributes.documents.map((f) => ({
          title: `${d.attributes.name} · ${f.date}`,
          url: f.file.data.attributes.url,
        })),
      ),
    )
    .filter((r) =>
      ["d2zk2gr3fhkmim.cloudfront.net", "www.inzhur.reit"].includes(
        new URL(r.url).hostname,
      ),
    );
}
export function parseEoselia(html: string, ageHtml: string) {
  const clean = (s: string) => {
    const $ = cheerio.load(s);
    $("script,style").remove();
    return $("body").text().replace(/\s+/g, " ");
  };
  const t = clean(html),
    a = clean(ageHtml);
  const first = t.match(
      /ставка на перші\s*(\d+)\s*років\s*[—–-]\s*(\d+)%\s*або\s*(\d+)%/i,
    ),
    later = t.match(/ставка з\s*\d+-го року\s*[—–-]\s*(\d+)%\s*або\s*(\d+)%/i),
    term = t.match(/Максимальний строк кредиту\s*[—–-]\s*(\d+)\s*років/i),
    down = t.match(
      /Мінімальний початковий внесок\s*[—–-]\s*від\s*(\d+)%\s*та\s*(\d+)%/i,
    ),
    young = a.match(
      /до\s*(\d+)\s*років включно[\s\S]{0,600}?першим внеском у\s*(\d+)\s*%/i,
    ),
    max = t.match(/Не старші\s*(\d+)\s*років на дату погашення/i),
    min = t.match(/Старші за\s*(\d+)\s*років/i);
  if (
    !first ||
    !later ||
    !term ||
    !down ||
    !young ||
    !max ||
    !min ||
    Number(young[2]) !== Number(down[2])
  )
    throw new Error("Умови єОселі змінилися — перевірте parser");
  const banks =
    t
      .match(/Кредитують банки-учасники програми:\s*(.+?)\s*Участь/i)?.[1]
      .split(",")
      .map((x) => x.trim()) ?? [];
  if (banks.length < 3) throw new Error("Не знайдено банки єОселі");
  return eoseliaSchema.parse({
    subsidized: [Number(first[2]), Number(later[1])],
    standard: [Number(first[3]), Number(later[2])],
    changeAfterMonths: Number(first[1]) * 12,
    maxYears: Number(term[1]),
    minAge: Number(min[1]),
    maxAge: Number(max[1]),
    downPayment: Number(down[1]),
    youthDownPayment: Number(young[2]),
    youthMaxAge: Number(young[1]),
    categories: [
      {
        id: "military",
        name: "Військовослужбовці та визначені силові служби",
        subsidized: true,
      },
      {
        id: "medical",
        name: "Медичні працівники державних / комунальних закладів",
        subsidized: true,
      },
      {
        id: "teacher",
        name: "Педагогічні працівники державних / комунальних закладів",
        subsidized: true,
      },
      {
        id: "science",
        name: "Науковці державних / комунальних установ",
        subsidized: true,
      },
      {
        id: "veteran",
        name: "Ветерани та визначені члени сімей",
        subsidized: true,
      },
      { id: "idp", name: "Внутрішньо переміщені особи", subsidized: false },
      {
        id: "other",
        name: "Інші громадяни України за умовами програми",
        subsidized: false,
      },
    ],
    banks,
    meta: meta(
      "Дія / Укрфінжитло",
      sources.eoselia,
      new Date().toISOString().slice(0, 10),
      "terms",
      "daily",
      "retrieved",
    ),
  });
}
const xml = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  removeNSPrefix: true,
});
export function parseCpi(xmlRaw: string, sourceUrl: string) {
  const data = xml.parse(xmlRaw);
  const raw =
    data?.GenericData?.DataSet?.Series ??
    data?.StructureSpecificData?.DataSet?.Series;
  if (!raw) throw new Error("Немає CPI серії");
  const series = Array.isArray(raw) ? raw : [raw];
  if (series.length !== 1)
    throw new Error("CPI запит повинен повертати одну перевірену серію");
  const key = series[0];
  if (
    key.INDICATOR &&
    (key.INDICATOR !== "INDEX_CONSUMPRICE" ||
      key.BASE_PERIOD !== "PREV_MONTH" ||
      key.REGION !== "UA00000000000000000" ||
      String(key.GOODS_SERVICES_TYPE) !== "0" ||
      key.FREQ !== "M")
  )
    throw new Error("Неправильний CPI ряд");
  const obs = series[0].Obs;
  const rows = (Array.isArray(obs) ? obs : [obs])
    .map((o: Record<string, unknown>) => {
      const dim = o.ObsDimension as { value: string } | undefined;
      const val = o.ObsValue as { value: string } | undefined;
      const period = String(dim?.value ?? o.TIME_PERIOD).replace("-M", "-");
      const date = period.length === 7 ? period + "-01" : period,
        value = Number(val?.value ?? o.OBS_VALUE);
      return historyPointSchema.parse({
        date,
        value,
        meta: meta(
          "Державна служба статистики України",
          sourceUrl,
          date,
          "historical",
          "monthly",
        ),
      });
    })
    .sort((a, b) => a.date.localeCompare(b.date));
  if (rows.length < 12) throw new Error("Недостатня CPI історія");
  if (new Set(rows.map((r) => r.date)).size !== rows.length)
    throw new Error("Дубльовані CPI місяці");
  for (let i = 1; i < rows.length; i++) {
    const previous = new Date(rows[i - 1].date + "T00:00:00Z");
    previous.setUTCMonth(previous.getUTCMonth() + 1);
    if (previous.toISOString().slice(0, 10) !== rows[i].date)
      throw new Error("Пропущений CPI місяць");
  }
  return rows;
}
