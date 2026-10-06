"use client";
import { useHistory } from "@/lib/data/use-history";
import { useEffect, useState } from "react";
import { Field, Select, TextField, Tip, Badge, Chart } from "./ui";
import { fmt, num, pct, today, dateFmt } from "@/lib/format";
import {
  deposit,
  metal,
  mortgage,
  requiredCashCapital,
  growth,
  inflationAdjusted,
  bondPurchase,
  goalMonths,
  addMonths,
  annualCpi,
} from "@/lib/finance/calculations";
import type {
  Eoselia,
  MarketBond,
  MarketFund,
  Market,
} from "@/lib/data/schema";
import { emptyMarket } from "@/lib/data/schema";
export function EoseliaCalculator({
  terms,
  onGoal,
}: {
  terms: Eoselia | null;
  onGoal?: (amount: number) => void;
}) {
  const [price, setPrice] = useState(0),
    [age, setAge] = useState(18),
    [category, setCategory] = useState("other"),
    [down, setDown] = useState(0),
    [years, setYears] = useState(20),
    [fees, setFees] = useState(0);
  const c = terms?.categories.find((c) => c.id === category),
    maxYears = terms
      ? Math.min(terms.maxYears, Math.max(0, terms.maxAge - age))
      : 0;
  const minimum = terms
    ? (price *
        (age <= terms.youthMaxAge
          ? terms.youthDownPayment
          : terms.downPayment)) /
      100
    : 0;
  const principal = Math.max(0, price - down),
    rates = c?.subsidized ? terms?.subsidized : terms?.standard;
  const term = Math.min(years, maxYears);
  const result =
    rates && term >= 1
      ? mortgage(principal, term * 12, [
          { fromMonth: 1, annualRate: rates[0] / 100 },
          {
            fromMonth: (terms?.changeAfterMonths ?? 120) + 1,
            annualRate: rates[1] / 100,
          },
        ])
      : null;
  return (
    <>
      <div className="form-grid">
        <Field
          label="Вартість житла"
          value={price}
          onChange={setPrice}
          suffix="₴"
        />
        <Field
          label="Ваш вік на дату кредиту"
          value={age}
          onChange={setAge}
          min={18}
          max={100}
          step={1}
        />
        <Select
          label="Категорія заявника"
          value={category}
          onChange={setCategory}
          options={
            terms?.categories.map((c) => ({ value: c.id, label: c.name })) || [
              { value: "other", label: "Дані програми недоступні" },
            ]
          }
        />
        <Field
          label="Запланований перший внесок"
          value={down}
          onChange={setDown}
          suffix="₴"
        />
        <Field
          label="Бажаний строк кредиту"
          value={years}
          onChange={setYears}
          min={1}
          max={30}
          step={1}
          suffix="років"
        />
        <Field
          label="Додаткові витрати (ваша оцінка)"
          value={fees}
          onChange={setFees}
          suffix="₴"
          hint="Оцінка, нотаріус, страхування, банківські комісії"
        />
      </div>
      {!terms ? (
        <div className="notice">
          Актуальні умови єОселі тимчасово недоступні. Калькулятор не підставляє
          неперевірені ставки.
        </div>
      ) : (
        <>
          <div className="assumption">
            Поточні умови · {dateFmt(terms.meta.effectiveDate)} ·{" "}
            {terms.meta.source}. Ставка {rates?.[0]}% у перші{" "}
            {terms.changeAfterMonths / 12} років → {rates?.[1]}% далі. Для
            введеного віку доступний строк до {maxYears} років.
          </div>
          {down < minimum && price > 0 && (
            <div className="notice" style={{ marginTop: 15 }}>
              Запланований внесок менший від мінімального на{" "}
              {fmt(minimum - down)}. Розрахунок нижче показує ваш сценарій із
              введеним внеском.
            </div>
          )}
          {down > price && (
            <div className="notice">
              Внесок перевищує вартість житла. Сума кредиту дорівнює нулю.
            </div>
          )}
          <div className="metrics">
            <div className="metric">
              <span>Мінімальний внесок</span>
              <strong>{fmt(minimum)}</strong>
            </div>
            <div className="metric">
              <span>Сума кредиту</span>
              <strong>{fmt(principal)}</strong>
            </div>
            <div className="metric">
              <span>Платіж на початку</span>
              <strong>{result ? fmt(result.firstPayment) : "—"}</strong>
            </div>
            <div className="metric">
              <span>Платіж після зміни ставки</span>
              <strong>{result ? fmt(result.laterPayment) : "—"}</strong>
            </div>
            <div className="metric">
              <span>Усі кредитні платежі</span>
              <strong>{result ? fmt(result.total) : "—"}</strong>
            </div>
            <div className="metric">
              <span>Відсотки за весь строк</span>
              <strong>{result ? fmt(result.interest) : "—"}</strong>
            </div>
          </div>
          {result && price > 0 && (
            <Chart
              series={result.rows
                .filter((_, i) => i % 12 === 0 || i === result.rows.length - 1)
                .map((r) => ({
                  x: `${Math.ceil(r.month / 12)} рік`,
                  a: r.balance,
                }))}
              labels={["Залишок кредиту"]}
              caption="Залишок кредиту за ануїтетним графіком зі зміною ставки"
            />
          )}
          {onGoal && (
            <button
              className="button outline small"
              disabled={minimum === 0}
              onClick={() => onGoal(minimum + fees)}
            >
              Створити ціль на перший внесок
            </button>
          )}
          <Tip title="Що ще враховує банк?">
            Вік, підтверджений дохід, категорію, площу та вартість житла, рік
            введення будинку в експлуатацію та власне житло сім’ї. Цей
            розрахунок використовує ануїтет; банк може застосовувати інший
            графік. Страхування, оцінка, нотаріус та комісії не включені у
            кредитні платежі.{" "}
            {fees > 0 ? `Ви окремо ввели додаткові витрати ${fmt(fees)}.` : ""}
          </Tip>
        </>
      )}
    </>
  );
}
export function SavingCalculator() {
  const [target, setTarget] = useState(0),
    [current, setCurrent] = useState(0),
    [monthly, setMonthly] = useState(0),
    [scenario, setScenario] = useState(false),
    [rate, setRate] = useState(0);
  const m = goalMonths(target, current, monthly, scenario ? rate / 100 : 0);
  return (
    <>
      <div className="form-grid">
        <Field
          label="Цільова сума"
          value={target}
          onChange={setTarget}
          suffix="₴"
        />
        <Field
          label="Вже накопичено"
          value={current}
          onChange={setCurrent}
          suffix="₴"
        />
        <Field
          label="Щомісячний внесок"
          value={monthly}
          onChange={setMonthly}
          suffix="₴"
        />
      </div>
      <label className="check">
        <input
          type="checkbox"
          checked={scenario}
          onChange={(e) => setScenario(e.target.checked)}
        />
        Додати власний інвестиційний сценарій
      </label>
      {scenario && (
        <Field
          label="Ваше припущення, % річних"
          value={rate}
          onChange={setRate}
          min={-99}
          max={100}
        />
      )}
      <div className="metrics">
        <div className="metric">
          <span>Залишилось</span>
          <strong>{fmt(Math.max(0, target - current))}</strong>
        </div>
        <div className="metric">
          <span>Місяців</span>
          <strong>{m ?? "—"}</strong>
        </div>
        <div className="metric">
          <span>Орієнтовна дата</span>
          <strong style={{ fontSize: 15 }}>
            {m !== null ? dateFmt(addMonths(today(), m)) : "Потрібен внесок"}
          </strong>
        </div>
      </div>
      <Badge kind="scenario">
        {scenario
          ? `Ваш сценарій ${pct(rate)}`
          : "Базовий шлях · 0% дохідності"}
      </Badge>
    </>
  );
}
export function DepositCalculator() {
  const [principal, setPrincipal] = useState(0),
    [rate, setRate] = useState(0),
    [months, setMonths] = useState(12),
    [tax, setTax] = useState(0),
    [fees, setFees] = useState(0),
    [cap, setCap] = useState(true);
  const r = deposit(principal, rate / 100, months, tax / 100, cap, fees);
  return (
    <>
      <div className="form-grid">
        <Field
          label="Сума депозиту"
          value={principal}
          onChange={setPrincipal}
          suffix="₴"
        />
        <Field
          label="Ставка банку"
          value={rate}
          onChange={setRate}
          max={100}
          suffix="%"
        />
        <Field
          label="Строк у місяцях"
          value={months}
          onChange={setMonths}
          min={1}
          max={600}
          step={1}
        />
        <Field
          label="Податок із відсотків (ваше значення)"
          value={tax}
          onChange={setTax}
          max={100}
          suffix="%"
        />
        <Field label="Комісії" value={fees} onChange={setFees} suffix="₴" />
      </div>
      <label className="check">
        <input
          type="checkbox"
          checked={cap}
          onChange={(e) => setCap(e.target.checked)}
        />
        Щомісячна капіталізація після податку
      </label>
      <div className="metrics">
        <div className="metric">
          <span>Відсотки після податку</span>
          <strong>{fmt(r.interest)}</strong>
        </div>
        <div className="metric">
          <span>Всього після комісій</span>
          <strong>{fmt(r.value)}</strong>
        </div>
      </div>
      <Tip title="Чому ставка банку не дорівнює чистому результату?">
        На результат впливають строк, періодичність капіталізації, податки,
        комісії та дострокове розірвання. Тут використана щомісячна модель; у
        договорі банк може рахувати проценти за фактичними днями.
      </Tip>
      <Badge kind="scenario">За введеними умовами</Badge>
    </>
  );
}
export function MetalCalculator({
  silver = false,
  market,
}: {
  silver?: boolean;
  market: Market;
}) {
  const code = silver ? "XAG" : "XAU",
    official = market.rates.find((r) => r.code === code);
  const [budget, setBudget] = useState(0),
    [price, setPrice] = useState(0),
    [buy, setBuy] = useState(0),
    [sell, setSell] = useState(0),
    [change, setChange] = useState(0),
    [years, setYears] = useState(1),
    [fees, setFees] = useState(0);
  const used = price || (official?.value ?? 0) / 31.1034768;
  const r =
    used > 0
      ? metal(budget, used, buy / 100, sell / 100, change / 100, years, fees)
      : null;
  return (
    <>
      <div className="form-grid">
        <Field
          label="Ваш бюджет"
          value={budget}
          onChange={setBudget}
          suffix="₴"
        />
        <Field
          label="Ваша ціна за грам (0 = НБУ)"
          value={price}
          onChange={setPrice}
          suffix="₴"
        />
        <Field
          label="Спред купівлі до базової ціни"
          value={buy}
          onChange={setBuy}
          max={100}
          suffix="%"
        />
        <Field
          label="Спред продажу"
          value={sell}
          onChange={setSell}
          max={99}
          suffix="%"
        />
        <Field
          label="Ваш сценарій зміни ціни за рік"
          value={change}
          onChange={setChange}
          min={-99}
          max={100}
          suffix="%"
        />
        <Field
          label="Горизонт"
          value={years}
          onChange={setYears}
          min={1}
          max={30}
          step={1}
          suffix="років"
        />
        <Field
          label="Фіксована комісія за кожну операцію"
          value={fees}
          onChange={setFees}
          suffix="₴"
        />
      </div>
      {r ? (
        <div className="metrics">
          <div className="metric">
            <span>Грамів з урахуванням купівлі</span>
            <strong>{num(r.grams, 4)} г</strong>
          </div>
          <div className="metric">
            <span>Вартість продажу за сценарієм</span>
            <strong>{fmt(r.value)}</strong>
          </div>
        </div>
      ) : (
        <div className="notice">
          Введіть базову ціну за грам: дані НБУ зараз недоступні.
        </div>
      )}
      <Badge kind="scenario">Ваш сценарій · {pct(change)} / рік</Badge>
      <Tip title="Облікова ціна НБУ та ціна фізичного злитка">
        НБУ публікує облікову ціну металу за тройську унцію (31,1034768 г). Це
        не ціна купівлі чи викупу злитка банком. Фізичний метал має спред,
        вимоги до стану та упаковки, можливі витрати на зберігання. Метал не
        сплачує купони.
      </Tip>
    </>
  );
}
export function IncomeCoverCalculator({
  rent = false,
  freedom = false,
}: {
  rent?: boolean;
  freedom?: boolean;
}) {
  const [payment, setPayment] = useState(0),
    [yieldRate, setYield] = useState(0),
    [tax, setTax] = useState(0),
    [fee, setFee] = useState(0),
    [inflation, setInflation] = useState(0),
    [years, setYears] = useState(1);
  const future = payment * Math.pow(1 + inflation / 100, years),
    capital = requiredCashCapital(
      payment,
      yieldRate / 100,
      tax / 100,
      fee / 100,
    ),
    later = requiredCashCapital(future, yieldRate / 100, tax / 100, fee / 100);
  return (
    <>
      <div className="form-grid">
        <Field
          label={
            freedom
              ? "Необхідні щомісячні витрати"
              : rent
                ? "Щомісячна оренда"
                : "Щомісячний платіж іпотеки"
          }
          value={payment}
          onChange={setPayment}
          suffix="₴"
        />
        <Field
          label="Ваше припущення про грошові виплати"
          value={yieldRate}
          onChange={setYield}
          max={100}
          suffix="%/рік"
        />
        <Field
          label="Податок із виплат"
          value={tax}
          onChange={setTax}
          max={100}
          suffix="%"
        />
        <Field
          label="Річні комісії від капіталу"
          value={fee}
          onChange={setFee}
          max={100}
          suffix="%"
        />
        <Field
          label="Річне зростання витрат (сценарій)"
          value={inflation}
          onChange={setInflation}
          min={-99}
          max={100}
          suffix="%"
        />
        <Field
          label="Горизонт порівняння"
          value={years}
          onChange={setYears}
          min={1}
          max={30}
          step={1}
          suffix="років"
        />
      </div>
      <div className="metrics">
        <div className="metric">
          <span>Потрібний капітал зараз</span>
          <strong>{capital === null ? "—" : fmt(capital)}</strong>
        </div>
        <div className="metric">
          <span>Витрати через {years} років</span>
          <strong>{fmt(future)} / міс.</strong>
        </div>
        <div className="metric">
          <span>Капітал для майбутніх витрат</span>
          <strong>{later === null ? "—" : fmt(later)}</strong>
        </div>
      </div>
      {capital === null && (
        <div className="notice">
          Введіть додатну чисту дохідність грошових виплат. За нульової або
          від’ємної чистої ставки покрити витрати тільки виплатами неможливо.
        </div>
      )}
      <Tip title="Чому зростання ціни активу тут не рахується?">
        Зростання вартості не створює щомісячної виплати: для отримання грошей
        актив потрібно продати. Калькулятор використовує лише задані грошові
        виплати після податків і комісій. Виплати можуть бути нерегулярними, тож
        це середньомісячний еквівалент, а не графік надходжень.
      </Tip>
    </>
  );
}
export function InflationCalculator({ market }: { market: Market }) {
  const [principal, setPrincipal] = useState(0),
    [monthly, setMonthly] = useState(0),
    [rate, setRate] = useState(0),
    [inflation, setInflation] = useState(0),
    [years, setYears] = useState(5);
  const nominal = growth(principal, monthly, rate / 100, years * 12),
    real = inflationAdjusted(nominal, inflation / 100, years);
  return (
    <>
      <div className="form-grid">
        <Field
          label="Початковий капітал"
          value={principal}
          onChange={setPrincipal}
          suffix="₴"
        />
        <Field
          label="Місячне поповнення"
          value={monthly}
          onChange={setMonthly}
          suffix="₴"
        />
        <Field
          label="Ваш сценарій річної дохідності"
          value={rate}
          onChange={setRate}
          min={-99}
          max={100}
          suffix="%"
        />
        <Field
          label="Ваша річна інфляція"
          value={inflation}
          onChange={setInflation}
          min={-99}
          max={100}
          suffix="%"
        />
        <Field
          label="Горизонт"
          value={years}
          onChange={setYears}
          min={1}
          max={30}
          step={1}
          suffix="років"
        />
      </div>
      <div className="metrics">
        <div className="metric">
          <span>Номінальна сума</span>
          <strong>{fmt(nominal)}</strong>
        </div>
        <div className="metric">
          <span>У купівельній спроможності сьогодні</span>
          <strong>{fmt(real)}</strong>
        </div>
      </div>
      <div className="assumption">
        Ваш сценарій: дохідність {pct(rate)}, інфляція {pct(inflation)},
        горизонт {years} років.
      </div>
      {market.cpi.length > 0 && (
        <>
          <h3 style={{ marginTop: 25 }}>
            Історична інфляція, грудень до грудня
          </h3>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Рік</th>
                  <th>Зміна CPI</th>
                </tr>
              </thead>
              <tbody>
                {annualCpi(market.cpi).map((p) => (
                  <tr key={p.year}>
                    <td>{p.year}</td>
                    <td>{pct(p.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      <Tip title="Як рахувати реальну дохідність?">
        Реальна дохідність = (1 + номінальна дохідність) / (1 + інфляція) − 1.
        Це не просте віднімання відсотків. Номінальна сума ділиться на
        накопичений індекс інфляції.
      </Tip>
    </>
  );
}
export function BondCalculator({ bonds }: { bonds: MarketBond[] }) {
  const active = bonds.filter((b) => b.maturity > today());
  const [isin, setIsin] = useState(""),
    [budget, setBudget] = useState(0),
    [price, setPrice] = useState(0),
    [date, setDate] = useState(today()),
    [fees, setFees] = useState(0),
    [feeRate, setFeeRate] = useState(0),
    [manual, setManual] = useState("");
  const selected = active.find((b) => b.isin === isin);
  let result: ReturnType<typeof bondPurchase> | null = null,
    error = "";
  let payments = selected?.payments ?? [];
  if (manual.trim()) {
    try {
      payments = manual
        .trim()
        .split("\n")
        .map((row) => {
          const [date, value, kind] = row.split(";");
          if (
            !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
            !Number.isFinite(Number(value)) ||
            Number(value) <= 0 ||
            !["coupon", "principal"].includes(kind)
          )
            throw new Error();
          return {
            date,
            amount: Number(value),
            kind: kind as "coupon" | "principal",
          };
        });
    } catch {
      error =
        "Формат: YYYY-MM-DD;сума;coupon або principal, один платіж на рядок.";
    }
  }
  if (selected && price > 0 && payments.length && !error) {
    try {
      result = bondPurchase(
        { ...selected, payments },
        budget,
        price,
        date,
        fees,
        feeRate / 100,
      );
    } catch (e) {
      error = (e as Error).message;
    }
  }
  return (
    <>
      <div className="form-grid">
        <Field
          label="Бюджет у валюті випуску"
          value={budget}
          onChange={setBudget}
        />
        <Select
          label="Випуск ОВДП"
          value={isin}
          onChange={setIsin}
          options={[
            { value: "", label: "Оберіть випуск" },
            ...active.map((b) => ({
              value: b.isin,
              label: `${b.isin} · ${b.currency} · ${dateFmt(b.maturity)}`,
            })),
          ]}
        />
        <Field
          label="Повна ціна 1 облігації у провайдера"
          value={price}
          onChange={setPrice}
          hint="З накопиченим купонним доходом"
        />
        <TextField
          label="Дата купівлі"
          value={date}
          onChange={setDate}
          type="date"
        />
        <Field label="Фіксована комісія" value={fees} onChange={setFees} />
        <Field
          label="Комісія від суми"
          value={feeRate}
          onChange={setFeeRate}
          max={100}
          suffix="%"
        />
      </div>
      {!active.length && (
        <div className="notice">
          Актуальні випуски тимчасово недоступні. Перевірте джерела даних.
        </div>
      )}
      {selected && (
        <>
          <div className="assumption">
            Номінал: {fmt(selected.nominal, selected.currency)} · Погашення:{" "}
            {dateFmt(selected.maturity)} ·{" "}
            {selected.couponRate !== null
              ? `Купонна ставка: ${pct(selected.couponRate)}`
              : `Опублікована ставка розміщення: ${selected.publishedRate === null ? "—" : pct(selected.publishedRate)}`}{" "}
            · Дані: {dateFmt(selected.meta.effectiveDate)}
          </div>
          {!selected.payments.length && (
            <div className="notice" style={{ marginTop: 15 }}>
              Офіційний графік платежів НБУ недоступний. Для точного розрахунку
              введіть перевірений графік від провайдера. Ставка розміщення не
              використовується як купон.
            </div>
          )}
          <details className="tip">
            <summary>Ввести власний графік платежів на одну облігацію</summary>
            <label className="field" style={{ marginTop: 15 }}>
              <span>Дата;сума;тип — YYYY-MM-DD;1000;principal</span>
              <textarea
                aria-label="Власний графік платежів"
                rows={5}
                value={manual}
                onChange={(e) => setManual(e.target.value)}
                style={{
                  width: "100%",
                  border: "1px solid #e4e7df",
                  padding: 12,
                  borderRadius: 10,
                }}
              />
            </label>
          </details>
        </>
      )}
      {error && (
        <div className="notice error" role="alert">
          {error}
        </div>
      )}
      {result && selected && (
        <>
          <div className="metrics">
            <div className="metric">
              <span>Кількість облігацій</span>
              <strong>{result.count}</strong>
            </div>
            <div className="metric">
              <span>Вкладено з комісіями</span>
              <strong>{fmt(result.invested, selected.currency)}</strong>
            </div>
            <div className="metric">
              <span>Залишок</span>
              <strong>{fmt(result.remaining, selected.currency)}</strong>
            </div>
            <div className="metric">
              <span>Усі майбутні надходження</span>
              <strong>{fmt(result.total, selected.currency)}</strong>
            </div>
            <div className="metric">
              <span>Прибуток до можливих податків</span>
              <strong>{fmt(result.profit, selected.currency)}</strong>
            </div>
            <div className="metric">
              <span>Річна дохідність XIRR</span>
              <strong>
                {result.yield !== null ? pct(result.yield * 100) : "—"}
              </strong>
            </div>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Дата</th>
                  <th>Майбутній платіж</th>
                </tr>
              </thead>
              <tbody>
                {result.flows.map((f, i) => (
                  <tr key={i}>
                    <td>{dateFmt(f.date)}</td>
                    <td>{fmt(f.amount, selected.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      <Tip title="Купон та дохідність — різні речі">
        Купон визначає платежі від номіналу. Фактична річна дохідність залежить
        від повної ціни купівлі, комісій, дат і сум надходжень. XIRR
        використовує саме датовані грошові потоки.
      </Tip>
    </>
  );
}
export function FundCalculator({ funds }: { funds: MarketFund[] }) {
  const [capital, setCapital] = useState(0),
    [cash, setCash] = useState(0),
    [nav, setNav] = useState(0),
    [years, setYears] = useState(5),
    [tax, setTax] = useState(0),
    [fee, setFee] = useState(0),
    [id, setId] = useState("inzhur");
  const fund = funds.find((f) => f.id === id);
  const final = growth(capital, 0, nav / 100, years * 12),
    distributions =
      id === "energy"
        ? 0
        : Array.from(
            { length: years * 12 },
            (_, i) =>
              ((growth(capital, 0, nav / 100, i) * cash) / 100 / 12) *
              (1 - tax / 100),
          ).reduce((a, b) => a + b, 0);
  return (
    <>
      <div className="form-grid">
        <Select
          label="Фонд"
          value={id}
          onChange={setId}
          options={[
            { value: "inzhur", label: "Inzhur REIT" },
            { value: "energy", label: "Inzhur Energy" },
          ]}
        />
        <Field
          label="Ваш капітал"
          value={capital}
          onChange={setCapital}
          suffix="₴"
        />
        <Field
          label="Припущення про грошові виплати"
          value={id === "energy" ? 0 : cash}
          onChange={setCash}
          max={100}
          suffix="%/рік"
          hint={
            id === "energy"
              ? "Energy: модель капіталізації, без припущення про дивіденди"
              : undefined
          }
        />
        <Field
          label="Припущення про зміну NAV"
          value={nav}
          onChange={setNav}
          min={-99}
          max={100}
          suffix="%/рік"
        />
        <Field
          label="Податок із виплат"
          value={tax}
          onChange={setTax}
          max={100}
          suffix="%"
        />
        <Field
          label="Річні комісії від початкового капіталу"
          value={fee}
          onChange={setFee}
          max={100}
          suffix="%"
        />
        <Field
          label="Горизонт"
          value={years}
          onChange={setYears}
          min={1}
          max={30}
          step={1}
          suffix="років"
        />
      </div>
      <div className="metrics">
        <div className="metric">
          <span>Сценарій вартості сертифікатів</span>
          <strong>
            {fmt(Math.max(0, final - ((capital * fee) / 100) * years))}
          </strong>
        </div>
        <div className="metric">
          <span>Окремі грошові виплати</span>
          <strong>{fmt(distributions)}</strong>
        </div>
      </div>
      <div className="assumption">
        Ваш сценарій: виплати {pct(id === "energy" ? 0 : cash)}, зміна NAV{" "}
        {pct(nav)}, податок {pct(tax)}, комісії {pct(fee)} / рік. Виплати не
        реінвестуються.
      </div>
      {fund && (
        <>
          <h3 style={{ marginTop: 28 }}>Опубліковані показники</h3>
          <div className="metrics">
            <div className="metric">
              <span>ВЧА на сертифікат · факт</span>
              <strong>{fmt(fund.nav)}</strong>
            </div>
            <div className="metric">
              <span>Ціна купівлі · поточні умови</span>
              <strong>{fmt(fund.purchasePrice)}</strong>
            </div>
          </div>
          {fund.actualReturn && (
            <p style={{ fontSize: 12, marginBottom: 12 }}>
              <Badge kind="fact">Історичний факт емітента</Badge>{" "}
              {fund.actualReturn}
            </p>
          )}
          {fund.publishedExpectation && (
            <p style={{ fontSize: 12 }}>
              <Badge kind="warning">Очікування емітента</Badge>{" "}
              {fund.publishedExpectation}. Не гарантія результату.
            </p>
          )}
          {fund.feeNotes.length > 0 && (
            <details className="tip">
              <summary>Опубліковані умови комісій</summary>
              {fund.feeNotes.map((note, i) => (
                <p key={i} style={{ fontSize: 12, marginBottom: 12 }}>
                  {note}
                </p>
              ))}
            </details>
          )}
          {fund.distributions.length > 0 && (
            <>
              <h3 style={{ marginTop: 22, marginBottom: 15 }}>
                Історичні виплати на сертифікат
              </h3>
              <p className="muted" style={{ fontSize: 12 }}>
                Суми в гривні зі звіту емітента. Місяць звіту не є підтвердженою
                датою платежу. Це факти минулих періодів.
              </p>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Період</th>
                      <th>На 1 сертифікат, ₴</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fund.distributions.map((d) => (
                      <tr key={d.date}>
                        <td>
                          {d.dateBasis === "period"
                            ? d.date.slice(0, 7)
                            : dateFmt(d.date)}
                        </td>
                        <td>
                          {d.amount.toLocaleString("uk-UA", {
                            maximumFractionDigits: 6,
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          {fund.reports.length > 0 && (
            <details className="tip">
              <summary>Оригінальні звіти й документи</summary>
              <ul>
                {fund.reports.map((r) => (
                  <li key={r.url}>
                    <a
                      className="inline-link"
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {r.title} ↗
                    </a>
                  </li>
                ))}
              </ul>
            </details>
          )}
          <small>
            Показники отримано {dateFmt(fund.meta.effectiveDate)}. Дата
            отримання не є датою окремого звіту.
          </small>
        </>
      )}
      <Tip title="NAV, виплати та чистий результат">
        ВЧА (NAV) — вартість чистих активів фонду. Зміна ВЧА не означає
        надходження грошей на рахунок. Виплати, витрати фонду, податки та умови
        викупу перевіряйте окремо. Сценарій не підставляє очікування емітента
        автоматично.
      </Tip>
    </>
  );
}
export function PublicCalculator({
  kind,
  initialMarket,
}: {
  kind: string;
  initialMarket: Market;
}) {
  const [market, setMarket] = useState(initialMarket);
  useEffect(() => {
    fetch("/api/market")
      .then((r) => r.json())
      .then(setMarket)
      .catch(() => {});
  }, []);
  if (kind === "eoselia") return <EoseliaCalculator terms={market.eoselia} />;
  if (kind === "deposit") return <DepositCalculator />;
  if (kind === "gold" || kind === "silver")
    return <MetalCalculator silver={kind === "silver"} market={market} />;
  if (kind === "ovdp") return <BondCalculator bonds={market.bonds} />;
  if (kind === "fund") return <FundCalculator funds={market.funds} />;
  if (kind === "rent" || kind === "mortgage" || kind === "freedom")
    return (
      <IncomeCoverCalculator
        rent={kind === "rent"}
        freedom={kind === "freedom"}
      />
    );
  if (kind === "inflation") return <InflationCalculator market={market} />;
  if (kind === "currency") return <CurrencyHistory />;
  return <SavingCalculator />;
}
export function CurrencyHistory() {
  const [code, setCode] = useState("usd"),
    [period, setPeriod] = useState(3),
    [customFrom, setFrom] = useState(""),
    [customTo, setTo] = useState("");

  const now = new Date(),
    from =
      customFrom ||
      new Date(now.getFullYear() - period, now.getMonth(), now.getDate())
        .toISOString()
        .slice(0, 10),
    to = customTo || today();
  const { history, loading } = useHistory(code, from, to);
  const points = history[code] ?? [];
  const years =
    points.length > 1
      ? (Date.parse(points.at(-1)!.date) - Date.parse(points[0].date)) /
        86400000 /
        365
      : 0;
  const change =
    points.length > 1 && years > 0
      ? (Math.pow(points.at(-1)!.value / points[0].value, 1 / years) - 1) * 100
      : null;
  return (
    <>
      <div className="form-grid">
        <Select
          label="Інструмент"
          value={code}
          onChange={setCode}
          options={[
            { value: "usd", label: "USD" },
            { value: "eur", label: "EUR" },
            { value: "gold", label: "Золото (UAH / унція)" },
            { value: "silver", label: "Срібло (UAH / унція)" },
          ]}
        />
        <Select
          label="Період"
          value={String(period)}
          onChange={(v) => {
            setPeriod(Number(v));
            setFrom("");
            setTo("");
          }}
          options={[1, 3, 5, 10].map((y) => ({
            value: String(y),
            label: `${y} років`,
          }))}
        />
        <TextField
          label="Власна початкова дата"
          value={customFrom}
          onChange={setFrom}
          type="date"
        />
        <TextField
          label="Власна кінцева дата"
          value={customTo}
          onChange={setTo}
          type="date"
        />
      </div>
      {points.length > 1 ? (
        <>
          <Chart
            series={points.map((p) => ({ x: dateFmt(p.date), a: p.value }))}
            labels={["Гривневий еквівалент · НБУ"]}
            caption="Історична зміна офіційного курсу або облікової ціни НБУ"
          />
          <div className="metrics">
            <div className="metric">
              <span>Історична середньорічна зміна</span>
              <strong>{change === null ? "—" : pct(change)}</strong>
            </div>
            <div className="metric">
              <span>Фактично доступна історія</span>
              <strong style={{ fontSize: 13 }}>
                {dateFmt(points[0].date)} — {dateFmt(points.at(-1)!.date)}
              </strong>
            </div>
          </div>
          <Badge kind="fact">Історичні дані, не очікувана дохідність</Badge>
        </>
      ) : (
        <div className="notice">
          {loading
            ? "Завантажуємо фактичну історію НБУ…"
            : "Історичні дані НБУ за цей період тимчасово недоступні."}{" "}
          Відсутню історію не замінено синтетичними значеннями.
        </div>
      )}
    </>
  );
}
export { emptyMarket };
