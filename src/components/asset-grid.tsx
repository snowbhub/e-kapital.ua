import Link from "next/link";
import {
  Landmark,
  Shield,
  Building2,
  Wallet,
  Coins,
  ArrowUpRight,
  Banknote,
} from "lucide-react";
const cards = [
  [
    "ovdp",
    "ОВДП",
    "Грошові потоки державного боргу",
    "Купони та погашення",
    Landmark,
  ],
  [
    "viiskovi-obligatsii",
    "Військові ОВДП",
    "Підтримка держави через облігації",
    "Офіційні випуски",
    Shield,
  ],
  ["inzhur", "Inzhur", "Фонди та реальні активи", "Виплати + NAV", Building2],
  [
    "deposit-calculator",
    "Депозити",
    "Банківські відсотки після витрат",
    "Строк і капіталізація",
    Wallet,
  ],
  [
    "usd",
    "Долар США",
    "Зміна гривневого еквівалента",
    "Валюта без процентів",
    Banknote,
  ],
  [
    "eur",
    "Євро",
    "Історія курсу та валютний ризик",
    "Валюта без процентів",
    Banknote,
  ],
  ["gold", "Золото", "Ціна, грами та спред", "Дорогоцінний метал", Coins],
  ["silver", "Срібло", "Ціна металу з витратами", "Дорогоцінний метал", Coins],
  [
    "finansovyi-rezerv",
    "Cash / резерв",
    "Гроші для непередбачених витрат",
    "Нульова номінальна дохідність",
    Wallet,
  ],
] as const;
export function AssetGrid({ limit }: { limit?: number }) {
  return (
    <div className="asset-grid">
      {cards
        .slice(0, limit ?? cards.length)
        .map(([url, title, description, tag, Icon]) => (
          <Link className="asset-card" href={"/" + url} key={url}>
            <div className="asset-icon">
              <Icon size={21} />
            </div>
            <h3>{title}</h3>
            <p>{description}</p>
            <div className="asset-bottom">
              <span>{tag}</span>
              <ArrowUpRight size={16} />
            </div>
          </Link>
        ))}
    </div>
  );
}
