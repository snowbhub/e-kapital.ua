"use client";
import { useState } from "react";
import { Lock, LockOpen, Save, Share2, GripVertical } from "lucide-react";
import { z } from "zod";
import { useHistory } from "@/lib/data/use-history";
import { useCapital } from "./profile-context";
import { Card, Field, Select, TextField, Chart, Stat, Badge, Tip } from "./ui";
import { assets, type AssetId, type Scenario } from "@/lib/finance/assets";
import { changeAllocation } from "@/lib/finance/calculations";
import {
  projectPortfolio,
  portfolioMetrics,
  historicalReplay,
} from "@/lib/finance/portfolio";
import { fmt, pct, today, dateFmt } from "@/lib/format";
import { stateSchema, type State } from "@/lib/storage/schema";
export const shareSchema = z
  .object({
    v: z.literal(1),
    hypotheticalCapital: z.number().min(0).max(1e12),
    monthlyContribution: z.number().min(0).max(1e12),
    years: z.number().int().min(1).max(30),
    allocation: z
      .array(
        z.object({
          id: z.enum(assets.map((a) => a.id) as [AssetId, ...AssetId[]]),
          percent: z.number().min(0).max(100),
        }),
      )
      .min(1)
      .max(11)
      .refine(
        (a) => new Set(a.map((x) => x.id)).size === a.length,
        "Повторені активи",
      )
      .refine(
        (a) => Math.abs(a.reduce((n, x) => n + x.percent, 0) - 100) < 0.0001,
        "Розподіл має дорівнювати 100%",
      ),
    assumptions: stateSchema.shape.portfolio.shape.scenario,
  })
  .strict();
