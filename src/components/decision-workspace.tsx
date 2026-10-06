"use client";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  Home,
  Landmark,
  ShieldCheck,
  Wallet,
  Coins,
  TrendingUp,
  Bookmark,
  RotateCcw,
} from "lucide-react";
import { useCapital } from "./profile-context";
import { Card, Field, Badge, Chart } from "./ui";
import { fmt, dateFmt, today } from "@/lib/format";
import { decisionReferences, projectInvestment } from "@/lib/finance/decision";

const kinds = ["cash", "bond", "fund", "deposit", "fx"] as const;
type Kind = (typeof kinds)[number];
const titles: Record<Kind, string> = {
  cash: "Залишити гривню",
  bond: "ОВДП",
  fund: "Inzhur REIT",
  deposit: "Депозит",
  fx: "Валюта · USD",
};
const icons = {
  cash: Wallet,
  bond: ShieldCheck,
  fund: Landmark,
  deposit: Coins,
  fx: TrendingUp,
};
export function DecisionWorkspace() {
  const { state, update, market } = useCapital();
  const input = state.decision.inputs;
  const resume = state.decision.plans.find(
    (p) => p.id === state.decision.resumeId && p.kind === "investment",
  );
  const resumedKind = resume?.assumptions.option as Kind | undefined;
  const refs = decisionReferences(market, today());
  const [selected, setSelected] = useState<Kind | null>(resumedKind ?? null);
  const [overrides, setOverrides] = useState<Record<string, number>>(() => {
    if (!resume || !resumedKind) return {};
    const a = resume.assumptions;
    return Object.fromEntries([
      ["inflation", Number(a.inflation)],
      ...[
        ["cash", "cashRate"],
        ["price", "priceRate"],
        ["tax", "tax"],
        ["entry", "entryFee"],
        ["exit", "exitFee"],
        ["fee", "annualFee"],
      ].map(([key, source]) => [`${resumedKind}-${key}`, Number(a[source])]),
    ]);
  });
  const [reinvest, setReinvest] = useState(
    resume ? Boolean(resume.assumptions.reinvest) : true,
  );
  const [nextStep, setNextStep] = useState(resume?.nextStep ?? "");
  const [savedId, setSavedId] = useState("");
  const [stress, setStress] = useState(
    resume ? Boolean(resume.assumptions.stress) : false,
  );
  const change = (part: Partial<typeof input>) => {
    update((s) => ({
      ...s,
      decision: { ...s.decision, inputs: { ...s.decision.inputs, ...part } },
    }));
    setSavedId("");
  };
  const value = (key: string, fallback = 0) => overrides[key] ?? fallback;
  const edit = (key: string, n: number) => {
    setOverrides((o) => ({ ...o, [key]: n }));
    setSavedId("");
  };
  const fx = market.rates.find((r) => r.code === "USD");
  const inflation = value("inflation");
  const ready = input.capital > 0 || input.monthly > 0;
  const projections = Object.fromEntries(
    kinds.map((kind) => {
      const reference =
        kind === "bond"
          ? (refs.bond?.publishedRate ?? 0)
          : kind === "fund"
            ? (refs.fundCashRate ?? 0)
            : 0;
      const cashRate =
        kind === "cash" || kind === "fx" ? 0 : value(`${kind}-cash`, reference);
      const priceRate =
        kind === "cash" || kind === "bond" || kind === "deposit"
          ? 0
          : value(`${kind}-price`);
      const tax = value(`${kind}-tax`);
      const entryFee = value(`${kind}-entry`);
      const annualFee = value(`${kind}-fee`);
      const exitFee = value(`${kind}-exit`);
      const assumptions = {
        cashRate: stress && kind === "fund" ? 0 : cashRate,
        priceRate:
          stress && (kind === "fx" || kind === "fund") ? -20 : priceRate,
        tax,
        annualFee,
        entryFee,
        exitFee,
        inflation,
        reinvest,
      };
      return [
        kind,
        { ...projectInvestment({ ...input, ...assumptions }), assumptions },
      ];
    }),
  );
  const selectedResult = selected ? projections[selected] : null;
  const sourceDate =
    [
      refs.bond?.meta.effectiveDate,
      refs.fund?.meta.effectiveDate,
      fx?.meta.effectiveDate,
    ]
      .filter(Boolean)
      .sort()
      .at(-1) ?? today();
  const source = (kind: Kind) =>
    kind === "bond" && refs.bond
      ? `Мінфін · розміщення ${dateFmt(refs.bond.lastPlacement ?? refs.bond.meta.effectiveDate)} · ${refs.bond.isin}`
      : kind === "fund" && refs.distribution
        ? `Inzhur · історична виплата за ${dateFmt(refs.distribution.date)} × 12 / ціну придбання; податки задайте окремо`
        : kind === "fx" && fx
          ? `НБУ · ${dateFmt(fx.meta.effectiveDate)} · ${fmt(fx.value)} за $1`
          : kind === "deposit"
            ? "Введіть ставку з пропозиції вашого банку"
            : "Без дохідності: гроші залишаються гривнею";
  const next = (kind: Kind) =>
    ({
      cash: "Визначити, яка частина грошей має залишатися доступною одразу.",
      bond: "Перевірити ціну з НКД, комісії та дату погашення конкретного випуску в брокера.",
      fund: "Прочитати правила викупу, звітність, податки й комісії фонду.",
      deposit:
        "Знайти пропозицію банку й перевірити чисту ставку та дострокове повернення.",
      fx: "Перевірити фактичний курс купівлі/продажу та валюту майбутньої цілі.",
    })[kind];
  function save() {
    if (!selected || !selectedResult) return;
    const id = crypto.randomUUID();
    update((s) => ({
      ...s,
      decision: {
        ...s.decision,
        plans: [
          ...s.decision.plans.slice(-29),
          {
            id,
            createdAt: new Date().toISOString(),
            kind: "investment",
            name: titles[selected],
            inputs: { ...input },
            assumptions: {
              ...selectedResult.assumptions,
              option: selected,
              stress,
              reference: source(selected),
              referenceDate: sourceDate,
            },
            result: `За ${input.months} міс.: ${fmt(selectedResult.total)} разом, внесено ${fmt(selectedResult.contributed)}. Результат сценарію, не гарантована виплата.`,
            nextStep: nextStep.trim() || next(selected),
            sourceDate,
          },
        ],
      },
    }));
    setSavedId(id);
  }
  return (
    <>
      <div className="decision-heading">
        <Badge kind="green">Від питання до власного плану</Badge>
        <h1>
          Що можуть дати
          <br />
          ваші гроші?
        </h1>
        <p>
          Порівняйте варіанти для своєї суми. Зрозумійте різницю. Оберіть
          наступний крок.
        </p>
      </div>
      {resume && (
        <div className="notice">
          Завантажено припущення плану «{resume.name}» від{" "}
          {dateFmt(resume.createdAt.slice(0, 10))}. Звірте їх із поточними
          умовами.{" "}
          <button
            className="inline-link"
            onClick={() =>
              update((s) => ({
                ...s,
                decision: { ...s.decision, resumeId: null },
              }))
            }
          >
            Новий розрахунок →
          </button>
        </div>
      )}
      <Card className="decision-start">
        <div
          className="purpose-tabs"
          role="group"
          aria-label="Для чого ці гроші?"
        >
          {[
            ["grow", "Збільшити капітал"],
            ["income", "Отримувати виплати"],
            ["home", "Купити житло"],
          ].map(([id, label]) => (
            <button
              key={id}
              aria-pressed={input.purpose === id}
              onClick={() => change({ purpose: id as typeof input.purpose })}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="form-grid">
          <Field
            label="Сума для рішення (без резерву)"
            value={input.capital}
            onChange={(capital) => change({ capital })}
            suffix="₴"
            hint="Гроші на непередбачені витрати залиште окремо"
          />
          <Field
            label="Можу додавати щомісяця"
            value={input.monthly}
            onChange={(monthly) => change({ monthly })}
            suffix="₴"
            hint="Сума, яку комфортно відкладати"
          />
          <Field
            label="На скільки місяців?"
            value={input.months}
            onChange={(months) => change({ months })}
            min={1}
            max={360}
            step={1}
            suffix="міс."
          />
        </div>
        <div className="decision-start-bottom">
          <span>
            <ShieldCheck size={15} /> Без реєстрації. План на цьому пристрої.
          </span>
          {!ready ? (
            <button
              className="inline-link"
              onClick={() =>
                change({ capital: 100000, monthly: 5000, months: 12 })
              }
            >
              Спробувати на прикладі <ArrowRight size={16} />
            </button>
          ) : (
            <button
              className="inline-link"
              onClick={() => {
                change({ capital: 0, monthly: 0 });
                setSelected(null);
                setSavedId("");
              }}
            >
              <RotateCcw size={14} /> Очистити суми
            </button>
          )}
        </div>
      </Card>
      {input.purpose === "home" && (
        <Link href="/app/home" className="housing-entry">
          <span className="menu-icon">
            <Home size={24} />
          </span>
          <div>
            <strong>Накопичувати чи купувати вже?</strong>
            <p>
              Перший внесок, єОселя, оренда та інвестиції — в одному порівнянні.
            </p>
          </div>
          <ArrowRight size={21} />
        </Link>
      )}
      {!ready ? (
        <div className="decision-empty">
          <div className="decision-orb" aria-hidden="true">
            є
          </div>
          <h2>Почніть зі своєї суми</h2>
          <p>
            Навіть без щомісячного поповнення можна порівняти варіанти.
            Результат з’явиться тут одразу.
          </p>
          <div className="decision-promises">
            <span>Зрозумілі суми</span>
            <span>Умови й ризики</span>
            <span>Конкретний наступний крок</span>
          </div>
        </div>
      ) : (
        <>
          <div className="comparison-header">
            <div>
              <h2>Одна сума. Різні можливості.</h2>
              <p>
                Ви внесете {fmt(input.capital + input.monthly * input.months)}{" "}
                за {input.months} міс. Усі результати — сценарії з припущеннями
                нижче.
              </p>
            </div>
            <details className="scenario-options">
              <summary>
                Умови порівняння <ChevronDown size={16} />
              </summary>
              <Field
                label="Інфляція у вашому сценарії"
                value={inflation}
                onChange={(n) => edit("inflation", n)}
                min={-99}
                max={100}
                suffix="% / рік"
              />
              <label className="check">
                <input
                  type="checkbox"
                  checked={reinvest}
                  onChange={(e) => {
                    setReinvest(e.target.checked);
                    setSavedId("");
                  }}
                />{" "}
                Реінвестувати виплати
              </label>
              <label className="check">
                <input
                  type="checkbox"
                  checked={stress}
                  onChange={(e) => {
                    setStress(e.target.checked);
                    setSavedId("");
                  }}
                />{" "}
                Стрес: фонд без виплат, фонд і USD −20% на рік
              </label>
              <p>
                Це тест стійкості, а не прогноз. Інфляція та комісії початково 0
                — змініть їх для свого сценарію.
              </p>
            </details>
          </div>
          {stress && (
            <div className="notice">
              Показано стрес-сценарій. Його не можна читати як прогноз ринку.
            </div>
          )}
          <div className="comparison-grid">
            {kinds.map((kind) => {
              const Icon = icons[kind],
                r = projections[kind];
              const hasReference =
                kind === "bond"
                  ? !!refs.bond
                  : kind === "fund"
                    ? !!refs.fund
                    : kind === "fx"
                      ? !!fx
                      : true;
              return (
                <article
                  className={`comparison-card ${selected === kind ? "chosen" : ""}`}
                  key={kind}
                >
                  <div className="comparison-card-title">
                    <span className={`option-icon option-${kind}`}>
                      <Icon size={24} />
                    </span>
                    <div>
                      <h3>{titles[kind]}</h3>
                      <small>
                        {kind === "cash"
                          ? "База для порівняння"
                          : "Сценарій, не обіцянка"}
                      </small>
                    </div>
                  </div>
                  <span className="comparison-value-label">
                    {input.purpose === "income" &&
                    kind !== "cash" &&
                    kind !== "fx"
                      ? "Виплати наприкінці · середнє за місяць"
                      : `Разом через ${input.months} міс.`}
                  </span>
                  <strong className="comparison-value">
                    {fmt(
                      input.purpose === "income" &&
                        kind !== "cash" &&
                        kind !== "fx"
                        ? r.cashPerMonth
                        : r.total,
                    )}
                  </strong>
                  <div className="comparison-gain">
                    <span>
                      {r.gain >= 0 ? "+" : ""}
                      {fmt(r.gain)} до внесених грошей
                    </span>
                    <small>
                      Разом: {fmt(r.total)} · у цінах сьогодні: {fmt(r.real)}
                    </small>
                  </div>
                  <p className="comparison-source">
                    {hasReference
                      ? source(kind)
                      : "Перевірені дані джерела недоступні. Нульова ставка; введіть власну."}
                  </p>
                  <div className="comparison-tradeoff">
                    <strong>Доступ до грошей</strong>
                    <p>
                      {
                        {
                          cash: "Одразу. Купівельна спроможність залежить від інфляції.",
                          bond: "На погашенні. Продаж раніше — за доступною ринковою ціною; купони не обов’язково щомісячні.",
                          fund: "За правилами викупу. Ціна та дивіденди можуть змінитися; є ризики нерухомості й управління.",
                          deposit:
                            "За договором. Дострокове повернення може бути недоступним або зі втратою відсотків.",
                          fx: "Через обмін зі спредом. Валюта не платить відсотків і може подешевшати у гривні.",
                        }[kind]
                      }
                    </p>
                  </div>
                  {kind !== "cash" && (
                    <details className="option-assumptions">
                      <summary>
                        Змінити припущення <ChevronDown size={15} />
                      </summary>
                      {kind !== "fx" && (
                        <Field
                          label={`${titles[kind]}: грошові виплати на рік`}
                          value={r.assumptions.cashRate as number}
                          onChange={(n) => edit(`${kind}-cash`, n)}
                          max={100}
                          suffix="%"
                          hint={
                            kind === "bond"
                              ? "Орієнтир Мінфіну не дорівнює дохідності купівлі в брокера. Ставка реінвестування в моделі незмінна."
                              : kind === "fund"
                                ? "Остання історична виплата × 12. Майбутні виплати не гарантовані."
                                : "Ставка з вашої пропозиції, не середня ставка ринку"
                          }
                        />
                      )}
                      {(kind === "fund" || kind === "fx") && (
                        <Field
                          label={`${titles[kind]}: зміна вартості на рік`}
                          value={value(`${kind}-price`)}
                          onChange={(n) => edit(`${kind}-price`, n)}
                          min={-99}
                          max={100}
                          suffix="%"
                          hint="Ваше припущення. Не прогноз і не гарантоване хеджування."
                        />
                      )}
                      {kind !== "fx" && (
                        <Field
                          label={`${titles[kind]}: податок із виплат`}
                          value={value(`${kind}-tax`)}
                          onChange={(n) => edit(`${kind}-tax`, n)}
                          max={100}
                          suffix="%"
                        />
                      )}
                      <Field
                        label={`${titles[kind]}: витрати на вхід`}
                        value={value(`${kind}-entry`)}
                        onChange={(n) => edit(`${kind}-entry`, n)}
                        max={100}
                        suffix="%"
                      />
                      <Field
                        label={`${titles[kind]}: витрати на вихід`}
                        value={value(`${kind}-exit`)}
                        onChange={(n) => edit(`${kind}-exit`, n)}
                        max={100}
                        suffix="%"
                      />
                      {kind === "fund" && (
                        <Field
                          label="Inzhur REIT: річна комісія від капіталу"
                          value={value("fund-fee")}
                          onChange={(n) => edit("fund-fee", n)}
                          max={100}
                          suffix="%"
                          hint="Не враховуйте вдруге витрати, уже включені у виплату чи ціну."
                        />
                      )}
                      <p>
                        Модель нараховує виплати щомісяця за заданою ставкою та
                        поповнює в кінці місяця. Податок зі зростання ціни не
                        включений: задавайте чисту зміну вартості. Ціни
                        купівлі/продажу, цілі одиниці й договірний календар
                        перевірте окремо.
                      </p>
                    </details>
                  )}
                  <button
                    className={`button ${selected === kind ? "" : "outline"}`}
                    aria-pressed={selected === kind}
                    onClick={() => {
                      setSelected(kind);
                      setNextStep(next(kind));
                      setSavedId("");
                    }}
                  >
                    {selected === kind ? (
                      <Check size={17} />
                    ) : (
                      <ArrowRight size={17} />
                    )}
                    {selected === kind
                      ? "Варіант обрано"
                      : "Розібрати цей варіант"}
                  </button>
                </article>
              );
            })}
          </div>
          {selected && selectedResult && (
            <Card className="decision-result">
              <Badge kind="green">Ваше рішення — ваші умови</Badge>
              <h2>{titles[selected]}: що це означає для вас</h2>
              <p>
                У цьому сценарії до внесених {fmt(selectedResult.contributed)}{" "}
                додається {fmt(selectedResult.gain)}.{" "}
                {reinvest
                  ? "Виплати реінвестуються."
                  : `Виплати окремо: ${fmt(selectedResult.payouts)}; активи після виходу: ${fmt(selectedResult.finalAssets)}.`}{" "}
                {input.purpose === "income" &&
                  "Середньомісячний еквівалент не означає, що гроші надходитимуть щомісяця."}
              </p>
              <Chart
                series={selectedResult.rows.map((r) => ({
                  x: `${r.month} міс.`,
                  a: r.value,
                  b: input.capital + input.monthly * r.month,
                }))}
                labels={["Активи + виплати за сценарієм", "Ваші внески"]}
                caption="Порівняння сценарію з внесеними коштами"
              />
              <div className="next-step-box">
                <h3>Перед наступним кроком</h3>
                <p>
                  {next(selected)} Не вкладайте резерв у гроші, які можуть бути
                  недоступні до потрібної дати.
                </p>
                <label className="field">
                  <span>Мій наступний крок</span>
                  <textarea
                    aria-label="Мій наступний крок"
                    value={nextStep}
                    maxLength={500}
                    onChange={(e) => {
                      setNextStep(e.target.value);
                      setSavedId("");
                    }}
                  />
                </label>
              </div>
              <div className="form-actions">
                <button className="button" onClick={save}>
                  <Bookmark size={17} />
                  Зберегти мій план
                </button>
                <Link href="/app/plan" className="inline-link">
                  Мої збережені плани <ArrowRight size={16} />
                </Link>
                <Link
                  href={
                    {
                      cash: "/reserve-calculator",
                      bond: "/calculator-ovdp",
                      fund: "/inzhur-calculator",
                      deposit: "/deposit-calculator",
                      fx: "/currency",
                    }[selected]
                  }
                  className="inline-link"
                >
                  Перевірити детальний розрахунок <ArrowUpRight size={16} />
                </Link>
              </div>
              {savedId && (
                <p className="saved-feedback" role="status">
                  <Check size={16} /> План збережено на цьому пристрої.
                </p>
              )}
            </Card>
          )}
          <p className="comparison-note">
            Вищий результат у сценарії не означає кращий варіант для всіх.
            Строк, ризики, потреба у виплатах і доступ до грошей мають
            відповідати вашій задачі. Комісії й податки початково 0: перевірте
            їх перед рішенням.{" "}
            <Link href="/data-sources">Джерела та дати оновлення →</Link>
          </p>
        </>
      )}
    </>
  );
}
