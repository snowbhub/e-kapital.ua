"use client";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowUpRight,
  Building2,
  BriefcaseBusiness,
  Bookmark,
} from "lucide-react";
import { Field } from "./ui";
import { useCapital } from "./profile-context";
import { fmt, pct, num, today } from "@/lib/format";
import {
  automaticOptions,
  recentInflation,
  usableQuotes,
} from "@/lib/finance/automatic";
import { businessModel, rentalModel, fop2026 } from "@/lib/finance/ventures";
export function PropertyWorkspace() {
  return <VentureWorkspace kind="property" />;
}
export function BusinessWorkspace() {
  return <VentureWorkspace kind="business" />;
}
function VentureWorkspace({ kind }: { kind: "property" | "business" }) {
  const { state, market, persist } = useCapital();
  const resume = state.decision.plans.find(
    (p) => p.id === state.decision.resumeId && p.kind === kind,
  );
  const stored = resume?.assumptions ?? {};
  const number = (key: string, fallback = 0) =>
    typeof stored[key] === "number" ? (stored[key] as number) : fallback;
  const property = kind === "property";
  const [region, setRegion] = useState(String(stored.region ?? "Київ"));
  const [type, setType] = useState(
    String(stored.type ?? "Квартира під оренду"),
  );
  const [idea, setIdea] = useState(String(stored.idea ?? ""));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [numbers, setNumbers] = useState({
    investment: number("investment"),
    revenue: number("revenue"),
    expenses: number("expenses"),
    repair: number("repair"),
    fees: number("fees"),
    empty: number("empty", 1),
    saleChange: 0,
    saleFees: 0,
  });
  const [group, setGroup] = useState<"2" | "3">(
    stored.group === "2" ? "2" : "3",
  );
  const [drop, setDrop] = useState(number("salesDrop"));
  const [esvExempt, setEsvExempt] = useState(stored.esvExempt === true);
  const [months, setMonths] = useState(
    resume?.inputs.months ?? state.decision.inputs.months,
  );
  const [example, setExample] = useState(stored.example === true);
  const change = (key: keyof typeof numbers) => (n: number) => {
    setNumbers((v) => ({ ...v, [key]: n }));
  };
  const rental = rentalModel({
    price: numbers.investment,
    repair: numbers.repair,
    entryFees: numbers.fees,
    rent: numbers.revenue,
    upkeep: numbers.expenses,
    emptyMonths: numbers.empty,
    months,
    saleChange: numbers.saleChange,
    saleFees: numbers.saleFees,
  });
  const business = businessModel({
    investment: numbers.investment,
    revenue: numbers.revenue,
    expenses: numbers.expenses,
    group,
    months,
    esvExempt,
    salesDrop: drop,
  });
  const ready = numbers.investment > 0 && numbers.revenue > 0;
  const invested = property ? rental.investment : numbers.investment;
  const date = today();
  const alternative = automaticOptions(
    market,
    {
      capital: invested,
      monthly: 0,
      months,
      currency: "UAH",
      purpose: "grow",
    },
    date,
  ).winners.UAH;
  const cpi = recentInflation(market, date);
  const fx =
    state.decision.inputs.currency === "UAH"
      ? 1
      : usableQuotes(market, date).find(
          (q) => q.currency === state.decision.inputs.currency,
        )?.buy;
  const freeMoney =
    fx === undefined ? null : state.decision.inputs.capital * fx;
  const save = async () => {
    if (!ready || saving) return;
    setSaving(true);
    setMessage("");
    const success = await persist((s) => ({
      ...s,
      decision: {
        ...s.decision,
        plans: [
          ...s.decision.plans.slice(-29),
          {
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
            kind,
            name: property ? `${type} · ${region}` : idea || "Мій бізнес",
            inputs: { ...s.decision.inputs, months },
            assumptions: {
              mode: "venture",
              ...numbers,
              region,
              type,
              idea,
              group,
              salesDrop: drop,
              esvExempt,
              example,
              taxYear: 2026,
            },
            result: `${example ? "Навчальний приклад. " : ""}За внесеними умовами: ${fmt(property ? rental.monthlyNet : business.net)} чистими / міс. Не ринковий прогноз.`,
            nextStep: property
              ? "Перевірити право власності, реальну оренду, простій, повні витрати та воєнні ризики об’єкта."
              : "Перевірити попит, повні витрати, КВЕД, дозволену податкову групу й оборотні кошти перед запуском.",
            sourceDate: "2026-10-07",
          },
        ],
      },
    }));
    setSaving(false);
    setMessage(
      success ? "Проєкт збережено" : "Не вдалося зберегти. Спробуйте ще раз.",
    );
  };
  return (
    <div className="opportunity-app venture-app">
      <header className="opportunity-title">
        <div>
          <span className="micro-label">КОНКРЕТНИЙ ПРОЄКТ → РІШЕННЯ</span>
          <h1>{property ? "А якщо нерухомість?" : "А якщо свій бізнес?"}</h1>
          <p className="compact-note">
            {property
              ? "Порівняйте конкретний об’єкт, а не вигадану середню квартиру."
              : "Перевірте економіку задуму до того, як витратити гроші."}
          </p>
        </div>
        {property ? <Building2 size={32} /> : <BriefcaseBusiness size={32} />}
      </header>
      <div className="venture-context">
        {property ? (
          <>
            <label>
              Регіон
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
              >
                {[
                  "Київ",
                  "Львів",
                  "Одеса",
                  "Дніпро",
                  "Харків",
                  "Інший регіон",
                ].map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </label>
            <label>
              Що розглядаю
              <select value={type} onChange={(e) => setType(e.target.value)}>
                {["Квартира під оренду", "Комерційне приміщення"].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
            <Link href="/app/home" prefetch={false} className="button outline">
              Житло для себе / іпотека <ArrowUpRight size={16} />
            </Link>
          </>
        ) : (
          <>
            <label>
              Моя ідея
              <input
                placeholder="Наприклад: кав’ярня, сервіс, магазин"
                maxLength={100}
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
              />
            </label>
            <label>
              Податковий сценарій
              <select
                value={group}
                onChange={(e) => setGroup(e.target.value as "2" | "3")}
              >
                <option value="3">ФОП 3 · 5% без ПДВ + 1% ВЗ</option>
                <option value="2">ФОП 2 · максимальна місцева ставка</option>
              </select>
            </label>
          </>
        )}
      </div>
      <p className="compact-note">
        {property
          ? `${region} — позначка вашого проєкту, не рейтинг регіонів. Ціни та оренда з оголошень ще не підключені.`
          : "Маржинальність не взята «по галузі». Вкажіть виручку й усі витрати вашого задуму, включно з оплатою своєї роботи."}
      </p>
      <div className="venture-grid">
        <section className="venture-inputs">
          <h2>{property ? type : "Економіка мого задуму"}</h2>
          <Field
            label={property ? "Ціна об’єкта" : "Витрати на запуск"}
            value={numbers.investment}
            suffix="₴"
            onChange={change("investment")}
          />
          {property && (
            <>
              <Field
                label="Ремонт та обладнання"
                value={numbers.repair}
                suffix="₴"
                onChange={change("repair")}
              />
              <Field
                label="Разові витрати на купівлю"
                value={numbers.fees}
                suffix="₴"
                onChange={change("fees")}
              />
            </>
          )}
          <Field
            label={property ? "Орендна плата за місяць" : "Виручка за місяць"}
            value={numbers.revenue}
            suffix="₴"
            onChange={change("revenue")}
          />
          <Field
            label={
              property
                ? "Утримання та ремонт за місяць"
                : "Усі операційні витрати за місяць"
            }
            value={numbers.expenses}
            suffix="₴"
            onChange={change("expenses")}
          />
          {property ? (
            <Field
              label="Місяців без орендаря за рік"
              value={numbers.empty}
              min={0}
              max={12}
              step={1}
              onChange={change("empty")}
            />
          ) : (
            <>
              <label className="exemption">
                <input
                  type="checkbox"
                  checked={esvExempt}
                  onChange={(e) => setEsvExempt(e.target.checked)}
                />
                Маю підтверджене звільнення від ЄСВ
              </label>
              <div className="pill-switch" aria-label="Падіння виручки">
                {[0, 20, 40].map((d) => (
                  <button
                    key={d}
                    aria-pressed={drop === d}
                    onClick={() => setDrop(d)}
                  >
                    {d ? `Виручка −${d}%` : "Мій план"}
                  </button>
                ))}
              </div>
            </>
          )}
          <div className="pill-switch" aria-label="Строк проєкту">
            {[12, 36, 60, 120].map((m) => (
              <button
                key={m}
                aria-pressed={months === m}
                onClick={() => setMonths(m)}
              >
                {m / 12} {m === 12 ? "рік" : m === 36 ? "роки" : "років"}
              </button>
            ))}
          </div>
          <button
            className="text-button"
            onClick={() => {
              setNumbers(
                property
                  ? {
                      investment: 1800000,
                      revenue: 15000,
                      expenses: 1500,
                      repair: 300000,
                      fees: 50000,
                      empty: 1,
                      saleChange: 0,
                      saleFees: 0,
                    }
                  : {
                      investment: 200000,
                      revenue: 80000,
                      expenses: 60000,
                      repair: 0,
                      fees: 0,
                      empty: 1,
                      saleChange: 0,
                      saleFees: 0,
                    },
              );
              setExample(true);
            }}
          >
            Підставити навчальний приклад
          </button>
        </section>
        <section className="outcome-stage">
          <span className="micro-label">
            {example
              ? "НАВЧАЛЬНИЙ ПРИКЛАД, НЕ РИНКОВІ ДАНІ"
              : "ЗА ВАШИМИ ПРИПУЩЕННЯМИ"}
          </span>
          <h2>
            {property ? "Чистий орендний дохід" : "Що залишається щомісяця"}
          </h2>
          <div
            className={`outcome-number ${(property ? rental.monthlyNet : business.net) < 0 ? "is-negative" : ""}`}
          >
            {ready ? fmt(property ? rental.monthlyNet : business.net) : "—"}
          </div>
          <p>Після врахованих витрат і податків · гривня</p>
          {ready ? (
            <>
              <div className="venture-results">
                <div>
                  <span>Окупність грошовими виплатами</span>
                  <strong>
                    {property
                      ? rental.payback !== null
                        ? `${num(rental.payback, 1)} років`
                        : "Не окупається"
                      : business.payback !== null
                        ? `${Math.ceil(business.payback)} міс.`
                        : "Не окупається"}
                  </strong>
                </div>
                <div>
                  <span>
                    {property ? "Чиста орендна дохідність" : "Чиста маржа"}
                  </span>
                  <strong>
                    {property
                      ? rental.netYield !== null
                        ? pct(rental.netYield)
                        : "—"
                      : business.margin !== null
                        ? pct(business.margin)
                        : "—"}
                  </strong>
                </div>
                <div>
                  <span>
                    {property
                      ? `Орендний дохід за ${months / 12} років`
                      : `Грошовий результат за ${months / 12} років, мінус запуск`}
                  </span>
                  <strong>
                    {fmt(property ? rental.income : business.totalCash)}
                  </strong>
                </div>
                {!property && (
                  <>
                    <div>
                      <span>Виручка для виходу в нуль / міс.</span>
                      <strong>{fmt(business.breakEven)}</strong>
                    </div>
                    <div>
                      <span>Податки та ЄСВ / міс. за правилами 2026</span>
                      <strong>{fmt(business.taxes)}</strong>
                    </div>
                  </>
                )}
                {freeMoney !== null && invested > freeMoney && (
                  <div>
                    <span>Бракує до вашої вільної суми</span>
                    <strong>{fmt(invested - freeMoney)}</strong>
                  </div>
                )}
                {alternative && (
                  <div>
                    <span>
                      Альтернатива: ті самі кошти на депозиті, умовний дохід за
                      строк
                    </span>
                    <strong>{fmt(alternative.income)}</strong>
                  </div>
                )}
                {property && cpi && (
                  <div>
                    <span>Оцінка об’єкта + оренда, у цінах сьогодні*</span>
                    <strong>
                      {fmt(
                        rental.total /
                          Math.pow(1 + cpi.rate / 100, months / 12),
                      )}
                    </strong>
                  </div>
                )}
              </div>
              {!property && business.overLimit && (
                <p role="alert">
                  Річний дохід перевищує ліміт обраної групи. Цей податковий
                  сценарій не підходить.
                </p>
              )}
              <p className="stage-foot">
                Це економіка конкретного припущення, не рекомендація і не оцінка
                ринкової ціни.
              </p>
            </>
          ) : (
            <p>
              Додайте ціну / запуск і очікуваний місячний дохід. Не рахуємо
              прибуток без вихідних даних.
            </p>
          )}
        </section>
      </div>
      <section className="action-dock">
        {ready && (
          <>
            <button
              className="button outline"
              disabled={saving || (!property && business.overLimit)}
              onClick={save}
            >
              <Bookmark size={16} />
              {saving ? "Зберігаємо…" : "Зберегти проєкт"}
            </button>
            {message && <p role="status">{message}</p>}
          </>
        )}
        <h2>Що перевірити перед рішенням</h2>
        <p>
          {property
            ? "Право власності, стан і ремонт, попит на оренду, простій, місцеві майнові податки, воєнні ризики, вартість продажу."
            : "Попит і конкуренцію, сезонність, оборотні кошти, дозволи, КВЕД, ліміт групи, РРО/ПРРО та оплату своєї роботи."}
        </p>
        <details>
          <summary>Що включено і що ще невідомо</summary>
          {alternative && (
            <p>
              Альтернатива: {alternative.title}, {pct(alternative.offer!.rate)}{" "}
              до податку, {pct(alternative.netRate)} після податку. Умови{" "}
              {alternative.sourceDate}; майбутні повторні вклади за цією самою
              ставкою не гарантовані. Це лише депозитний орієнтир, не
              автоматичний висновок про перевагу бізнесу чи нерухомості.{" "}
              <a
                href={alternative.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Умови банку
              </a>
              .
            </p>
          )}
          {property && (
            <p>
              *Ціна об’єкта незмінна, ремонт не доданий до оцінки продажу,
              орендні виплати накопичуються без доходу. Витрати і податки
              продажу тут не враховані — це не сума, яку гарантовано можна
              вивести. Історичний CPI останніх 12 місяців повторюється лише як
              умова, не як прогноз.
            </p>
          )}
          <p>
            {property
              ? "Оренда фізособою-резидентом: 18% ПДФО + 5% військового збору з орендної виручки. Модель без кредиту. Окупність — лише орендними виплатами, без продажу; оцінка зростання ціни не вигадана. Податок на нерухомість, землю, страховку, управління й ремонти включіть до витрат самі за конкретним об’єктом. ФОП-оренда та нерезидентські податки не моделюються."
              : `У моделі ФОП 3 без ПДВ: 5% єдиного податку + 1% ВЗ з виручки, ЄСВ ${fmt(fop2026.minimumEsv)} / міс., якщо немає підтвердженого звільнення. ФОП 2: максимум ${fmt(fop2026.group2Max)} ЄП + ${fmt(fop2026.militaryFixed)} ВЗ + ЄСВ. Це не автоматичний підбір дозволеної групи: обмеження діяльності й контрагентів перевіряються окремо. ПДВ, працівники та їхні податки не розраховані окремо — включіть повні витрати персоналу в поле витрат.`}
          </p>
          <p>
            Ставки 2026 року повторюються протягом горизонту лише як припущення.
            Майбутні податки, інфляція, курси й ринкові витрати можуть
            змінитися. Грошовий результат бізнесу не включає невідому ціну його
            продажу.
          </p>
          <a
            href={
              property
                ? "https://rv.tax.gov.ua/deklaratsiyna-kampaniya-2026/informatsiyni-povidomlennya/print-1047451.html"
                : fop2026.source
            }
            target="_blank"
            rel="noopener noreferrer"
          >
            ДПС — податки та правила
          </a>
          {!property && (
            <>
              {" "}
              ·{" "}
              <a
                href={fop2026.esvSource}
                target="_blank"
                rel="noopener noreferrer"
              >
                ЄСВ 2026
              </a>
            </>
          )}
        </details>
        {!property && (
          <div className="dock-buttons">
            <a
              className="button"
              href="https://diia.gov.ua/services/reyestraciya-fop"
              target="_blank"
              rel="noopener noreferrer"
            >
              Відкрити ФОП у Дії
              <ArrowUpRight size={16} />
            </a>
            <a
              className="button outline"
              href="https://kved.ukrstat.gov.ua/KVED2010/kv10_i.html"
              target="_blank"
              rel="noopener noreferrer"
            >
              Перевірити КВЕД
            </a>
          </div>
        )}
        <Link href="/app" prefetch={false}>
          Повернутися до варіантів капіталу
        </Link>
      </section>
    </div>
  );
}
