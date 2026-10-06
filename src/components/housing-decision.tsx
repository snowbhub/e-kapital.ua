"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Bookmark, Check, Home, ChevronDown } from "lucide-react";
import { Card, Field, Select, Badge, Chart } from "./ui";
import { useCapital } from "./profile-context";
import { compareHousing, decisionReferences } from "@/lib/finance/decision";
import { fmt, dateFmt, today, pct } from "@/lib/format";

export function HousingDecision() {
  const { state, update, market } = useCapital();
  const input = state.decision.inputs,
    terms = market.eoselia;
  const resume = state.decision.plans.find(
    (p) => p.id === state.decision.resumeId && p.kind === "housing",
  );
  const n = (key: string, fallback = 0) =>
    typeof resume?.assumptions[key] === "number"
      ? (resume.assumptions[key] as number)
      : fallback;
  const [price, setPrice] = useState(n("price")),
    [rent, setRent] = useState(n("rent"));
  const [age, setAge] = useState(n("age", 30)),
    [years, setYears] = useState(n("years", 20));
  const [category, setCategory] = useState(
    String(resume?.assumptions.category ?? "other"),
  );
  const [downOverride, setDown] = useState<number | null>(
    resume ? n("down") : null,
  );
  const [fees, setFees] = useState(n("fees")),
    [upkeep, setUpkeep] = useState(n("upkeep"));
  const [houseGrowth, setHouseGrowth] = useState(n("houseGrowth")),
    [rentGrowth, setRentGrowth] = useState(n("rentGrowth"));
  const [investmentMode, setInvestmentMode] = useState(
      resume ? "custom" : "cash",
    ),
    [customRate, setRate] = useState(n("investmentRate"));
  const [cashYield, setCashYield] = useState(n("cashYield")),
    [stress, setStress] = useState(Boolean(resume?.assumptions.stress));
  const [choice, setChoice] = useState(
      String(resume?.assumptions.choice ?? "wait"),
    ),
    [nextStep, setNextStep] = useState(resume?.nextStep ?? "");
  const [saved, setSaved] = useState(false);
  const reference = decisionReferences(market, today());
  const rate = stress
    ? 0
    : investmentMode === "bond"
      ? (reference.bond?.publishedRate ?? 0)
      : investmentMode === "custom"
        ? customRate
        : 0;
  const subsidized =
    terms?.categories.find((c) => c.id === category)?.subsidized ?? false;
  const minimum =
    (price *
      (terms
        ? age <= terms.youthMaxAge
          ? terms.youthDownPayment
          : terms.downPayment
        : 0)) /
    100;
  const down = downOverride ?? minimum;
  const params = {
    ...input,
    price,
    rent,
    age,
    years,
    subsidized,
    down,
    fees,
    upkeep,
    houseGrowth,
    rentGrowth,
    investmentRate: rate,
  };
  const r = compareHousing(params, terms);
  const startingInvestments = Math.max(0, input.capital - down - fees);
  const monthlyIncome = (startingInvestments * (stress ? 0 : cashYield)) / 1200;
  const incomeGap = r ? Math.max(0, r.loan.firstPayment - monthlyIncome) : 0;
  const requiredCapital =
    !stress && cashYield > 0
      ? ((r?.loan.firstPayment ?? 0) * 1200) / cashYield
      : null;
  const change = (part: Partial<typeof input>) => {
    update((s) => ({
      ...s,
      decision: { ...s.decision, inputs: { ...s.decision.inputs, ...part } },
    }));
    setSaved(false);
  };
  const set = (fn: (n: number) => void) => (n: number) => {
    fn(n);
    setSaved(false);
  };
  const feasible = r?.eligible && !r.buyDeficit;
  const next =
    choice === "wait"
      ? "Порівняти інструменти до дати першого внеску та перевірити їхню ліквідність."
      : "Перевірити право на єОселю, отримати пропозицію банку й уточнити всі витрати та резерв на платежі.";
  function save() {
    if (!r) return;
    update((s) => ({
      ...s,
      decision: {
        ...s.decision,
        plans: [
          ...s.decision.plans.slice(-29),
          {
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
            kind: "housing",
            name:
              choice === "wait"
                ? "Накопичувати на житло"
                : "Перевірити іпотеку",
            inputs: { ...input, purpose: "home" },
            assumptions: {
              ...params,
              category,
              choice,
              cashYield,
              investmentMode,
              stress,
              referenceIsin: reference.bond?.isin ?? "",
              referenceRateDate: reference.bond?.lastPlacement ?? "",
              investmentRate: rate,
            },
            result: `Через ${input.months} міс.: оренда + накопичення ${fmt(r.waitNet)}; іпотека ${r.buyNet === null ? "недоступна за введеними даними" : fmt(r.buyNet)} чистого капіталу. Платіж ${fmt(r.loan.firstPayment)} → ${fmt(r.loan.laterPayment)}. Дефіцит фінансування: ${fmt(r.buyDeficit)}.`,
            nextStep: nextStep.trim() || next,
            sourceDate: terms!.meta.effectiveDate,
          },
        ],
      },
    }));
    setSaved(true);
  }
  return (
    <>
      <div className="decision-heading">
        <Badge kind="green">Житло та ваші гроші</Badge>
        <h1>
          Накопичувати
          <br />
          чи купувати вже?
        </h1>
        <p>
          Порівняйте оренду з накопиченням та іпотеку із вкладенням залишку.
          Один бюджет — два шляхи.
        </p>
      </div>
      {resume && (
        <div className="notice">
          Завантажено план «{resume.name}» від{" "}
          {dateFmt(resume.createdAt.slice(0, 10))}. Інвестиційна ставка
          відновлена як власне припущення; кредитні умови перевіряються за
          поточними даними.{" "}
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
        <div className="form-grid">
          <Field
            label="Мої гроші на житло (без резерву)"
            value={input.capital}
            onChange={(capital) => change({ capital })}
            suffix="₴"
          />
          <Field
            label="Можу відкладати крім оренди"
            value={input.monthly}
            onChange={(monthly) => change({ monthly })}
            suffix="₴"
          />
          <Field
            label="Порівняти через скільки місяців?"
            value={input.months}
            onChange={(months) => change({ months })}
            min={1}
            max={360}
            step={1}
            suffix="міс."
          />
        </div>
        <div className="form-grid two">
          <Field
            label="Вартість бажаного житла"
            value={price}
            onChange={set(setPrice)}
            suffix="₴"
          />
          <Field
            label="Моя оренда на місяць"
            value={rent}
            onChange={set(setRent)}
            suffix="₴"
            hint="Разом із накопиченням це спільний бюджет обох шляхів"
          />
        </div>
        <details className="housing-assumptions">
          <summary>
            Умови іпотеки та сценарію <ChevronDown size={17} />
          </summary>
          <p>
            Початкові припущення: вік 30, строк 20 років, звичайна ставка
            єОселі, мінімальний внесок, дохідність і додаткові витрати 0.
            Змініть на свої дані.
          </p>
          <div className="form-grid">
            <Field
              label="Вік у сценарії житла"
              value={age}
              onChange={set(setAge)}
              min={18}
              max={100}
              step={1}
            />
            <Select
              label="Категорія єОселі"
              value={category}
              onChange={(v) => {
                setCategory(v);
                setSaved(false);
              }}
              options={
                terms?.categories.map((c) => ({
                  value: c.id,
                  label: c.name,
                })) ?? [{ value: "other", label: "Умови недоступні" }]
              }
            />
            <Field
              label="Строк іпотеки"
              value={years}
              onChange={set(setYears)}
              min={1}
              max={30}
              step={1}
              suffix="років"
            />
            <Field
              label="Мій перший внесок"
              value={down}
              onChange={set((n) => setDown(n))}
              suffix="₴"
              hint="Початково — мінімальний внесок за програмою"
            />
            <Field
              label="Разові витрати на купівлю"
              value={fees}
              onChange={set(setFees)}
              suffix="₴"
              hint="Комісії, нотаріус, оцінка, збори та ремонт за потреби"
            />
            <Field
              label="Витрати власника на місяць"
              value={upkeep}
              onChange={set(setUpkeep)}
              suffix="₴"
              hint="Страхування, утримання та інші витрати понад кредит"
            />
            <Select
              label="Гроші поки очікую та залишок після купівлі"
              value={investmentMode}
              onChange={(v) => {
                setInvestmentMode(v);
                setSaved(false);
              }}
              options={[
                { value: "cash", label: "Без інвестиційного доходу" },
                { value: "bond", label: "Сценарій за орієнтиром Мінфіну" },
                { value: "custom", label: "Власна чиста дохідність" },
              ]}
            />
            {investmentMode === "custom" && (
              <Field
                label="Чиста дохідність інвестицій на рік"
                value={customRate}
                onChange={set(setRate)}
                min={-99}
                max={100}
                suffix="%"
                hint="Після податків, комісій і витрат на обмін"
              />
            )}
            <Field
              label="Зміна ціни житла на рік"
              value={houseGrowth}
              onChange={set(setHouseGrowth)}
              min={-99}
              max={100}
              suffix="%"
            />
            <Field
              label="Зростання оренди на рік"
              value={rentGrowth}
              onChange={set(setRentGrowth)}
              min={-99}
              max={100}
              suffix="%"
            />
          </div>
          <button
            type="button"
            className="inline-link"
            onClick={() => {
              setDown(null);
              setSaved(false);
            }}
          >
            Повернути мінімальний внесок за програмою
          </button>
        </details>
      </Card>
      {!terms && (
        <div className="notice">
          Перевірені умови єОселі недоступні. Порівняння іпотеки не підставляє
          довільні ставки.
        </div>
      )}
      {terms && (
        <div className="housing-terms">
          <Home size={18} />
          <span>
            єОселя:{" "}
            {subsidized
              ? terms.subsidized.join(" → ")
              : terms.standard.join(" → ")}
            % · зміна після {terms.changeAfterMonths / 12} років ·{" "}
            {dateFmt(terms.meta.effectiveDate)}.{" "}
            <a
              href={terms.meta.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Перевірити умови →
            </a>
          </span>
        </div>
      )}
      {!r ? (
        <div className="decision-empty">
          <div className="decision-orb" aria-hidden="true">
            <Home size={50} />
          </div>
          <h2>Скільки коштує ваше житло?</h2>
          <p>
            Введіть вартість, свої гроші та оренду. Тут з’явиться порівняння
            двох шляхів.
          </p>
        </div>
      ) : (
        <>
          <Card className="housing-verdict">
            <Badge kind={feasible ? "green" : "warning"}>
              За введеними умовами
            </Badge>
            <h2>
              {!r.eligible
                ? "Спочатку перевірте можливість купівлі"
                : r.buyDeficit > 0
                  ? "У сценарії іпотеки виникає нестача грошей"
                  : r.firstSurplus < 0
                    ? "Платіж перевищує ваш місячний бюджет"
                    : "Обидва шляхи можна порівнювати"}
            </h2>
            <p>
              {r.gap > 0
                ? `На внесок і разові витрати бракує ${fmt(r.gap)}. `
                : ""}
              {down < r.minimum
                ? `Внесок нижчий за мінімальний ${fmt(r.minimum)}. `
                : ""}
              {down > price ? "Внесок більший за ціну житла. " : ""}
              {age > terms!.maxAge ? "Вік перевищує межу програми. " : ""}
              Доступний строк у моделі: {r.years} років. Це оцінка сценарію, не
              підтвердження кредиту банком.
            </p>
          </Card>
          <div className="housing-paths">
            <Card>
              <Badge>Шлях 1</Badge>
              <h2>Орендувати й накопичувати</h2>
              <span className="comparison-value-label">
                Чисті гроші через {input.months} міс.
              </span>
              <strong className="comparison-value">{fmt(r.waitNet)}</strong>
              <p>
                Без придбаного житла. Початковий капітал зберігається, оренда
                оплачується зі спільного бюджету {fmt(r.budget)} / міс.
              </p>
              <dl>
                <div>
                  <dt>На мінімальний внесок за моделлю</dt>
                  <dd>
                    {r.waitMonths === null
                      ? "Не накопичується в цьому горизонті"
                      : r.waitMonths === 0
                        ? "Вже вистачає"
                        : `Через ${r.waitMonths} міс.`}
                  </dd>
                </div>
                <div>
                  <dt>Сценарна чиста дохідність</dt>
                  <dd>{pct(rate)}</dd>
                </div>
                <div>
                  <dt>Нефінансовані витрати</dt>
                  <dd>{fmt(r.waitDeficit)}</dd>
                </div>
              </dl>
            </Card>
            <Card>
              <Badge>Шлях 2</Badge>
              <h2>Іпотека + вкладення залишку</h2>
              <span className="comparison-value-label">
                Житло мінус борг + гроші через {input.months} міс.
              </span>
              <strong className="comparison-value">
                {r.buyNet === null ? "Недоступно" : fmt(r.buyNet)}
              </strong>
              <p>
                Внесок {fmt(down)} і разові витрати {fmt(fees)} віднімаються
                одразу. Початковий залишок для інвестицій:{" "}
                {fmt(startingInvestments)}.
              </p>
              <dl>
                <div>
                  <dt>Платіж на початку → після зміни ставки</dt>
                  <dd>
                    {fmt(r.loan.firstPayment)} → {fmt(r.loan.laterPayment)}
                  </dd>
                </div>
                <div>
                  <dt>Залишок місячного бюджету на початку</dt>
                  <dd>{fmt(r.firstSurplus)}</dd>
                </div>
                <div>
                  <dt>Борг наприкінці порівняння</dt>
                  <dd>{fmt(r.debt)}</dd>
                </div>
                <div>
                  <dt>Нефінансовані витрати</dt>
                  <dd>{fmt(r.buyDeficit)}</dd>
                </div>
              </dl>
            </Card>
          </div>
          {r.buyNet !== null && (
            <Card>
              <h2>Як змінюється картина</h2>
              <Chart
                series={r.rows.map((p) => ({
                  x: `${p.month} міс.`,
                  a: p.wait,
                  b: p.buy ?? 0,
                }))}
                labels={["Оренда + накопичення", "Житло − борг + інвестиції"]}
                caption="Чистий капітал двох шляхів за однакового бюджету"
              />
              <p className="comparison-note">
                Різниця у цьому сценарії: {fmt(Math.abs(r.buyNet - r.waitNet))}{" "}
                на користь {r.buyNet >= r.waitNet ? "іпотеки" : "накопичення"}.
                Це не універсальна рекомендація: ціна житла, дохідність і
                витрати можуть змінитися. Продаж житла, його ліквідність та
                витрати на продаж не включені.
              </p>
            </Card>
          )}
          <Card className="coverage-card">
            <Badge kind="scenario">Окрема перевірка грошових виплат</Badge>
            <h2>Чи можуть інвестиції покривати іпотеку?</h2>
            <p>
              Зростання ціни активу не оплачує кредит. Тут рахуємо тільки
              виплати після податків і комісій із початкового залишку{" "}
              {fmt(startingInvestments)}.
            </p>
            <Field
              label="Чиста дохідність грошових виплат"
              value={cashYield}
              onChange={set(setCashYield)}
              max={100}
              suffix="% / рік"
              hint="Ваше припущення, не загальна дохідність із ростом ціни"
            />
            <div className="metrics">
              <div className="metric">
                <span>Виплати · середнє на місяць</span>
                <strong>{fmt(monthlyIncome)}</strong>
              </div>
              <div className="metric">
                <span>Бракує до першого платежу</span>
                <strong>{fmt(incomeGap)}</strong>
              </div>
              <div className="metric">
                <span>Капітал для повного покриття</span>
                <strong>
                  {requiredCapital === null
                    ? "Введіть ставку виплат"
                    : fmt(requiredCapital)}
                </strong>
              </div>
            </div>
            <label className="check">
              <input
                type="checkbox"
                checked={stress}
                onChange={(e) => {
                  setStress(e.target.checked);
                  setSaved(false);
                }}
              />{" "}
              Перевірити без інвестиційного доходу та виплат
            </label>
            <p className="comparison-note">
              Кредит сплачується за графіком навіть без доходу від інвестицій.
              Усереднена виплата не дорівнює щомісячному надходженню. Ця
              перевірка окрема від моделі капіталу вище: виплати не віднімаються
              від кредиту вдруге.
            </p>
          </Card>
          <Card className="decision-result">
            <h2>Який наступний крок вам підходить?</h2>
            <div
              className="purpose-tabs"
              role="group"
              aria-label="Мій шлях до житла"
            >
              <button
                aria-pressed={choice === "wait"}
                onClick={() => {
                  setChoice("wait");
                  setSaved(false);
                }}
              >
                Накопичувати й перевірити інструменти
              </button>
              <button
                aria-pressed={choice === "buy"}
                onClick={() => {
                  setChoice("buy");
                  setSaved(false);
                }}
              >
                Перевірити іпотеку з банком
              </button>
            </div>
            <p>{next}</p>
            <label className="field">
              <span>Мій наступний крок щодо житла</span>
              <textarea
                aria-label="Мій наступний крок щодо житла"
                value={nextStep}
                maxLength={500}
                placeholder={next}
                onChange={(e) => {
                  setNextStep(e.target.value);
                  setSaved(false);
                }}
              />
            </label>
            <div className="form-actions">
              <button className="button" onClick={save}>
                <Bookmark size={17} /> Зберегти план житла
              </button>
              <Link
                className="inline-link"
                href={choice === "wait" ? "/app" : "/eoselia"}
              >
                {choice === "wait" ? "Порівняти інвестиції" : "Деталі єОселі"}
                <ArrowRight size={16} />
              </Link>
            </div>
            {saved && (
              <p role="status" className="saved-feedback">
                <Check size={16} /> План житла збережено.
              </p>
            )}
          </Card>
          <div className="comparison-note">
            <strong>Що важливо для рішення.</strong> Умови кредиту перевіряє
            банк; придатність конкретного житла модель не визначає. Внесіть
            комісії, страхування та утримання. Дохідність реінвестування в
            сценарії стала; конкретні ОВДП мають строк погашення й ціну брокера.
            Валюта сама по собі не забезпечує покриття гривневого платежу.{" "}
            {investmentMode === "bond" && reference.bond
              ? `Орієнтир: ${reference.bond.isin}, останнє розміщення ${dateFmt(reference.bond.lastPlacement ?? reference.bond.meta.effectiveDate)}. `
              : ""}
            <Link href="/data-sources">Джерела →</Link>
          </div>
        </>
      )}
    </>
  );
}
