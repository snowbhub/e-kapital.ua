"use client";
import { useState } from "react";
import { Plus, Trash2, Home, Target } from "lucide-react";
import { useCapital } from "./profile-context";
import { Card, Field, TextField, Select, Progress, Empty, Badge } from "./ui";
import {
  goalMonths,
  requiredContribution,
  addMonths,
} from "@/lib/finance/calculations";
import { fmt, pct, today, dateFmt } from "@/lib/format";
import { EoseliaCalculator } from "./public-calculators";
import type { State } from "@/lib/storage/schema";
const types = [
  "Квартира",
  "Будинок",
  "Перший внесок",
  "єОселя",
  "Оренда",
  "Покриття оренди",
  "Покриття іпотеки",
  "Авто",
  "Бізнес",
  "Навчання",
  "Переїзд",
  "Велика покупка",
  "Фінансова свобода",
  "Фінансовий резерв",
  "Власна ціль",
];
export function Goals() {
  const { state, update, market } = useCapital();
  const [adding, setAdding] = useState(false),
    [name, setName] = useState(""),
    [type, setType] = useState("Квартира"),
    [target, setTarget] = useState(0),
    [current, setCurrent] = useState(0),
    [monthly, setMonthly] = useState(0),
    [date, setDate] = useState(addMonths(today(), 12)),
    [currency, setCurrency] = useState<"UAH" | "USD" | "EUR">("UAH"),
    [city, setCity] = useState(""),
    [active, setActive] = useState("");
  function add() {
    if (!name.trim() || target <= 0) return;
    update((s) => ({
      ...s,
      goals: [
        ...s.goals,
        {
          id: crypto.randomUUID(),
          name: name.trim(),
          type,
          target,
          current,
          monthly,
          currency,
          date,
          scenarioEnabled: false,
          rate: 0,
          city,
        },
      ],
    }));
    setAdding(false);
    setName("");
  }
  function patch(id: string, patch: Partial<State["goals"][number]>) {
    update((s) => ({
      ...s,
      goals: s.goals.map((g) => (g.id === id ? { ...g, ...patch } : g)),
    }));
  }
  return (
    <>
      <div className="page-title">
        <div>
          <div className="eyebrow">
            <i />
            ВІД БАЖАННЯ ДО ПЛАНУ
          </div>
          <h1>Мої цілі</h1>
          <p>Кожна велика зміна починається з конкретної суми.</p>
        </div>
        <button className="button small" onClick={() => setAdding(!adding)}>
          <Plus size={15} />
          Створити ціль
        </button>
      </div>
      {adding && (
        <Card>
          <h2 style={{ marginBottom: 25 }}>Нова фінансова ціль</h2>
          <div className="form-grid">
            <TextField label="Назва цілі" value={name} onChange={setName} />
            <Select
              label="Тип"
              value={type}
              onChange={setType}
              options={types.map((x) => ({ value: x, label: x }))}
            />
            <Select
              label="Валюта"
              value={currency}
              onChange={(v) => setCurrency(v as typeof currency)}
              options={["UAH", "USD", "EUR"].map((x) => ({
                value: x,
                label: x,
              }))}
            />
            <Field label="Цільова сума" value={target} onChange={setTarget} />
            <Field
              label="Вже накопичено"
              value={current}
              onChange={setCurrent}
            />
            <Field
              label="Внесок на місяць"
              value={monthly}
              onChange={setMonthly}
            />
            <TextField
              label="Бажана дата"
              value={date}
              onChange={setDate}
              type="date"
            />
            <TextField
              label="Місто (для житла / переїзду)"
              value={city}
              onChange={setCity}
            />
          </div>
          <div className="form-actions">
            <button
              className="button"
              disabled={!name.trim() || target <= 0 || !date}
              onClick={add}
            >
              Зберегти ціль
            </button>
            <button className="button outline" onClick={() => setAdding(false)}>
              Скасувати
            </button>
          </div>
        </Card>
      )}
      {!state.goals.length && !adding && (
        <Card>
          <Empty
            title="На що хочете накопичити?"
            body="Перший внесок на квартиру, авто чи власний бізнес. Додайте ціль — і побачите внесок та дату досягнення."
            action={
              <button className="button" onClick={() => setAdding(true)}>
                <Plus size={16} />
                Створити першу ціль
              </button>
            }
          />
        </Card>
      )}
      <div className="goal-cards">
        {state.goals.map((g) => {
          const months = goalMonths(
              g.target,
              g.current,
              g.monthly,
              g.scenarioEnabled ? g.rate / 100 : 0,
            ),
            progress = g.target
              ? Math.min(100, (g.current / g.target) * 100)
              : 0;
          const targetMonths = Math.max(
            0,
            (new Date(g.date).getFullYear() - new Date().getFullYear()) * 12 +
              new Date(g.date).getMonth() -
              new Date().getMonth(),
          );
          const required = requiredContribution(
            g.target,
            g.current,
            targetMonths,
          );
          return (
            <Card key={g.id} className="goal-card">
              <div className="card-title">
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  {["Квартира", "Будинок", "єОселя", "Перший внесок"].includes(
                    g.type,
                  ) ? (
                    <Home size={21} />
                  ) : (
                    <Target size={21} />
                  )}
                  <div>
                    <h2>{g.name}</h2>
                    <small>
                      {g.type}
                      {g.city ? " · " + g.city : ""}
                    </small>
                  </div>
                </div>
                <button
                  className="icon-button"
                  aria-label={`Видалити ціль ${g.name}`}
                  onClick={() => {
                    if (confirm(`Видалити ціль «${g.name}»?`))
                      update((s) => ({
                        ...s,
                        goals: s.goals.filter((x) => x.id !== g.id),
                      }));
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="goal-amount">
                {fmt(g.current, g.currency)}{" "}
                <small>/ {fmt(g.target, g.currency)}</small>
              </div>
              <Progress value={progress} label={g.name} />
              <div className="goal-meta">
                <span>
                  Залишилось{" "}
                  {fmt(Math.max(0, g.target - g.current), g.currency)}
                </span>
                <span>{pct(progress)}</span>
              </div>
              <p className="goal-date">
                {months !== null
                  ? `За вашого внеску: ${dateFmt(addMonths(today(), months))}`
                  : "Додайте внесок, щоб розрахувати дату"}
              </p>
              <small>
                На бажану дату {dateFmt(g.date)} потрібно{" "}
                {required === null
                  ? "досягти ціль зараз"
                  : fmt(required, g.currency) + " / місяць"}{" "}
                без дохідності.
              </small>
              <div style={{ marginTop: 18 }}>
                <Badge kind={g.scenarioEnabled ? "scenario" : "neutral"}>
                  {g.scenarioEnabled
                    ? `Ваш сценарій ${pct(g.rate)} / рік`
                    : "Базовий шлях · 0% дохідності"}
                </Badge>
              </div>
              <button
                className="button outline small"
                style={{ marginTop: 20 }}
                onClick={() => setActive(active === g.id ? "" : g.id)}
              >
                {active === g.id ? "Закрити" : "Редагувати план"}
              </button>
              {active === g.id && (
                <div style={{ marginTop: 22 }}>
                  <div className="form-grid two">
                    <Field
                      label="Поточна сума"
                      value={g.current}
                      onChange={(n) => patch(g.id, { current: n })}
                    />
                    <Field
                      label="Щомісячний внесок"
                      value={g.monthly}
                      onChange={(n) => patch(g.id, { monthly: n })}
                    />
                    <Field
                      label="Цільова сума"
                      value={g.target}
                      onChange={(n) => patch(g.id, { target: n })}
                    />
                    <TextField
                      label="Бажана дата"
                      value={g.date}
                      onChange={(date) => {
                        if (date) patch(g.id, { date });
                      }}
                      type="date"
                    />
                  </div>
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={g.scenarioEnabled}
                      onChange={(e) =>
                        patch(g.id, { scenarioEnabled: e.target.checked })
                      }
                    />
                    Додати інвестиційний сценарій
                  </label>
                  {g.scenarioEnabled && (
                    <Field
                      label="Ваше припущення, % річних"
                      value={g.rate}
                      onChange={(rate) => patch(g.id, { rate })}
                      min={-99}
                      max={100}
                    />
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>
      <Card>
        <div className="card-title">
          <div>
            <h2>Квартира та єОселя</h2>
            <p>Розрахуйте перший внесок і кредит, перш ніж створити ціль.</p>
          </div>
          <Home size={21} />
        </div>
        <EoseliaCalculator
          terms={market.eoselia}
          onGoal={(amount) => {
            setTarget(amount);
            setType("Перший внесок");
            setName("Перший внесок на квартиру");
            setAdding(true);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
      </Card>
    </>
  );
}
