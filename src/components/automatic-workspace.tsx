"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  Bookmark,
  Check,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useCapital } from "./profile-context";
import { Badge, Card, Chart, Field, Stat } from "./ui";
import { fmt, pct, dateFmt, today } from "@/lib/format";
import {
  automaticOptions,
  type Currency,
  type AutomaticOption,
} from "@/lib/finance/automatic";
const currencies = ["UAH", "USD", "EUR"] as const;
const currencyNames = { UAH: "Гривня", USD: "Долар", EUR: "Євро" };
export function AutomaticWorkspace() {
  const { state, market, update, persist } = useCapital();
  const input = state.decision.inputs;
  const resume = state.decision.plans.find(
    (p) =>
      p.id === state.decision.resumeId && p.assumptions.mode === "automatic",
  );
  const [filter, setFilter] = useState<Currency>(input.currency);
  const [selectedId, setSelectedId] = useState(
    String(resume?.assumptions.optionId ?? ""),
  );
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const date = today();
  const model = useMemo(
    () => automaticOptions(market, input, date),
    [market, input, date],
  );
  const ready = input.capital > 0 || input.monthly > 0;
  const winner = model.winners[filter];
  const selected =
    [...model.deposits, ...model.others].find((o) => o.id === selectedId) ??
    winner;
  const change = (part: Partial<typeof input>) => {
    update((s) => ({
      ...s,
      decision: { ...s.decision, inputs: { ...s.decision.inputs, ...part } },
    }));
    setSaved(false);
    setSaveError("");
  };
  const nextStep = (o: AutomaticOption) =>
    o.kind === "deposit"
      ? `Перевірити в ${o.title} ставку ${pct(o.rate)}, строк ${o.months} міс. та курс конвертації. Відкрити «${o.subtitle}», якщо умови договору збігаються й гроші не знадобляться до погашення.`
      : o.kind === "bond"
        ? "Отримати в банку або брокера ціну купівлі, НКД, комісії та графік купонів цього випуску. Перевірити точний дохід перед купівлею."
        : "Перевірити останній звіт фонду, актуальну виплату й умови викупу сертифікатів перед інвестицією.";
  const save = async () => {
    if (!selected || saving) return;
    setSaving(true);
    setSaveError("");
    const o = selected;
    const success = await persist((s) => ({
      ...s,
      decision: {
        ...s.decision,
        plans: [
          ...s.decision.plans.slice(-29),
          {
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
            kind: "investment" as const,
            name: `${o.title} · ${currencyNames[o.currency]}`,
            inputs: { ...input },
            assumptions: {
              mode: "automatic",
              optionId: o.id,
              bank: o.title,
              currency: o.currency,
              rate: o.rate,
              netRate: o.netRate,
              tax: o.kind === "deposit" ? 23 : o.kind === "fund" ? 14 : 0,
              inflation: model.inflation?.rate ?? "Немає свіжого індексу",
              source: o.sourceUrl,
              referenceDate: o.sourceDate,
              projectedTotal: o.total,
              realTotal: o.real ?? "Невідомо",
            },
            result: `За сценарієм через ${input.months} міс.: ${fmt(o.total)}; чистий дохід ${fmt(o.income)}. ${o.real !== null ? `Купівельна спроможність: ${fmt(o.real)} за збереження історичного темпу інфляції.` : ""}`,
            nextStep: nextStep(o),
            sourceDate: o.sourceDate,
          },
        ],
      },
    }));
    setSaving(false);
    setSaved(success);
    if (!success) setSaveError("Не вдалося зберегти план. Спробуйте ще раз.");
  };
  const drawOffer = (o: AutomaticOption) => (
    <article
      className={`bank-offer ${selected?.id === o.id ? "selected" : ""}`}
      key={o.id}
    >
      <div className="offer-top">
        <span className="bank-symbol">
          {o.title.startsWith("monobank")
            ? "m"
            : o.kind === "deposit"
              ? "П"
              : o.kind === "bond"
                ? "₴"
                : "і"}
        </span>
        <div>
          <h3>{o.title}</h3>
          <small>
            {o.subtitle} · {currencyNames[o.currency]}
          </small>
        </div>
        {o.best && <Badge kind="green">Кращий із відстежуваних</Badge>}
      </div>
      <div className="offer-numbers">
        <div>
          <span>Ставка / рік</span>
          <strong>{pct(o.rate)}</strong>
          <small>{pct(o.netRate)} після податку</small>
        </div>
        <div>
          <span>Чистий дохід за {input.months} міс.</span>
          <strong>{fmt(o.income)}</strong>
          <small>У підсумку {fmt(o.nominalCurrency, o.currency)}</small>
        </div>
      </div>
      <p className="offer-lock">
        {o.kind === "deposit"
          ? `${o.months} міс. · від ${fmt(o.offer!.minimum, o.currency)} · ${o.offer!.replenishable ? "поповнення з обмеженнями" : "без поповнення"}`
          : o.availability}
      </p>
      <div className="form-actions">
        <button
          className="button small outline"
          aria-pressed={selected?.id === o.id}
          onClick={() => {
            setSelectedId(o.id);
            setSaved(false);
          }}
        >
          {selected?.id === o.id ? (
            <Check size={16} />
          ) : (
            <TrendingUp size={16} />
          )}{" "}
          Розглянути варіант
        </button>
        <a
          href={o.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-link"
        >
          Умови джерела <ArrowUpRight size={15} />
        </a>
      </div>
    </article>
  );
  return (
    <>
      <div className="auto-heading">
        <div>
          <Badge kind="green">
            <RefreshCw size={13} /> Ринок → ваше рішення
          </Badge>
          <h1>Що робити з моїми грошима?</h1>
          <p>
            Вкажіть свої суми. Ми підставимо ставки, податки та інфляцію й
            покажемо, що залишається вам.
          </p>
        </div>
        <span className="auto-wallet">
          <Wallet size={36} />
          <b>є</b>
        </span>
      </div>
      <Card className="auto-input-card">
        <div className="card-title">
          <h2>Ваші можливості</h2>
          <div className="segmented" aria-label="Валюта моїх грошей">
            {currencies.map((c) => (
              <button
                key={c}
                className={input.currency === c ? "active" : ""}
                aria-pressed={input.currency === c}
                onClick={() => {
                  change({ currency: c });
                  setFilter(c);
                }}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
        <div className="auto-fields">
          <Field
            label="Вільні гроші зараз"
            hint="Сума, яка не потрібна на поточні витрати й непередбачені ситуації."
            value={input.capital}
            suffix={input.currency === "UAH" ? "₴" : input.currency}
            onChange={(capital) => change({ capital })}
          />
          <Field
            label="Можу відкладати щомісяця"
            hint="Сума, яка залишається після ваших звичних витрат."
            value={input.monthly}
            suffix={input.currency === "UAH" ? "₴" : input.currency}
            onChange={(monthly) => change({ monthly })}
          />
        </div>
        <div className="auto-controls">
          <div>
            <span className="control-label">
              Коли можуть знадобитися гроші?
            </span>
            <div className="segmented">
              {[3, 6, 12, 24].map((months) => (
                <button
                  key={months}
                  className={input.months === months ? "active" : ""}
                  aria-pressed={input.months === months}
                  onClick={() => change({ months })}
                >
                  {months < 12
                    ? `${months} міс.`
                    : `${months / 12} ${months === 12 ? "рік" : "роки"}`}
                </button>
              ))}
            </div>
          </div>
          <div>
            <span className="control-label">Що хочете отримати?</span>
            <div className="segmented">
              <button
                className={input.purpose === "grow" ? "active" : ""}
                onClick={() => change({ purpose: "grow" })}
                aria-pressed={input.purpose === "grow"}
              >
                Накопичувати
              </button>
              <button
                className={input.purpose === "income" ? "active" : ""}
                onClick={() => change({ purpose: "income" })}
                aria-pressed={input.purpose === "income"}
              >
                Отримувати виплати
              </button>
            </div>
          </div>
        </div>
        <div className="automatic-status">
          <ShieldCheck size={17} />
          <span>
            Ставки банків і курси оновлюємо кожні 6 годин. Податки враховано для
            фізособи-резидента. Особисті суми залишаються на пристрої.
          </span>
        </div>
      </Card>
      {!ready ? (
        <Card className="auto-welcome">
          <Wallet size={32} />
          <h2>Дві суми — і готове порівняння</h2>
          <p>
            Побачите, який депозит доступний вам, скільки він принесе після
            податку та що може з’їсти інфляція.
          </p>
          <button
            className="button"
            onClick={() =>
              change({
                capital: 160000,
                monthly: 5000,
                currency: "UAH",
                months: 12,
              })
            }
          >
            Спробувати приклад: 160 000 ₴ + 5 000 ₴/міс.
          </button>
          <small>Це приклад; замініть суми на свої.</small>
        </Card>
      ) : (
        <>
          <div className="auto-section-title">
            <div>
              <span className="eyebrow">ВАША КАРТИНА В ЦИФРАХ</span>
              <h2>Через {input.months} місяців</h2>
            </div>
            <Badge>{currencyNames[input.currency]} → порівняння у ₴</Badge>
          </div>
          <div className="auto-stats">
            <Stat
              label="Ви вкладете загалом"
              value={fmt(model.contributed)}
              foot="Ваші гроші зараз + майбутні заощадження"
            />
            <Stat
              label="Дохід обраного варіанта"
              value={selected ? fmt(selected.income) : "Немає пропозиції"}
              foot="Після податку, до впливу інфляції"
              accent
            />
            <Stat
              label="Втрата купівельної спроможності без доходу"
              value={
                model.cash.real !== null
                  ? fmt(model.cash.total - model.cash.real)
                  : "Немає свіжого індексу"
              }
              foot={
                model.inflation
                  ? `Якщо темп ${pct(model.inflation.rate)} / рік збережеться`
                  : "Інфляція не прирівнюється до нуля"
              }
            />
          </div>
          <div className="auto-section-title">
            <div>
              <h2>Готові банківські варіанти</h2>
              <p>
                Порівнюємо {new Set(market.deposits.map((o) => o.bank)).size}{" "}
                банки, які відстежуємо. Це не весь ринок.
              </p>
            </div>
            <div className="segmented" aria-label="Валюта депозиту">
              {currencies.map((c) => (
                <button
                  key={c}
                  className={filter === c ? "active" : ""}
                  aria-pressed={filter === c}
                  onClick={() => {
                    setFilter(c);
                    setSelectedId("");
                    setSaved(false);
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div className="bank-offers">
            {model.deposits.filter((o) => o.currency === filter).map(drawOffer)}
          </div>
          {!winner && (
            <Card>
              <h3>Немає підтвердженого депозиту для цієї суми й строку</h3>
              <p>
                Причиною може бути мінімальна сума, точна дата погашення, ліміт
                конвертації або недоступне джерело. Спробуйте довший строк чи
                іншу валюту. Непідтверджені ставки не підставляємо.
              </p>
            </Card>
          )}
          <Card className="currency-dashboard">
            <div className="card-title">
              <div>
                <h2>Гривня, долар чи євро?</h2>
                <p>
                  Однакова сума й строк. Найбільший результат серед наших
                  пропозицій у кожній валюті.
                </p>
              </div>
            </div>
            <div className="currency-columns">
              {currencies.map((c) => {
                const o = model.winners[c];
                return (
                  <div key={c}>
                    <Badge>{c}</Badge>
                    <strong>{o ? fmt(o.total) : "Недоступно"}</strong>
                    <small>{o ? o.title : "Немає відповідного договору"}</small>
                    {o && (
                      <>
                        <div className="result-bar">
                          <span
                            style={{
                              width: `${Math.max(5, (o.total / Math.max(1, ...Object.values(model.winners).map((x) => x?.total ?? 0))) * 100)}%`,
                            }}
                          />
                        </div>
                        <span>
                          У сьогоднішніх цінах:{" "}
                          {o.real !== null ? fmt(o.real) : "невідомо"}
                        </span>
                        {c !== "UAH" && model.winners.UAH && (
                          <small>
                            Щоб зрівнятися з гривневим варіантом, кінцевий курс
                            має бути на{" "}
                            {pct((model.winners.UAH.total / o.total - 1) * 100)}{" "}
                            вищим за використаний у моделі.
                          </small>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="comparison-note">
              Майбутній курс невідомий. Порівняння використовує незмінні
              публічні карткові курси monobank із купівлею та продажем; курс
              конкретного депозиту перевірте в банку.{" "}
              {model.quotes
                .map(
                  (q) =>
                    `${q.currency}: ${q.buy} / ${q.sell} ₴ (${dateFmt(q.meta.effectiveDate)})`,
                )
                .join(" · ")}
            </p>
          </Card>
          {selected && (
            <Card className="auto-result">
              <div className="card-title">
                <div>
                  <Badge kind="green">Ваш сценарій</Badge>
                  <h2>
                    {selected.title} · {currencyNames[selected.currency]}
                  </h2>
                </div>
                <strong className="result-total">{fmt(selected.total)}</strong>
              </div>
              <Chart
                caption={`Сценарій ${selected.title}: гроші та їх купівельна спроможність`}
                series={selected.rows.map((r) => ({
                  x: `${r.month} міс.`,
                  a: r.value,
                  ...(model.inflation
                    ? {
                        b:
                          r.value /
                          Math.pow(
                            1 + model.inflation.rate / 100,
                            r.month / 12,
                          ),
                      }
                    : {}),
                }))}
                labels={["Сума після податку", "Купівельна спроможність"]}
              />
              <div className="auto-result-detail">
                <Stat label="Податок із доходу" value={fmt(selected.tax)} />
                <Stat
                  label="Середня чиста виплата / міс."
                  value={fmt(selected.cashPerMonth)}
                  foot="Еквівалент; фактичний графік залежить від договору"
                />
                <Stat
                  label="У сьогоднішніх цінах"
                  value={
                    selected.real !== null ? fmt(selected.real) : "Невідомо"
                  }
                />
              </div>
              <details className="option-assumptions">
                <summary>Як пораховано і які є обмеження</summary>
                <ul>
                  {selected.notes.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
                <p>
                  {selected.availability}. Умови перевірено{" "}
                  {dateFmt(selected.sourceDate)}.
                </p>
              </details>
              <div className="next-step-box">
                <span className="eyebrow">ЩО РОБИТИ ДАЛІ</span>
                <p>{nextStep(selected)}</p>
              </div>
              <div className="form-actions">
                <a
                  className="button"
                  target="_blank"
                  rel="noopener noreferrer"
                  href={selected.sourceUrl}
                >
                  Перейти до {selected.kind === "deposit" ? "банку" : "джерела"}{" "}
                  <ArrowUpRight size={17} />
                </a>
                <button
                  className="button outline"
                  onClick={save}
                  disabled={saving || saved}
                >
                  <Bookmark size={17} />
                  {saved
                    ? "План збережено"
                    : saving
                      ? "Зберігаємо…"
                      : "Зберегти це рішення"}
                </button>
                {saved && (
                  <Link
                    prefetch={false}
                    href="/app/plan"
                    className="inline-link"
                  >
                    Переглянути збережений план
                  </Link>
                )}
              </div>
              {saveError && <p role="alert">{saveError}</p>}
            </Card>
          )}
          <div className="auto-section-title">
            <div>
              <h2>А якщо ОВДП чи Inzhur?</h2>
              <p>
                Окремі сценарії: розміщення Мінфіну та історична виплата фонду
                не є готовою банківською пропозицією.
              </p>
            </div>
          </div>
          <div className="bank-offers">{model.others.map(drawOffer)}</div>
        </>
      )}
      <Card className="auto-housing">
        <div>
          <Badge>Наступне велике рішення</Badge>
          <h2>Житло зараз чи накопичувати далі?</h2>
          <p>
            Порівняйте оренду з інвестиціями та іпотеку на однаковому бюджеті.
          </p>
        </div>
        <Link prefetch={false} href="/app/home" className="button outline">
          Порівняти житло <ArrowUpRight size={17} />
        </Link>
      </Card>
      <details className="auto-sources">
        <summary>Джерела, актуальність і припущення</summary>
        <p>
          {model.inflation
            ? `Інфляція ${pct(model.inflation.rate)}: добуток останніх 12 місячних індексів Держстату до ${dateFmt(model.inflation.date)}. Майбутні результати в сьогоднішніх цінах показані за умови збереження цього темпу; це не прогноз.`
            : "Немає повного свіжого ряду інфляції: реальний результат не розраховуємо."}
        </p>
        <ul>
          {market.health
            .filter((h) => h.id.startsWith("bank-"))
            .map((h) => (
              <li key={h.id}>
                <a href={h.sourceUrl} target="_blank" rel="noopener noreferrer">
                  {h.name}
                </a>
                :{" "}
                {h.error
                  ? "оновлення недоступне; останні дані збережено"
                  : "оновлено"}{" "}
                {h.lastSuccess ? dateFmt(h.lastSuccess) : "—"}
              </li>
            ))}
        </ul>
        <p>
          Депозити: 18% ПДФО + 5% військового збору. Дивіденди фонду: 9% + 5%.
          Податки перевірено 06.10.2026, для стандартного сценарію
          фізособи-резидента. Умови можуть змінитися. Автоматичний рейтинг
          порівнює підтверджені ставки не старші 7 днів; невідомі дані не
          замінюються нулем.
        </p>
        <Link prefetch={false} href="/app/scenario">
          Свій сценарій із ручними припущеннями
        </Link>
        <p>
          Сервіс підтягує публічні умови, а не приватні залишки ваших
          банківських рахунків. Для доступу до рахунків потрібне окреме
          підключення за вашою згодою.
        </p>
      </details>
    </>
  );
}
