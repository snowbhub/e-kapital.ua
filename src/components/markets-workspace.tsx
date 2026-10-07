"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Gem,
  ChartNoAxesCombined,
  TriangleAlert,
} from "lucide-react";
import { useCapital } from "./profile-context";
import { fmt, num, dateFmt } from "@/lib/format";
import {
  metalQuoteSchema,
  metalPurchase,
  type MetalQuote,
} from "@/lib/data/metal-quotes";
const troy = 31.1034768;
export function MarketsWorkspace() {
  const { market, state } = useCapital();
  const [tab, setTab] = useState<"metals" | "stocks" | "forex">("metals"),
    [metal, setMetal] = useState<"XAU" | "XAG">("XAU"),
    [leverage, setLeverage] = useState(1);
  const [quotes, setQuotes] = useState<MetalQuote[]>([]),
    [quoteStatus, setQuoteStatus] = useState("Завантажуємо котировки банку…");
  useEffect(() => {
    const c = new AbortController();
    fetch("/api/metals", { signal: c.signal })
      .then(async (r) => {
        if (!r.ok) throw Error();
        return r.json();
      })
      .then((v) => {
        if (!c.signal.aborted) {
          setQuotes(v.quotes.map((q: unknown) => metalQuoteSchema.parse(q)));
          setQuoteStatus(
            v.error ??
              "Офіційні котировки ПриватБанку · перевірка кожні 6 годин",
          );
        }
      })
      .catch(() => {
        if (!c.signal.aborted)
          setQuoteStatus("Котировки банку зараз недоступні");
      });
    return () => c.abort();
  }, []);
  const rate = market.rates.find((r) => r.code === metal),
    usd = market.rates.find((r) => r.code === "USD");
  const currency = state.decision.inputs.currency,
    capital = state.decision.inputs.capital;
  const fx =
    currency === "UAH"
      ? 1
      : market.rates.find((r) => r.code === currency)?.value;
  const budget = fx ? capital * fx : null,
    grams = rate && budget !== null ? budget / (rate.value / troy) : null;
  const available = quotes.filter((q) => q.metal === metal);
  const selected = available
    .filter((q) => metalPurchase(budget ?? 0, q).count > 0)
    .sort((a, b) => a.sell / a.buy - b.sell / b.buy)[0];
  const purchase = selected ? metalPurchase(budget ?? 0, selected) : null;
  return (
    <div className="markets-workspace">
      <span className="micro-label">ЗА МЕЖАМИ ДЕПОЗИТУ</span>
      <h1>Метали й ринки</h1>
      <div className="market-tabs" role="group" aria-label="Ринки">
        {(
          [
            ["metals", "Золото й срібло"],
            ["stocks", "Акції та фонди"],
            ["forex", "Forex / CFD"],
          ] as const
        ).map(([id, label]) => (
          <button
            data-feature={id}
            className={tab === id ? "active" : ""}
            key={id}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "metals" ? (
        <>
          <div className="market-quote">
            {(["XAU", "XAG"] as const).map((code) => {
              const r = market.rates.find((v) => v.code === code);
              return (
                <button
                  className="account-panel"
                  style={{
                    textAlign: "left",
                    cursor: "pointer",
                    outline: metal === code ? "2px solid #92b778" : undefined,
                  }}
                  data-feature="metals"
                  key={code}
                  onClick={() => setMetal(code)}
                >
                  <Gem size={24} />
                  <h2>{code === "XAU" ? "Золото" : "Срібло"}</h2>
                  <strong className="market-price">
                    {r
                      ? `${num(r.value / troy, 2)} ₴ / г`
                      : "Немає перевіреної ціни"}
                  </strong>
                  <span className="market-source">
                    НБУ · облікова ціна{" "}
                    {r ? dateFmt(r.meta.effectiveDate) : "недоступна"}
                  </span>
                  {r && usd && (
                    <p>
                      {num(r.value / usd.value / troy, 2)} USD / г за офіційним
                      курсом
                    </p>
                  )}
                </button>
              );
            })}
          </div>
          <section className="account-panel">
            <h2>Фізичні зливки під вашу суму</h2>
            <p className="market-source">{quoteStatus}</p>
            {purchase && selected ? (
              <>
                <div className="market-result">
                  <span>НАЙМЕНШИЙ СПРЕД СЕРЕД ДОСТУПНИХ ВАГ</span>
                  <strong>
                    {purchase.count} × {selected.grams} г
                  </strong>
                  <span>ПриватБанк · {dateFmt(selected.date)}</span>
                </div>
                <div className="admin-metric-row">
                  <span>Вартість покупки</span>
                  <strong>{fmt(purchase.spent)}</strong>
                </div>
                <div className="admin-metric-row">
                  <span>Грошей залишиться</span>
                  <strong>{fmt(purchase.left)}</strong>
                </div>
                <div className="admin-metric-row">
                  <span>Різниця купівлі й викупу</span>
                  <strong>−{fmt(purchase.spreadLoss)}</strong>
                </div>
                <p className="account-hint">
                  Ціна викупу має зрости на {num(purchase.breakEvenGrowth, 1)}%,
                  щоб покрити покупку без інших витрат.
                </p>
              </>
            ) : (
              <p>
                {available.length
                  ? `Найменший зливок — від ${fmt(Math.min(...available.map((q) => q.grams * q.sell)))}. Змініть капітал у порівнянні.`
                  : "Немає актуальної пропозиції банку."}
              </p>
            )}
            <details>
              <summary>Інші ваги й ціни банку</summary>
              {available.map((q) => (
                <div className="admin-metric-row" key={q.grams}>
                  <span>{q.grams} г</span>
                  <strong>
                    {fmt(q.sell)} / г продаж
                    <br />
                    {fmt(q.buy)} / г викуп
                  </strong>
                </div>
              ))}
            </details>
            <p className="account-hint">
              Зливки І категорії. Викуп залежить від стану та прийняття банком.
              Наявність у відділенні не підтверджена. Податки конкретної
              операції й зберігання тут не розраховано.
            </p>
          </section>
          <div className="market-result">
            <span className="micro-label">ВАШІ {fmt(capital, currency)}</span>
            <strong>
              {grams !== null && capital > 0
                ? `${num(grams, 2)} г ${metal === "XAU" ? "золота" : "срібла"}`
                : "Спочатку вкажіть капітал у порівнянні"}
            </strong>
            <span>
              Еквівалент за обліковою ціною. Це не ціна продажу зливка: банк
              додає надбавку та має окрему ціну викупу.
            </span>
          </div>
          <section className="account-panel">
            <h2>Де перевірити фізичний метал</h2>
            <div className="market-links">
              <a
                href="https://privatbank.ua/banking-metals"
                className="button"
                target="_blank"
                rel="noopener noreferrer"
              >
                Зливки ПриватБанку <ArrowUpRight size={16} />
              </a>
              <a
                href="https://www.ukrgasbank.com/ukr/personal/metals/bank_metals/gold/"
                className="button outline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Укргазбанк <ArrowUpRight size={16} />
              </a>
            </div>
            <p className="account-hint">
              Перевірте доступну вагу, відділення, ціну продажу й викупу та стан
              пакування. Наявність товару не підтверджена. Котировки Укргазбанку
              ще не підключені.
            </p>
            <details>
              <summary>Як порівняти з депозитом або фондом</summary>
              <p>
                Метал не сплачує процентів. Щоб повернути витрачене, ціна його
                викупу має покрити надбавку на купівлю, спред і зберігання. ETF
                на метал та безготівковий метал мають інші права, комісії й
                доступність; це не фізичний зливок.
              </p>
              <Link
                href={metal === "XAU" ? "/gold" : "/silver"}
                className="inline-link"
              >
                Розрахунок зі спредом і власною пропозицією ↗
              </Link>
            </details>
            {rate && (
              <a
                href={rate.meta.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-link"
              >
                Перевірити джерело НБУ ↗
              </a>
            )}
          </section>
        </>
      ) : tab === "stocks" ? (
        <>
          <section className="account-panel">
            <ChartNoAxesCombined size={28} />
            <h2>Володіти часткою компанії</h2>
            <p>
              Акція — частка бізнесу. ETF — портфель активів за правилами фонду.
              Результат залежить від ціни, дивідендів, валютного курсу, комісій
              і податків.
            </p>
            <div className="market-links">
              <a
                href="https://www.nssmc.gov.ua/register/litsenzuvannia-ta-reestratsiia/traders/"
                className="button"
                target="_blank"
                rel="noopener noreferrer"
              >
                Перевірити інвестиційну фірму <ArrowUpRight size={16} />
              </a>
              <a
                href="https://pfts.ua/trade-info/indexes/shares-indexes"
                className="button outline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Індекси ПФТС <ArrowUpRight size={16} />
              </a>
            </div>
          </section>
          <section className="account-panel">
            <h2>Що перевірити перед угодою</h2>
            <div className="admin-metric-row">
              <span>Інструмент</span>
              <strong>ISIN / біржа / валюта</strong>
            </div>
            <div className="admin-metric-row">
              <span>Доступність</span>
              <strong>Резидентство й джерело коштів</strong>
            </div>
            <div className="admin-metric-row">
              <span>Повні витрати</span>
              <strong>Брокер / обмін / фонд / податки</strong>
            </div>
            <p className="account-hint">
              Поточний торговий потік акцій і ETF не підключений. Не
              підставляємо умовну «середню дохідність» замість котировки й
              доступної угоди. Для українського резидента перевірте чинні
              валютні обмеження та умови конкретного брокера.
            </p>
            <a
              href="https://bank.gov.ua/ua/markets/currency-market"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-link"
            >
              Валютний ринок та інформація НБУ ↗
            </a>
          </section>
        </>
      ) : (
        <>
          <section className="account-panel">
            <h2>Обмін валюти та торгівля з плечем</h2>
            <p>
              Купівля доларів у банку — обмін. Forex / CFD може бути контрактом
              з брокером і плечем: ви не обов’язково володієте валютою чи
              активом.
            </p>
            <label className="account-field">
              Плече у прикладі
              <select
                value={leverage}
                onChange={(e) => setLeverage(Number(e.target.value))}
              >
                {[1, 5, 10, 20].map((v) => (
                  <option key={v} value={v}>
                    {v}×
                  </option>
                ))}
              </select>
            </label>
            <div className="market-result">
              <span>РУХ РИНКУ ПРОТИ ВАС НА 5%</span>
              <strong>
                −{Math.min(100, 5 * leverage)}% власного забезпечення
              </strong>
              <span>
                Спрощений приклад без спреду, свопів, комісій та ліквідації.
                Вимоги маржі можуть закрити позицію раніше; можливість збитку
                понад забезпечення залежить від договору.
              </span>
            </div>
          </section>
          <section className="account-panel">
            <div className="market-risk">
              <TriangleAlert size={22} />
              <span>
                Тут немає торгових сигналів чи автоматичної торгівлі. Перед
                переказом перевірте юридичну особу, регулятора, права на актив
                та умови виведення коштів.
              </span>
            </div>
            <div className="market-links">
              <a
                href="https://www.nssmc.gov.ua/ua-iak-pereviryty-nadiinist-kompanii-za-dopomohoiu-reiestriv-komisii/"
                target="_blank"
                rel="noopener noreferrer"
                className="button outline"
              >
                Як перевіряти компанії ↗
              </a>
              <Link href="/app" className="button">
                Порівняти звичайну валюту
              </Link>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
