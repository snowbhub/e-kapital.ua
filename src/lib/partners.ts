export type Provider = {
  id: string;
  name: string;
  category: "bonds" | "funds" | "mortgage";
  officialUrl: string;
  affiliateUrl: string | null;
  minInvestment: number | null;
  fees: string | null;
  online: boolean;
  currencies: string[];
  verification: string;
  lastChecked: string;
  source: string;
};
export const partners: Provider[] = [
  {
    id: "diia",
    name: "Військові облігації в Дії",
    category: "bonds",
    officialUrl: "https://diia.gov.ua/services/viyskovi-obligaciyi",
    affiliateUrl: null,
    minInvestment: null,
    fees: "Перевірте ціну та умови обраного партнера в Дії",
    online: true,
    currencies: ["UAH"],
    verification: "Офіційна державна послуга",
    lastChecked: "2026-10-06",
    source: "https://bonds.gov.ua/",
  },
  {
    id: "inzhur",
    name: "Inzhur",
    category: "funds",
    officialUrl: "https://www.inzhur.reit/",
    affiliateUrl: null,
    minInvestment: null,
    fees: "Перевірте актуальний регламент і ціну викупу",
    online: true,
    currencies: ["UAH"],
    verification:
      "Офіційний сайт емітента; перед купівлею перевірте ліцензію у реєстрі НКЦПФР",
    lastChecked: "2026-10-06",
    source: "https://www.inzhur.reit/",
  },
  {
    id: "eoselia",
    name: "єОселя в Дії",
    category: "mortgage",
    officialUrl: "https://eoselia.diia.gov.ua/",
    affiliateUrl: null,
    minInvestment: null,
    fees: "Комісії, оцінка, нотаріус та страхування визначає банк",
    online: true,
    currencies: ["UAH"],
    verification: "Офіційна програма; рішення приймає банк",
    lastChecked: "2026-10-06",
    source: "https://eoselia.diia.gov.ua/",
  },
];
export function partnerLink(provider: Provider) {
  if (!provider.affiliateUrl) return provider.officialUrl;
  const url = new URL(provider.affiliateUrl);
  url.searchParams.set("utm_source", "ekapital");
  url.searchParams.set("utm_medium", "affiliate");
  url.searchParams.set("utm_campaign", provider.id);
  return url.toString();
}
