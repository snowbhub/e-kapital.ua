// No invented market margins: these models need a concrete object's/venture's figures.
export const fop2026 = {
  year: 2026,
  minimumEsv: 1902.34,
  militaryFixed: 864.7,
  group2Max: 1729.4,
  group2Limit: 7211598,
  group3Limit: 10091049,
  source: "https://sumy.tax.gov.ua/media-ark/news-ark/print-975635.html",
  esvSource: "https://ck.tax.gov.ua/media-ark/news-ark/978697.html",
};
export function businessModel(input: {
  investment: number;
  revenue: number;
  expenses: number;
  group: "2" | "3";
  months: number;
  esvExempt: boolean;
  salesDrop: number;
}) {
  const revenue = input.revenue * (1 - input.salesDrop / 100);
  const fixed =
    (input.group === "2" ? fop2026.group2Max + fop2026.militaryFixed : 0) +
    (input.esvExempt ? 0 : fop2026.minimumEsv);
  const revenueTax = input.group === "3" ? 0.06 : 0;
  const taxes = fixed + revenue * revenueTax;
  const net = revenue - input.expenses - taxes;
  return {
    revenue,
    taxes,
    net,
    margin: revenue ? (net / revenue) * 100 : null,
    breakEven: (input.expenses + fixed) / (1 - revenueTax),
    payback: input.investment > 0 && net > 0 ? input.investment / net : null,
    totalCash: net * input.months - input.investment,
    overLimit:
      revenue * 12 >
      (input.group === "2" ? fop2026.group2Limit : fop2026.group3Limit),
  };
}
export function rentalModel(input: {
  price: number;
  repair: number;
  entryFees: number;
  rent: number;
  emptyMonths: number;
  upkeep: number;
  months: number;
  saleChange: number;
  saleFees: number;
}) {
  const investment = input.price + input.repair + input.entryFees;
  const annualRent = input.rent * (12 - input.emptyMonths);
  const annualNet = annualRent * 0.77 - input.upkeep * 12;
  const income = (annualNet * input.months) / 12;
  const sale = Math.max(
    0,
    input.price *
      Math.pow(1 + input.saleChange / 100, input.months / 12) *
      (1 - input.saleFees / 100),
  );
  return {
    investment,
    monthlyNet: annualNet / 12,
    income,
    payback: investment > 0 && annualNet > 0 ? investment / annualNet : null,
    netYield: investment > 0 ? (annualNet / investment) * 100 : null,
    total: income + sale,
    gain: income + sale - investment,
  };
}