export function Portfolio() {
  const { state, update } = useCapital();
  const p = state.portfolio,
    s = p.scenario;
  const [tab, setTab] = useState("allocation"),
    [mode, setMode] = useState("percent"),
    [name, setName] = useState(""),
    [share, setShare] = useState(false),
    [url, setUrl] = useState(""),
    [dragged, setDragged] = useState(""),
    [from, setFrom] = useState(
      new Date(
        new Date().getFullYear() - 3,
        new Date().getMonth(),
        new Date().getDate(),
      )
        .toISOString()
        .slice(0, 10),
    ),
    [to, setTo] = useState(today());
  const set = (patch: Partial<typeof p>) =>
    update((v) => ({ ...v, portfolio: { ...v.portfolio, ...patch } }));
  const assumption = (key: keyof Scenario, value: number | boolean) =>
    set({ scenario: { ...s, [key]: value } });
  const points = projectPortfolio(
      p.capital,
      p.monthly,
      p.allocation,
      p.years,
      s,
    ),
    last = points.at(-1)!,
    metrics = portfolioMetrics(p.allocation);
  const ids = p.allocation
    .filter((a) => a.percent > 0)
    .map((a) => a.id)
    .sort()
    .join(",");
  const { history, loading } = useHistory(ids, from, to, tab === "history");
  const replay = historicalReplay(p.capital, p.allocation, history, from, to);
  function allocate(id: string, value: number) {
    set({
      allocation: changeAllocation(
        p.allocation,
        id,
        mode === "money" ? (p.capital ? (value / p.capital) * 100 : 0) : value,
      ),
    });
  }
  function move(id: string) {
    if (!dragged || dragged === id) return;
    const rows = [...p.allocation],
      index = rows.findIndex((x) => x.id === dragged),
      target = rows.findIndex((x) => x.id === id);
    const [item] = rows.splice(index, 1);
    rows.splice(target, 0, item);
    set({ allocation: rows });
    setDragged("");
  }
  async function generateShare() {
    const payload = shareSchema.parse({
      v: 1,
      hypotheticalCapital: p.capital,
      monthlyContribution: p.monthly,
      years: p.years,
      allocation: p.allocation.map((a) => ({ id: a.id, percent: a.percent })),
      assumptions: p.scenario,
    });
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
    const link = `${location.origin}/scenario#${encoded}`;
    setUrl(link);
    try {
      await navigator.clipboard.writeText(link);
    } catch {}
  }
  return (
    <>
      <div className="page-title">
        <div>
          <div className="eyebrow">
            <i />
            ВАШІ ПРИПУЩЕННЯ. ВАШ РОЗПОДІЛ.
          </div>
          <h1>Portfolio Lab</h1>
          <p>Порівнюйте сценарії та розумійте структуру капіталу.</p>
        </div>
        <button
          className="button outline small"
          onClick={() => setShare(!share)}
        >
          <Share2 size={14} />
          Поділитися
        </button>
      </div>
      <Card>
        <div className="form-grid">
          <Field
            label="Гіпотетичний капітал"
            value={p.capital}
            onChange={(capital) => set({ capital })}
            suffix="₴"
          />
          <Field
            label="Щомісячний внесок"
            value={p.monthly}
            onChange={(monthly) => set({ monthly })}
            suffix="₴"
          />
          <Select
            label="Горизонт"
            value={String(p.years)}
            onChange={(v) => set({ years: Number(v) })}
            options={[1, 3, 5, 10].map((v) => ({
              value: String(v),
              label: `${v} років`,
            }))}
          />
        </div>
        <Badge kind="scenario">Сценарій · не фактичний облік активів</Badge>
      </Card>
      {share && (
        <Card>
          <h2>Попередній перегляд публічного сценарію</h2>
          <p className="muted" style={{ fontSize: 12, margin: "15px 0" }}>
            Посилання міститиме гіпотетичний капітал {fmt(p.capital)}, внесок{" "}
            {fmt(p.monthly)}, горизонт {p.years} років, частки активів і
            припущення нижче. Доходи, витрати, назви цілей та фактичні активи не
            включені.
          </p>
          <button className="button small" onClick={generateShare}>
            Створити і скопіювати посилання
          </button>
          {url && (
            <label className="field" style={{ marginTop: 15 }}>
              <span>Публічне посилання</span>
              <input readOnly value={url} onFocus={(e) => e.target.select()} />
            </label>
          )}
        </Card>
      )}
      <div className="tabs">
        {[
          ["allocation", "Розподіл"],
          ["scenario", "Scenario Lab"],
          ["history", "Історичний replay"],
        ].map(([id, label]) => (
          <button
            className={tab === id ? "active" : ""}
            onClick={() => setTab(id)}
            key={id}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "allocation" && (
        <div className="dashboard-grid">
          <Card>
            <div className="card-title">
              <h2>Розподіліть капітал</h2>
              <div className="tabs" style={{ margin: 0 }}>
                <button
                  className={mode === "percent" ? "active" : ""}
                  onClick={() => setMode("percent")}
                >
                  %
                </button>
                <button
                  className={mode === "money" ? "active" : ""}
                  onClick={() => setMode("money")}
                >
                  ₴
                </button>
              </div>
            </div>
            {p.allocation.map((a) => {
              const asset = assets.find((x) => x.id === a.id)!;
              return (
                <div
                  className="allocation-row"
                  key={a.id}
                  draggable={!a.locked}
                  onDragStart={() => setDragged(a.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => move(a.id)}
                >
                  <div className="asset-label">
                    <GripVertical size={12} aria-hidden="true" />
                    <i style={{ background: asset.color }} />
                    <span>{asset.short}</span>
                  </div>
                  <input
                    aria-label={`Частка ${asset.name}`}
                    type="range"
                    min={0}
                    max={100}
                    step={0.1}
                    value={a.percent}
                    disabled={a.locked}
                    onChange={(e) =>
                      set({
                        allocation: changeAllocation(
                          p.allocation,
                          a.id,
                          Number(e.target.value),
                        ),
                      })
                    }
                  />
                  <input
                    aria-label={`${mode === "money" ? "Сума" : "Відсоток"} ${asset.name}`}
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={mode === "money" ? p.capital : 100}
                    value={
                      Math.round(
                        (mode === "money"
                          ? (p.capital * a.percent) / 100
                          : a.percent) * 100,
                      ) / 100
                    }
                    disabled={a.locked || (mode === "money" && p.capital === 0)}
                    onChange={(e) => allocate(a.id, Number(e.target.value))}
                  />
                  <button
                    className="icon-button"
                    aria-label={`${a.locked ? "Розблокувати" : "Зафіксувати"} ${asset.name}`}
                    onClick={() =>
                      set({
                        allocation: p.allocation.map((x) =>
                          x.id === a.id ? { ...x, locked: !x.locked } : x,
                        ),
                      })
                    }
                  >
                    {a.locked ? <Lock size={14} /> : <LockOpen size={14} />}
                  </button>
                </div>
              );
            })}
            <div className="goal-meta">
              <strong>Разом</strong>
              <Badge kind="green">100% · {fmt(p.capital)}</Badge>
            </div>
            <Tip title="Як працює фіксація часток?">
              Зафіксована частка залишається сталою. Інші активи перераховуються
              пропорційно у доступному залишку. Сума завжди дорівнює 100%.
              Перетягування рядка змінює порядок відображення.
            </Tip>
          </Card>
          <Card>
            <h2>Експозиція та ліквідність</h2>
            <div className="metrics">
              {(
                [
                  ["uah", "Гривня"],
                  ["usd", "USD"],
                  ["eur", "EUR"],
                  ["metal", "Метали"],
                  ["fixed", "Фіксовані платежі"],
                  ["estate", "Нерухомість"],
                  ["cash", "Cash"],
                  ["liquid", "Cash + валюта"],
                  ["concentration", "Найбільша частка"],
                ] as const
              ).map(([key, label]) => (
                <div className="metric" key={key}>
                  <span>{label}</span>
                  <strong>{pct(metrics[key])}</strong>
                </div>
              ))}
            </div>
            {p.allocation
              .filter((a) => a.percent > 0)
              .map((a) => (
                <div className="legend" key={a.id}>
                  <i
                    style={{
                      background: assets.find((x) => x.id === a.id)?.color,
                    }}
                  />
                  <span>{assets.find((x) => x.id === a.id)?.name}</span>
                  <span>{pct(a.percent)}</span>
                </div>
              ))}
            <Tip title="Що таке ліквідність?">
              Наскільки швидко актив можна перетворити назад у гроші і за якою
              ціною. Для облігацій потрібне погашення або продаж, для фонду —
              викуп за його правилами. Показник Cash + валюта не гарантує
              доступності конкретного рахунку.
            </Tip>
            <Tip title="Що означає концентрація?">
              Частка найбільшого активу у вашому сценарії. Це опис структури, а
              не оцінка портфеля. Експозиції за валютою та типом активу
              перетинаються і не додаються між собою.
            </Tip>
          </Card>
        </div>
      )}
      {tab === "scenario" && (
        <>
          <Card>
            <div className="card-title">
              <div>
                <h2>Задайте власні припущення</h2>
                <p>Жодна ставка нижче не є прогнозом єКапітал.</p>
              </div>
              <Badge kind="scenario">Ваш сценарій</Badge>
            </div>
            <div className="form-grid">
              {(
                [
                  ["usd", "USD: зміна гривневого еквівалента", -99],
                  ["eur", "EUR: зміна гривневого еквівалента", -99],
                  ["gold", "Золото: зміна ціни", -99],
                  ["silver", "Срібло: зміна ціни", -99],
                  ["fundCash", "Inzhur REIT: грошові виплати", 0],
                  ["fundNav", "Inzhur: зміна NAV", -99],
                  ["deposit", "Депозит: річна ставка", 0],
                  ["bond", "ОВДП: сценарій виплат, не XIRR", 0],
                  ["inflation", "Інфляція", -99],
                  ["tax", "Податок із виплат", 0],
                  ["fee", "Одноразові витрати від внесків", 0],
                  ["buySpread", "Метали: спред купівлі", 0],
                  ["sellSpread", "Метали: спред продажу", 0],
                ] as const
              ).map(([key, label, min]) => (
                <div key={key}>
                  <Field
                    label={label}
                    value={s[key] as number}
                    onChange={(n) => assumption(key, n)}
                    min={min}
                    max={key === "sellSpread" ? 99 : 100}
                    suffix="%"
                  />
                  <input
                    aria-label={`Повзунок ${label}`}
                    type="range"
                    value={s[key] as number}
                    min={min}
                    max={key === "sellSpread" ? 99 : 100}
                    step={0.5}
                    onChange={(e) => assumption(key, Number(e.target.value))}
                    style={{ marginTop: 12 }}
                  />
                </div>
              ))}
            </div>
            <label className="check">
              <input
                type="checkbox"
                checked={s.reinvest}
                onChange={(e) => assumption("reinvest", e.target.checked)}
              />
              Реінвестувати виплати фонду та сценарій виплат ОВДП
            </label>
            <div className="notice">
              Сценарій ОВДП — спрощена модель виплат без конкретного ISIN. Для
              фактичної дохідності випуску використовуйте калькулятор ОВДП із
              повною ціною та датованим графіком. Inzhur Energy моделює
              капіталізацію без грошових виплат.
            </div>
            <div className="form-actions">
              <input
                aria-label="Назва сценарію"
                placeholder="Назва сценарію"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={160}
                style={{ maxWidth: 230 }}
              />
              <button
                className="button outline small"
                disabled={!name.trim()}
                onClick={() => {
                  set({
                    savedScenarios: [
                      ...p.savedScenarios,
                      {
                        id: crypto.randomUUID(),
                        name,
                        scenario: { ...s },
                        createdAt: new Date().toISOString(),
                      },
                    ],
                  });
                  setName("");
                }}
              >
                <Save size={14} />
                Зберегти сценарій
              </button>
            </div>
            {p.savedScenarios.length > 0 && (
              <Select
                label="Завантажити збережений сценарій"
                value=""
                onChange={(id) => {
                  const saved = p.savedScenarios.find((x) => x.id === id);
                  if (saved) set({ scenario: saved.scenario });
                }}
                options={[
                  { value: "", label: "Виберіть сценарій" },
                  ...p.savedScenarios.map((x) => ({
                    value: x.id,
                    label: x.name,
                  })),
                ]}
              />
            )}
          </Card>
          <div className="stats">
            <Stat
              label="Внесено за весь період"
              value={fmt(last.contributed)}
            />
            <Stat
              label="Номінальна загальна вартість"
              value={fmt(last.nominal)}
              accent
            />
            <Stat
              label="Купівельна спроможність сьогодні"
              value={fmt(last.real)}
            />
            <Stat
              label="Виплати без реінвестування"
              value={fmt(last.cash)}
              foot="Накопичені, окремо від оцінки активів"
            />
          </div>
          <Card>
            <div className="card-title">
              <h2>Як зміниться ваш сценарій?</h2>
              <Badge>{p.years} років</Badge>
            </div>
            <Chart
              series={points
                .filter((_, i) => i % 3 === 0)
                .map((v) => ({
                  x: `${v.month / 12} р.`,
                  a: v.nominal,
                  b: v.real,
                }))}
              caption="Сценарій номінального капіталу та купівельної спроможності"
            />
            <div className="assumption">
              Постійні припущення: USD {pct(s.usd)} · EUR {pct(s.eur)} · золото{" "}
              {pct(s.gold)} · срібло {pct(s.silver)} · виплати REIT{" "}
              {pct(s.fundCash)} · NAV {pct(s.fundNav)} · депозит{" "}
              {pct(s.deposit)} · виплати ОВДП {pct(s.bond)} · інфляція{" "}
              {pct(s.inflation)} · податок {pct(s.tax)} · витрати {pct(s.fee)} ·
              спреди {pct(s.buySpread)} / {pct(s.sellSpread)} ·{" "}
              {s.reinvest ? "з реінвестуванням" : "без реінвестування"}.
            </div>
            <Tip title="Чому номінальна та реальна суми відрізняються?">
              Номінальна сума — кількість грошей. Реальна сума показує, що вони
              купуватимуть у цінах початку сценарію. Внески додаються наприкінці
              місяця; реінвестовані виплати не рахуються вдруге як окрема
              готівка.
            </Tip>
          </Card>
        </>
      )}
      {tab === "history" && (
        <Card>
          <div className="card-title">
            <div>
              <h2>Як цей розподіл поводився б у минулому?</h2>
              <p>Лише перевірена історія. Без синтезованих років.</p>
            </div>
            <Badge kind="fact">Історичний replay</Badge>
          </div>
          <div className="tabs">
            {[1, 3, 5].map((y) => (
              <button
                key={y}
                onClick={() => {
                  setFrom(
                    new Date(
                      new Date().getFullYear() - y,
                      new Date().getMonth(),
                      new Date().getDate(),
                    )
                      .toISOString()
                      .slice(0, 10),
                  );
                  setTo(today());
                }}
              >
                {y === 1 ? "12 місяців" : `${y} років`}
              </button>
            ))}
          </div>
          <div className="form-grid two">
            <TextField
              label="Від"
              value={from}
              onChange={setFrom}
              type="date"
            />
            <TextField label="До" value={to} onChange={setTo} type="date" />
          </div>
          {loading ? (
            <div className="notice" role="status">
              Завантажуємо фактичну історію…
            </div>
          ) : replay.missing.length ? (
            <div className="notice">
              Немає повної історії для:{" "}
              {replay.missing
                .map((id) => assets.find((a) => a.id === id)?.name ?? id)
                .join(", ")}
              . Replay всього портфеля недоступний; відсутні значення не
              підставляються.
            </div>
          ) : replay.points.length > 1 ? (
            <Chart
              series={replay.points.map((v) => ({
                x: dateFmt(v.date),
                a: v.value,
              }))}
              labels={["Історична вартість в UAH"]}
              caption="Історичний replay без ребалансування, поповнень, комісій чи податків"
            />
          ) : (
            <div className="notice">
              Для обраного періоду немає спільних історичних точок. Cash має
              нульову номінальну зміну.
            </div>
          )}
          <Tip title="Що враховує replay?">
            Одноразове вкладення на початку доступного спільного періоду, без
            ребалансування та щомісячних поповнень. Валюта і метал оцінюються за
            офіційними даними НБУ. Спреди, податки та комісії не включено. Для
            облігацій потрібні історичні повні ціни та виплати конкретних ISIN;
            без них результат не розраховується.
          </Tip>
        </Card>
      )}
    </>
  );
}
export type PortfolioState = State["portfolio"];
