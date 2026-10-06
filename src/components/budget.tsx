"use client";
import { Plus, Trash2, Copy, Check } from "lucide-react";
import { useState } from "react";
import { Card, Stat, Field, Select, Tip, Badge } from "./ui";
import { useCapital, useNumbers } from "./profile-context";
import { fmt, pct } from "@/lib/format";
import type { Line, State } from "@/lib/storage/schema";
import { changeAllocation } from "@/lib/finance/calculations";
const currencies = [
  { value: "UAH", label: "₴ UAH" },
  { value: "USD", label: "$ USD" },
  { value: "EUR", label: "€ EUR" },
];
const categories = [
  "Житло",
  "Комунальні",
  "Їжа",
  "Транспорт",
  "Авто",
  "Кредити",
  "Здоров’я",
  "Діти",
  "Підписки",
  "Розваги",
  "Допомога родині",
  "Інше",
];
export function Budget() {
  const { state, update } = useCapital(),
    { period, flow } = useNumbers();
  const [source, setSource] = useState("Зарплата"),
    [category, setCategory] = useState("Житло");
  const prior = state.periods.filter((p) => p.id < state.currentPeriod).at(-1);
  const updatePeriod = (
    fn: (p: State["periods"][number]) => State["periods"][number],
  ) =>
    update((s) => ({
      ...s,
      periods: s.periods.map((p) => (p.id === s.currentPeriod ? fn(p) : p)),
    }));
  function add(kind: "incomes" | "expenses") {
    const item: Line = {
      id: crypto.randomUUID(),
      name: kind === "incomes" ? source : category,
      amount: 0,
      currency: "UAH",
      frequency: "monthly",
      regular: true,
      essential:
        kind === "expenses" &&
        [
          "Житло",
          "Комунальні",
          "Їжа",
          "Транспорт",
          "Здоров’я",
          "Діти",
        ].includes(category),
      debt: kind === "expenses" && category === "Кредити",
    };
    updatePeriod((p) => ({ ...p, [kind]: [...p[kind], item] }));
  }
  function line(
    kind: "incomes" | "expenses",
    id: string,
    patch: Partial<Line>,
  ) {
    updatePeriod((p) => ({
      ...p,
      [kind]: p[kind].map((l) => (l.id === id ? { ...l, ...patch } : l)),
    }));
  }
  function plan(key: keyof State["periods"][number]["plan"], value: number) {
    const parts = Object.entries(period.plan).map(([id, percent]) => ({
      id,
      percent,
      locked: false,
    }));
    const changed = changeAllocation(parts, key, value);
    updatePeriod((p) => ({
      ...p,
      plan: Object.fromEntries(
        changed.map((i) => [i.id, i.percent]),
      ) as State["periods"][number]["plan"],
    }));
  }
  return (
    <>
      <div className="page-title">
        <div>
          <div className="eyebrow">
            <i />
            ДОХОДИ → ВИТРАТИ → ПЛАН
          </div>
          <h1>Мій місяць</h1>
          <p>Реальні цифри замість здогадок.</p>
        </div>
        <Badge kind="green">На пристрої</Badge>
      </div>
      {!flow && (
        <div className="notice">
          Для перерахунку різних валют потрібні курси. Введіть власний курс у
          налаштуваннях або дочекайтеся даних НБУ.
        </div>
      )}
      <div className="stats">
        <Stat label="Місячний дохід" value={flow ? fmt(flow.income) : "—"} />
        <Stat
          label="Обов’язкові витрати"
          value={flow ? fmt(flow.essential) : "—"}
        />
        <Stat
          label="Інші витрати + борги"
          value={flow ? fmt(flow.other + flow.debt) : "—"}
        />
        <Stat
          label="Залишається на місяць"
          value={flow ? fmt(flow.free) : "—"}
          accent
        />
      </div>
      {prior && (
        <Card>
          <div className="card-title">
            <div>
              <h2>Структура попереднього місяця</h2>
              <p>
                Копіюються лише регулярні рядки та відсотки плану. Фактичні
                результати залишаються нульовими.
              </p>
            </div>
            <button
              className="button outline small"
              onClick={() => {
                if (
                  (period.incomes.length || period.expenses.length) &&
                  !confirm(
                    "Замінити поточні рядки регулярними рядками попереднього місяця?",
                  )
                )
                  return;
                updatePeriod((p) => ({
                  ...p,
                  incomes: prior.incomes
                    .filter((l) => l.regular && l.frequency !== "once")
                    .map((l) => ({ ...l, id: crypto.randomUUID() })),
                  expenses: prior.expenses
                    .filter((l) => l.regular && l.frequency !== "once")
                    .map((l) => ({ ...l, id: crypto.randomUUID() })),
                  plan: { ...prior.plan },
                }));
              }}
            >
              <Copy size={14} />
              Скопіювати
            </button>
          </div>
        </Card>
      )}
      {(["incomes", "expenses"] as const).map((kind) => (
        <Card key={kind}>
          <div className="card-title">
            <h2>{kind === "incomes" ? "Джерела доходу" : "Ваші витрати"}</h2>
            <Badge>{period[kind].length} рядків</Badge>
          </div>
          <div className="table-scroll">
            <table className="editable-table budget-table">
              <thead>
                <tr>
                  <th>Назва</th>
                  <th>Сума</th>
                  <th>Валюта</th>
                  <th>Частота</th>
                  <th>{kind === "incomes" ? "Стабільний" : "Обов’язкові"}</th>
                  {kind === "expenses" && <th>Борг</th>}
                  <th />
                </tr>
              </thead>
              <tbody>
                {period[kind].map((l) => (
                  <tr key={l.id}>
                    <td data-label="Назва">
                      <input
                        aria-label={`Назва ${l.name}`}
                        value={l.name}
                        maxLength={160}
                        onChange={(e) =>
                          line(kind, l.id, { name: e.target.value })
                        }
                      />
                    </td>
                    <td data-label="Сума">
                      <Field
                        label={`Сума ${l.name}`}
                        value={l.amount}
                        onChange={(amount) => line(kind, l.id, { amount })}
                      />
                    </td>
                    <td data-label="Валюта">
                      <select
                        aria-label={`Валюта ${l.name}`}
                        value={l.currency}
                        onChange={(e) =>
                          line(kind, l.id, {
                            currency: e.target.value as Line["currency"],
                          })
                        }
                      >
                        {currencies.map((c) => (
                          <option value={c.value} key={c.value}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td data-label="Частота">
                      <select
                        aria-label={`Частота ${l.name}`}
                        value={l.frequency}
                        onChange={(e) =>
                          line(kind, l.id, {
                            frequency: e.target.value as Line["frequency"],
                          })
                        }
                      >
                        <option value="monthly">Щомісяця</option>
                        <option value="weekly">Щотижня</option>
                        <option value="annual">Щороку</option>
                        <option value="once">Разово в цьому місяці</option>
                      </select>
                    </td>
                    <td
                      data-label={
                        kind === "incomes"
                          ? "Стабільний дохід"
                          : "Обов’язкові витрати"
                      }
                      className="table-check"
                    >
                      <input
                        type="checkbox"
                        aria-label={`${kind === "incomes" ? "Стабільний" : "Обов’язкові"} ${l.name}`}
                        checked={kind === "incomes" ? l.regular : l.essential}
                        onChange={(e) =>
                          line(
                            kind,
                            l.id,
                            kind === "incomes"
                              ? { regular: e.target.checked }
                              : { essential: e.target.checked },
                          )
                        }
                      />
                    </td>
                    {kind === "expenses" && (
                      <td data-label="Борговий платіж" className="table-check">
                        <input
                          type="checkbox"
                          aria-label={`Борговий платіж ${l.name}`}
                          checked={l.debt}
                          onChange={(e) =>
                            line(kind, l.id, { debt: e.target.checked })
                          }
                        />
                      </td>
                    )}
                    <td className="table-delete">
                      <button
                        className="icon-button"
                        aria-label={`Видалити ${l.name}`}
                        onClick={() =>
                          updatePeriod((p) => ({
                            ...p,
                            [kind]: p[kind].filter((x) => x.id !== l.id),
                          }))
                        }
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="form-actions">
            <select
              aria-label={
                kind === "incomes"
                  ? "Нове джерело доходу"
                  : "Категорія нової витрати"
              }
              style={{ maxWidth: 230 }}
              value={kind === "incomes" ? source : category}
              onChange={(e) =>
                kind === "incomes"
                  ? setSource(e.target.value)
                  : setCategory(e.target.value)
              }
            >
              {(kind === "incomes"
                ? [
                    "Зарплата",
                    "Зарплата 2",
                    "ФОП",
                    "Підробіток",
                    "Оренда",
                    "Інше",
                  ]
                : categories
              ).map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
            <button className="button outline small" onClick={() => add(kind)}>
              <Plus size={15} />
              Додати {kind === "incomes" ? "дохід" : "витрату"}
            </button>
          </div>
          <Tip title="Як перераховується частота?">
            Щотижневі суми множаться на 52 / 12, річні діляться на 12. Разова
            сума враховується лише у цьому періоді. Нерегулярні доходи — це
            введений вами план, не гарантовані надходження.
          </Tip>
        </Card>
      ))}
      <Card>
        <div className="card-title">
          <div>
            <h2>Мій місячний розподіл</h2>
            <p>Ви самі визначаєте призначення вільного cash flow.</p>
          </div>
          <Badge kind="green">Разом 100%</Badge>
        </div>
        <div className="form-grid four">
          {(
            [
              ["reserve", "Резерв"],
              ["goals", "Фінансові цілі"],
              ["invest", "Інвестиційний капітал"],
              ["free", "Вільні гроші"],
            ] as const
          ).map(([key, label]) => (
            <div key={key}>
              <Field
                label={label}
                value={Math.round(period.plan[key] * 100) / 100}
                onChange={(n) => plan(key, n)}
                max={100}
                suffix="%"
              />
              <small style={{ display: "block", marginTop: 10 }}>
                {fmt((Math.max(0, flow?.free ?? 0) * period.plan[key]) / 100)}
              </small>
            </div>
          ))}
        </div>
        {flow && flow.free < 0 && (
          <div className="notice error">
            Витрати перевищують доходи на {fmt(-flow.free)}. Поточна сума для
            розподілу — 0 ₴.
          </div>
        )}
        <Tip title="Чому змінюються інші відсотки?">
          Коли ви змінюєте одну частку, решта перераховуються пропорційно, щоб
          сума завжди становила 100%.
        </Tip>
      </Card>
      <Card>
        <div className="card-title">
          <div>
            <h2>Щомісячний check-in</h2>
            <p>
              Вкажіть фактичні результати. Вони збережуться в історії цього
              місяця.
            </p>
          </div>
          {period.checkedIn && <Badge kind="green">Підсумок збережено</Badge>}
        </div>
        <div className="form-grid">
          {(
            [
              ["income", "Скільки фактично зароблено?"],
              ["expenses", "Скільки витрачено?"],
              ["reserve", "Відкладено у резерв"],
              ["goals", "Внесено на цілі"],
              ["invest", "Фактично інвестовано"],
            ] as const
          ).map(([key, label]) => (
            <Field
              key={key}
              label={label}
              value={period.actual[key]}
              onChange={(n) =>
                updatePeriod((p) => ({
                  ...p,
                  checkedIn: false,
                  actual: { ...p.actual, [key]: n },
                }))
              }
              suffix="₴"
            />
          ))}
        </div>
        <p className="muted" style={{ fontSize: 12 }}>
          Чи змінилися регулярні витрати? Перевірте рядки вище перед наступним
          місяцем.
        </p>
        <div className="form-actions">
          <button
            className="button"
            onClick={() => updatePeriod((p) => ({ ...p, checkedIn: true }))}
          >
            <Check size={16} />
            Зберегти підсумок
          </button>
        </div>
        <div className="table-scroll" style={{ marginTop: 20 }}>
          <table>
            <thead>
              <tr>
                <th>Призначення</th>
                <th>План</th>
                <th>Факт</th>
                <th>Різниця</th>
              </tr>
            </thead>
            <tbody>
              {(["reserve", "goals", "invest"] as const).map((k) => (
                <tr key={k}>
                  <td>
                    {
                      {
                        reserve: "Резерв",
                        goals: "Цілі",
                        invest: "Інвестиції",
                      }[k]
                    }
                  </td>
                  <td>
                    {fmt((Math.max(0, flow?.free ?? 0) * period.plan[k]) / 100)}
                  </td>
                  <td>{fmt(period.actual[k])}</td>
                  <td>
                    {fmt(
                      period.actual[k] -
                        (Math.max(0, flow?.free ?? 0) * period.plan[k]) / 100,
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted" style={{ fontSize: 11, marginTop: 14 }}>
          Фактичні внески — підсумок для порівняння з планом. Баланси резерву,
          цілей і активів оновлюються окремо, щоб уникнути подвійного обліку.
        </p>
      </Card>
    </>
  );
}
export const BudgetCurrencySelect = Select;
export const BudgetPercent = pct;
