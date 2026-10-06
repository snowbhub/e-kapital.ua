import type { Currency } from "./finance/calculations";
export const fmt = (value: number, currency: Currency = "UAH") =>
  new Intl.NumberFormat("uk-UA", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
export const num = (value: number, digits = 2) =>
  new Intl.NumberFormat("uk-UA", { maximumFractionDigits: digits }).format(
    value,
  );
export const pct = (value: number) => `${num(value, 1)}%`;
export const dateFmt = (date: string) =>
  new Date(date).toLocaleDateString("uk-UA");
export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
