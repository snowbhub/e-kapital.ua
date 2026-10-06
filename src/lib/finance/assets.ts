export type AssetKind = "cash" | "fx" | "metal" | "deposit" | "bond" | "fund";
export const assets = [
  {
    id: "ovdp",
    name: "ОВДП",
    short: "ОВДП",
    currency: "UAH",
    kind: "bond",
    group: "fixed",
    liquidity: "До погашення / вторинний ринок",
    color: "#85ac6d",
  },
  {
    id: "military",
    name: "Військові ОВДП",
    short: "Військові",
    currency: "UAH",
    kind: "bond",
    group: "fixed",
    liquidity: "До погашення / вторинний ринок",
    color: "#b6c989",
  },
  {
    id: "fx-bond",
    name: "Валютні ОВДП",
    short: "Вал. ОВДП",
    currency: "USD",
    kind: "bond",
    group: "fixed",
    liquidity: "До погашення / вторинний ринок",
    color: "#758bab",
  },
  {
    id: "inzhur",
    name: "Inzhur REIT",
    short: "Inzhur",
    currency: "UAH",
    kind: "fund",
    group: "estate",
    liquidity: "Залежить від правил викупу",
    color: "#ca927b",
  },
  {
    id: "energy",
    name: "Inzhur Energy",
    short: "Energy",
    currency: "UAH",
    kind: "fund",
    group: "fund",
    liquidity: "Залежить від правил викупу",
    color: "#ccbe85",
  },
  {
    id: "deposit",
    name: "Депозит",
    short: "Депозит",
    currency: "UAH",
    kind: "deposit",
    group: "fixed",
    liquidity: "За умовами договору",
    color: "#b4abc9",
  },
  {
    id: "usd",
    name: "Долар США",
    short: "USD",
    currency: "USD",
    kind: "fx",
    group: "currency",
    liquidity: "Швидкий обмін, спред",
    color: "#81aaa7",
  },
  {
    id: "eur",
    name: "Євро",
    short: "EUR",
    currency: "EUR",
    kind: "fx",
    group: "currency",
    liquidity: "Швидкий обмін, спред",
    color: "#7d99cb",
  },
  {
    id: "gold",
    name: "Золото",
    short: "Золото",
    currency: "XAU",
    kind: "metal",
    group: "metal",
    liquidity: "Викуп зі спредом",
    color: "#d0ae5f",
  },
  {
    id: "silver",
    name: "Срібло",
    short: "Срібло",
    currency: "XAG",
    kind: "metal",
    group: "metal",
    liquidity: "Викуп зі спредом",
    color: "#9fa7ac",
  },
  {
    id: "cash",
    name: "Гривня / cash",
    short: "Cash",
    currency: "UAH",
    kind: "cash",
    group: "cash",
    liquidity: "Доступно одразу",
    color: "#c4c6bb",
  },
] as const;
export type AssetId = (typeof assets)[number]["id"];
export type Scenario = {
  usd: number;
  eur: number;
  gold: number;
  silver: number;
  fundCash: number;
  fundNav: number;
  deposit: number;
  bond: number;
  inflation: number;
  tax: number;
  fee: number;
  buySpread: number;
  sellSpread: number;
  reinvest: boolean;
};
export const emptyScenario: Scenario = {
  usd: 0,
  eur: 0,
  gold: 0,
  silver: 0,
  fundCash: 0,
  fundNav: 0,
  deposit: 0,
  bond: 0,
  inflation: 0,
  tax: 0,
  fee: 0,
  buySpread: 0,
  sellSpread: 0,
  reinvest: false,
};
