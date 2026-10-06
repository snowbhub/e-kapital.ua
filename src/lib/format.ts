import type { Currency } from "./finance/calculations";
export const fmt = (value: number, currency: Currency = "UAH") =>
  new Intl.NumberFormat("uk-UA", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  })
    .formatToParts(value)
    // ICU/CLDR versions disagree on UAH's default symbol (₴ versus грн).
    // A stable currency label keeps server-rendered calculators hydratable.
    .map((part) =>
      part.type === "currency"
        ? currency === "UAH"
          ? "₴"
          : currency
        : part.value,
    )
    .join("");
export const num = (value: number, digits = 2) =>
  new Intl.NumberFormat("uk-UA", { maximumFractionDigits: digits }).format(
    value,
  );
export const pct = (value: number) => `${num(value, 1)}%`;
export const dateFmt = (date: string) =>
  new Date(date).toLocaleDateString("uk-UA", { timeZone: "UTC" });
export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
