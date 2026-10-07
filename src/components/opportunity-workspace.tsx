"use client";
import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  Check,
  ChevronRight,
  Layers3,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useCapital } from "./profile-context";
import { Field } from "./ui";
import { usableQuotes } from "@/lib/finance/automatic";
import { fmt, pct, dateFmt, today } from "@/lib/format";
import {
  buildOpportunities,
  historicalContext,
  macroScenarios,
  opportunityValue,
  type Opportunity,
} from "@/lib/finance/opportunities";

const currencies = ["UAH", "USD", "EUR"] as const;
export function OpportunityWorkspace() {
  const { state, market, update, persist } = useCapital();
  const input = state.decision.inputs;
  const deferred = useDeferredValue(input);
  const date = today();
  const macros = useMemo(() => macroScenarios(market, date), [market, date]);
  const macro =
    macros.find((m) => m.id === (input.macro ?? "history5")) ?? macros[0];
  const [tab, setTab] = useState<"future" | "history">("future");
  const [group, setGroup] = useState("all");
  const resume = state.decision.plans.find(
    (p) => p.id === state.decision.resumeId,
  );
  const [selectedId, setSelectedId] = useState(
    String(resume?.assumptions.optionId ?? ""),
  );
  const real = input.valuation === "real";
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [historyYears, setHistoryYears] = useState(5);
  const reference = input.referenceCurrency ?? "USD";
  const valuationMarket = { ...market, fxQuotes: usableQuotes(market, date) };
  const referenceAvailable =
    real ||
    reference === "UAH" ||
    valuationMarket.fxQuotes.some((q) => q.currency === reference);
  const annual = input.savingFrequency === "annual";
  const options = useMemo(
    () => (macro ? buildOpportunities(market, deferred, macro, date) : []),
    [market, deferred, macro, date],
  );
  const value = (o: Opportunity, m = input.months) =>
    macro
      ? opportunityValue(
          o.rows[Math.min(m, o.rows.length - 1)].value,
          m,
          reference,
          macro,
          valuationMarket,
          real,
        )
      : null;
  const sorted = [...options].sort((a, b) => (value(b) ?? 0) - (value(a) ?? 0));
  const baseline = options.find((o) => o.id === `cash-${input.currency}`);
  const selected =
    options.find((o) => o.id === selectedId) ??
    sorted.find((o) => o.kind === "deposit" && o.currency === "UAH") ??
    sorted[0];
  const visible = sorted.filter(
    (o) =>
      (group === "all" &&
        (o.kind !== "deposit" ||
          sorted.find((x) => x.kind === "deposit" && x.currency === o.currency)
            ?.id === o.id)) ||
      o.kind === group ||
      (group === "currency" && o.kind === "cash" && o.currency !== "UAH"),
  );
  const ready = input.capital > 0 || input.monthly > 0;
  const change = (part: Partial<typeof input>) => {
    update((s) => ({
      ...s,
      decision: { ...s.decision, inputs: { ...s.decision.inputs, ...part } },
    }));
    setSaved(false);
    setError("");
  };
  const sourceDates = [
    ...new Set(market.deposits.map((o) => o.meta.effectiveDate)),
  ].sort();
  const nextStep = (o: Opportunity) =>
    o.kind === "deposit"
      ? `Перевірити у ${o.name} «${o.offer!.product}»: ${pct(o.offer!.rate)} до податку, мінімум ${fmt(o.offer!.minimum, o.currency)}, строк ${o.offer!.minMonths}–${o.offer!.maxMonths} міс. Звірити курс і правила поповнення перед відкриттям.`
      : o.kind === "bond"
        ? "Отримати ціну, НКД, комісії та графік виплат цього випуску у банку чи брокера. Порахувати дохід за конкретною угодою."
        : o.kind === "fund" || o.kind === "mix"
          ? "Перевірити новий звіт Inzhur, ціну сертифіката та правила викупу. Окремо перевірити курс купівлі валюти й не вкладати гроші для непередбачених витрат."
          : "Порівняти фактичні курси купівлі й продажу та комісії банку. Залишити доступними гроші на непередбачені витрати.";
  const save = async () => {
    if (!selected || !macro || saving) return;
    setSaving(true);
    setError("");
    const result = await persist((s) => ({
      ...s,
      decision: {
        ...s.decision,
        plans: [
          ...s.decision.plans.slice(-29),
          {
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
            kind: "investment" as const,
            name: selected.name,
            inputs: { ...input },
            assumptions: {
              mode: "explorer",
              optionId: selected.id,
              referenceCurrency: reference,
              macro: macro.name,
              inflation: macro.inflation,
              usdGrowth: macro.growth.USD,
              eurGrowth: macro.growth.EUR,
              source: selected.sourceUrl,
              referenceDate: selected.sourceDate,
              projectedTotal: selected.rows.at(-1)!.value,
            },
            result: `Сценарій «${macro.name}», ${input.months} міс.: ${fmt(value(selected) ?? 0, real ? "UAH" : reference)}${real ? " у сьогоднішніх цінах України" : ""}. Це умовний результат, не прогноз.`,
            nextStep: nextStep(selected),
            sourceDate: selected.sourceDate,
          },
        ],
      },
    }));
    setSaving(false);
    setSaved(result);
    if (!result) setError("Не вдалося зберегти. Спробуйте ще раз.");
  };
  const h = historicalContext(market, historyYears, date);
  const currentFx =
    input.currency === "UAH"
      ? 1
      : market.fxQuotes.find((q) => q.currency === input.currency)?.buy;
  const historicalCapital = (input.capital || 10000) * (currentFx ?? 1);
  const displayCurrency = real ? "UAH" : reference;
  return (
    <div className="opportunity-app">
      <header className="opportunity-title">
        <div>
          <span className="micro-label">
            <span className="live-dot" /> МОЖЛИВОСТІ ВАШОГО КАПІТАЛУ
          </span>
          <h1>
            Що я міг би зробити
            <br />
            зі своїми грошима?
          </h1>
        </div>
        <span className="opportunity-emblem">
          <Wallet size={30} />
          <b>є</b>
        </span>
      </header>
      <section className="money-console" aria-label="Мої гроші">
        <div className="console-top">
          <span>Почнімо з ваших можливостей</span>
          <div className="pill-switch" aria-label="Валюта моїх грошей">
            {currencies.map((c) => (
              <button
                key={c}
                aria-pressed={input.currency === c}
                onClick={() => change({ currency: c })}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
        <div className="money-fields">
          <Field
            label="Вільні гроші зараз"
            value={input.capital}
            suffix={input.currency === "UAH" ? "₴" : input.currency}
            onChange={(capital) => change({ capital })}
          />
          <div>
            <Field
              label={
                annual ? "Можу відкладати за рік" : "Можу відкладати щомісяця"
              }
              value={annual ? input.monthly * 12 : input.monthly}
              suffix={input.currency === "UAH" ? "₴" : input.currency}
              onChange={(n) => change({ monthly: annual ? n / 12 : n })}
            />
            <button
              className="frequency-switch"
              onClick={() =>
                change({ savingFrequency: annual ? "monthly" : "annual" })
              }
            >
              {annual ? "Показати за місяць" : "Показати за рік"}
            </button>
          </div>
        </div>
        <div className="console-bottom">
          <span>Горизонт</span>
          <div className="pill-switch" aria-label="Строк порівняння">
            {[12, 36, 60, 120].map((m) => (
              <button
                key={m}
                aria-pressed={input.months === m}
                onClick={() => change({ months: m })}
              >
                {m / 12} {m === 12 ? "рік" : m === 36 ? "роки" : "років"}
              </button>
            ))}
          </div>
          <button
            className="income-toggle"
            aria-pressed={input.purpose === "income"}
            onClick={() =>
              change({
                purpose: input.purpose === "income" ? "grow" : "income",
              })
            }
          >
            {input.purpose === "income"
              ? "Забирати виплати"
              : "Реінвестувати виплати"}
          </button>
        </div>
      </section>
      <nav className="opportunity-tabs" aria-label="Напрями">
        <button
          aria-pressed={tab === "future"}
          onClick={() => setTab("future")}
        >
          <Sparkles size={17} />
          Можливості
        </button>
        <button
          aria-pressed={tab === "history"}
          onClick={() => setTab("history")}
        >
          <TrendingUp size={17} />
          Як було раніше
        </button>
        <Link prefetch={false} href="/app/property">
          Нерухомість
          <ArrowUpRight size={16} />
        </Link>
        <Link prefetch={false} href="/app/business">
          Бізнес
          <ArrowUpRight size={16} />
        </Link>
      </nav>
      {!ready && (
        <div className="start-nudge">
          <Layers3 size={22} />
          <span>Навіть невелика сума має варіанти.</span>
          <button
            onClick={() =>
              change({ capital: 10000, monthly: 0, currency: "UAH" })
            }
          >
            Спробувати з 10 000 ₴ <ArrowRight size={16} />
          </button>
        </div>
      )}
      {tab === "future" && (
        <>
          <div className="scenario-toolbar">
            <div>
              <span className="micro-label">ЯКЩО УМОВИ БУДУТЬ ТАКИМИ</span>
              <select
                aria-label="Умови майбутнього"
                value={macro?.id ?? ""}
                onChange={(e) =>
                  change({ macro: e.target.value as typeof input.macro })
                }
              >
                {!macros.length && <option value="">Історія недоступна</option>}
                {macros.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <span className="micro-label">ОЦІНЮЮ РЕЗУЛЬТАТ У</span>
              <div className="pill-switch" aria-label="Валюта результату">
                {currencies.map((c) => (
                  <button
                    key={c}
                    aria-pressed={reference === c && !real}
                    onClick={() => {
                      change({ referenceCurrency: c, valuation: "reference" });
                    }}
                  >
                    {c}
                  </button>
                ))}
                <button
                  aria-pressed={real}
                  onClick={() => {
                    change({ valuation: "real" });
                  }}
                >
                  Ціни сьогодні
                </button>
              </div>
            </div>
          </div>
          {macro && (
            <p className="scenario-caption">
              Інфляція {pct(macro.inflation)} · USD {pct(macro.growth.USD)} /
              рік ·{" "}
              {macro.id === "stress"
                ? "Історичні максимуми, не ймовірність"
                : "Умовний сценарій, не прогноз"}
            </p>
          )}
          {ready && selected && macro && referenceAvailable ? (
            <div className="opportunity-grid" aria-busy={input !== deferred}>
              <section className="outcome-stage">
                <div className="stage-top">
                  <span>ЯКЩО ОБРАТИ</span>
                  <span>
                    {input.months / 12} {input.months === 12 ? "рік" : "років"}
                  </span>
                </div>
                <h2>{selected.name}</h2>
                <div
                  className="outcome-number"
                  key={`${selected.id}-${value(selected)}`}
                >
                  {fmt(value(selected) ?? 0, displayCurrency)}
                </div>
                <p>
                  {real
                    ? "Купівельна спроможність у цінах України сьогодні"
                    : "Еквівалент після податків за обраних умов"}
                </p>
                <OutcomeChart
                  selected={selected}
                  baseline={baseline}
                  value={(v, m) =>
                    opportunityValue(
                      v,
                      m,
                      reference,
                      macro,
                      valuationMarket,
                      real,
                    ) ?? 0
                  }
                />
                <div className="chart-legend">
                  <span>
                    <i />
                    Обраний варіант
                  </span>
                  <span>
                    <i />
                    Зберігати без доходу
                  </span>
                </div>
                <div className="outcome-difference">
                  <span>Різниця проти зберігання без доходу</span>
                  <strong>
                    {baseline
                      ? fmt(
                          (value(selected) ?? 0) - (value(baseline) ?? 0),
                          displayCurrency,
                        )
                      : "—"}
                  </strong>
                </div>
                <div className="stage-foot">
                  <ShieldCheck size={16} />
                  <span>
                    Не гарантує збереження капіталу. Ризики — в деталях.
                  </span>
                </div>
              </section>
              <section className="opportunity-list">
                <div className="list-heading">
                  <h2>Що доступно мені</h2>
                  <span>{options.length} варіантів</span>
                </div>
                <div className="option-filters" aria-label="Тип варіанта">
                  {[
                    ["all", "Усе"],
                    ["deposit", "Депозити"],
                    ["currency", "Валюта"],
                    ["fund", "Фонди"],
                    ["mix", "Мікс"],
                    ["bond", "ОВДП"],
                  ].map(([id, label]) => (
                    <button
                      key={id}
                      aria-pressed={group === id}
                      onClick={() => setGroup(id)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="opportunity-rows">
                  {visible.map((o) => (
                    <button
                      key={o.id}
                      className={`opportunity-row ${selected.id === o.id ? "chosen" : ""}`}
                      aria-pressed={selected.id === o.id}
                      onClick={() => {
                        setSelectedId(o.id);
                        setSaved(false);
                      }}
                    >
                      <span className={`opportunity-icon ${o.kind}`}>
                        {o.kind === "mix" ? (
                          <Layers3 size={20} />
                        ) : o.currency === "USD" ? (
                          "$"
                        ) : o.currency === "EUR" ? (
                          "€"
                        ) : o.kind === "fund" ? (
                          "і"
                        ) : (
                          "₴"
                        )}
                      </span>
                      <span className="option-description">
                        <strong>{o.name}</strong>
                        <small>{o.tag}</small>
                      </span>
                      <span className="option-result">
                        <strong>{fmt(value(o) ?? 0, displayCurrency)}</strong>
                        <small>
                          {o.rate > 0
                            ? `${pct(o.rate)} чиста ставка*`
                            : o.kind === "mix"
                              ? "Два інструменти"
                              : "Без процентів"}
                        </small>
                      </span>
                      <ChevronRight size={16} />
                    </button>
                  ))}
                  {!visible.length && (
                    <p className="compact-note">
                      Немає варіантів із перевіреними умовами для цієї суми й
                      строку.
                    </p>
                  )}
                </div>
                <small className="compact-note">
                  Порядок — за сумою в цьому сценарії, не за безпекою. *Ставка
                  інструмента, не дохідність у валюті результату.
                </small>
              </section>
            </div>
          ) : ready ? (
            <div className="start-nudge">
              Немає свіжих курсів або повної історії. Не підставляємо нулі
              замість невідомих даних.
            </div>
          ) : null}
          {ready && selected && (
            <section className="action-dock">
              <div>
                <span className="micro-label">КУДИ КОПАТИ ДАЛІ</span>
                <h2>
                  {selected.kind === "deposit"
                    ? `Перевірити умови ${selected.name}`
                    : selected.kind === "cash"
                      ? "Перевірити курс і комісії"
                      : "Перевірити конкретну угоду"}
                </h2>
                <p>
                  {selected.kind === "deposit"
                    ? `${pct(selected.offer!.rate)} до податку · від ${fmt(selected.offer!.minimum, selected.currency)} · умови на ${dateFmt(selected.sourceDate)}`
                    : `Орієнтир на ${dateFmt(selected.sourceDate)}, не готова угода`}
                </p>
              </div>
              <div className="dock-buttons">
                <a
                  href={selected.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="button"
                >
                  {selected.kind === "deposit"
                    ? "Перейти до банку"
                    : "Відкрити джерело"}
                  <ArrowUpRight size={17} />
                </a>
                <button
                  className="button outline"
                  disabled={
                    saving || saved || input !== deferred || !referenceAvailable
                  }
                  onClick={save}
                >
                  {saved ? <Check size={17} /> : <Bookmark size={17} />}{" "}
                  {saved
                    ? "План збережено"
                    : saving
                      ? "Зберігаємо…"
                      : "Зберегти це рішення"}
                </button>
              </div>
              {error && <p role="alert">{error}</p>}
              <details>
                <summary>Ризики й деталі розрахунку</summary>
                <p>{nextStep(selected)}</p>
                {selected.parts && <p>{selected.parts.join(" · ")}</p>}
                <ul>
                  {selected.notes.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
                <p>
                  Довгі горизонти повторюють сьогоднішні ставки й умови.
                  Майбутні ставки, податки, вартість активів і можливість
                  реінвестування невідомі. У сценарії виплат гроші накопичуються
                  без доходу, а не витрачаються.
                </p>
                <p>
                  Банк не отримує «рейтинг надійності» за розміром ставки.
                  Перевірте{" "}
                  <a
                    href="https://bank.gov.ua/ua/supervision/institutions"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    статус у НБУ
                  </a>{" "}
                  та{" "}
                  <a
                    href="https://www.fg.gov.ua/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    умови гарантування ФГВФО
                  </a>
                  . Окремо можна переглянути{" "}
                  <a
                    href="https://minfin.com.ua/ua/banks/rating/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    рейтинг стійкості Мінфіну та його методику
                  </a>
                  : це не гарантія надійності банку.
                </p>
              </details>
            </section>
          )}
        </>
      )}
      {tab === "history" && (
        <section className="historical-stage">
          <div className="list-heading">
            <div>
              <span className="micro-label">
                НЕ ПРОГНОЗ. ТЕ, ЩО ВЖЕ СТАЛОСЯ.
              </span>
              <h2>А якби я тоді купив валюту?</h2>
            </div>
            <div className="pill-switch">
              {[5, 10].map((y) => (
                <button
                  key={y}
                  aria-pressed={historyYears === y}
                  onClick={() => setHistoryYears(y)}
                >
                  {y} років
                </button>
              ))}
            </div>
          </div>
          {h ? (
            <>
              <p className="compact-note">
                Для {fmt(historicalCapital)} на старті, без поповнень ·{" "}
                {dateFmt(h.start)} — {dateFmt(h.end)}
              </p>
              <div className="historical-bars">
                {[
                  ["Зберігати гривні", 1],
                  ["Купити USD", h.ratios.USD],
                  ["Купити EUR", h.ratios.EUR],
                ].map(([label, factor]) => (
                  <div key={String(label)}>
                    <span>{label}</span>
                    <div>
                      <i
                        style={{
                          width: `${Math.max(2, (Number(factor) / Math.max(1, h.ratios.USD, h.ratios.EUR)) * 100)}%`,
                        }}
                      />
                    </div>
                    <strong>
                      {fmt(
                        (historicalCapital * Number(factor)) /
                          h.inflationFactor,
                      )}
                    </strong>
                  </div>
                ))}
              </div>
              <div className="historical-bottom">
                <span>
                  Усі суми — у купівельній спроможності на початок періоду.
                </span>
                <strong>
                  Ціни зросли на {pct((h.inflationFactor - 1) * 100)}
                </strong>
              </div>
              <details>
                <summary>Звідки дані й чого це не доводить</summary>
                <p>
                  Офіційні курси НБУ та місячний CPI Держстату. Історичні курси
                  не є доступними банківськими котируваннями: комісії та спред у
                  цьому ретроспективному порівнянні не враховані. Сьогоднішні
                  депозитні ставки не перенесені в минуле. Минулі результати не
                  доводять майбутні.
                </p>
                <a
                  href="https://bank.gov.ua/ua/open-data/api-dev"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  НБУ
                </a>{" "}
                ·{" "}
                <a href={h.source} target="_blank" rel="noopener noreferrer">
                  Держстат
                </a>
              </details>
            </>
          ) : (
            <p>
              Немає повних послідовних даних за цей період. Результат не
              вигадуємо.
            </p>
          )}
        </section>
      )}
      <details className="data-drawer">
        <summary>
          <span className="live-dot" />
          Дані, оновлення та припущення
          <ChevronRight size={16} />
        </summary>
        <p>
          Банківські пропозиції та курси перевіряємо кожні 6 годин. Відстежуємо{" "}
          {new Set(market.deposits.map((o) => o.bank)).size} банки, не весь
          ринок. Останні умови:{" "}
          {sourceDates.at(-1) ? dateFmt(sourceDates.at(-1)!) : "невідомо"}.
          Прострочені пропозиції виключаємо з розрахунку.
        </p>
        <p>
          Ціну сертифікатів Inzhur і офіційні повідомлення про дивіденди також
          перевіряємо кожні 6 годин. Місяць виплати та дату публікації
          зберігаємо окремо. Історична виплата не стає гарантованою майбутньою
          ставкою.
        </p>
        <p>
          Податки інвестицій — для фізособи-резидента України, не ФОП: депозит
          23%, дивіденди ІСІ 14%, ОВДП 0%. Перевірка 06.10.2026. Статус ФОП не
          перетворює особисті інвестиції на підприємницький дохід.
        </p>
        {macro && (
          <p>
            Історична база: {dateFmt(macro.start)} — {dateFmt(macro.end)}. Темп
            — геометричний середньорічний, не сума відсотків. Стрес: максимальні
            зміни за 12 місяців у доступних останніх 10 роках, повторені щороку;
            одночасність цих максимумів не стверджується. Модель не оцінює
            ймовірність війни, дефолту або втрати майна.
          </p>
        )}
        <p>
          «За рік» у полі заощаджень розподіляється рівномірно на 12 щомісячних
          внесків. Валюта результату — еквівалент за курсом сценарію; лише «Ціни
          сьогодні» враховує CPI України.
        </p>
        <ul>
          {market.health
            .filter((h) => h.error)
            .map((h) => (
              <li key={h.id}>
                {h.name}: оновлення недоступне; останні перевірені дані{" "}
                {h.lastSuccess
                  ? dateFmt(h.lastSuccess.slice(0, 10))
                  : "відсутні"}
                .
              </li>
            ))}
        </ul>
        <p>
          Особисті суми й плани зберігаються на пристрої. Доступу до банківських
          рахунків немає.
        </p>
        <Link href="/app/offers" prefetch={false}>
          Докладні банківські пропозиції
        </Link>
      </details>
    </div>
  );
}
function OutcomeChart({
  selected,
  baseline,
  value,
}: {
  selected: Opportunity;
  baseline?: Opportunity;
  value: (v: number, m: number) => number;
}) {
  const series = selected.rows.map((r) => ({
    x: r.month,
    a: value(r.value, r.month),
    b: value(baseline?.rows[r.month]?.value ?? 0, r.month),
  }));
  const max = Math.max(1, ...series.flatMap((r) => [r.a, r.b]));
  const path = (key: "a" | "b") =>
    series
      .map(
        (r, i) =>
          `${i ? "L" : "M"}${20 + (r.x / Math.max(1, selected.rows.at(-1)!.month)) * 560},${190 - (r[key] / max) * 165}`,
      )
      .join(" ");
  return (
    <svg
      className="outcome-chart"
      viewBox="0 0 600 220"
      role="img"
      aria-label={`Обраний варіант і зберігання без доходу за ${selected.rows.at(-1)!.month} місяців`}
    >
      <defs>
        <linearGradient id="capital-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#bded80" stopOpacity=".3" />
          <stop offset="100%" stopColor="#bded80" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[40, 90, 140, 190].map((y) => (
        <line key={y} x1="20" x2="580" y1={y} y2={y} stroke="#ffffff12" />
      ))}
      <path d={`${path("a")} L580,190 L20,190 Z`} fill="url(#capital-fill)" />
      <path
        d={path("b")}
        fill="none"
        stroke="#8e9caa"
        strokeWidth="2"
        strokeDasharray="5 6"
      />
      <path
        key={selected.id}
        className="draw-line"
        d={path("a")}
        fill="none"
        stroke="#bded80"
        strokeWidth="3"
        pathLength="1"
      />
      <text x="20" y="215" fill="#a0afbd" fontSize="12">
        Зараз
      </text>
      <text x="580" y="215" textAnchor="end" fill="#a0afbd" fontSize="12">
        Через {selected.rows.at(-1)!.month / 12} років
      </text>
    </svg>
  );
}
