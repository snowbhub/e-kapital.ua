"use client";
import Link from "next/link";
import { ArrowUpRight, Plus, Shield, Target } from "lucide-react";
import { useCapital, useNumbers } from "./profile-context";
import { Card, Stat, Progress, Empty, Badge, Tip } from "./ui";
import { fmt, pct, dateFmt } from "@/lib/format";
import { reserve, goalMonths, addMonths } from "@/lib/finance/calculations";
import { assets } from "@/lib/finance/assets";
import { Install } from "./install";
export function Dashboard() {
  const { state, market } = useCapital(),
    { flow, total, netWorth, period } = useNumbers();
  const r = reserve(
    (flow?.essential ?? 0) + (flow?.debt ?? 0),
    state.reserve.months,
    state.reserve.current,
    state.reserve.monthly,
  );
  const net = netWorth !== null ? fmt(netWorth) : "Потрібні курси";
  const prior = state.periods.filter((p) => p.id < state.currentPeriod).at(-1);
  const segments = state.portfolio.allocation.filter((a) => a.percent > 0);
  const gradient = segments
    .map((a, i) => {
      const old = segments.slice(0, i).reduce((n, x) => n + x.percent, 0);
      return `${assets.find((x) => x.id === a.id)?.color ?? "#ddd"} ${old}% ${old + a.percent}%`;
    })
    .join(",");
  return (
    <>
      <div className="page-title">
        <div>
          <div className="eyebrow">
            <i />
            ОСОБИСТИЙ ПРОСТІР
          </div>
          <h1>Мій капітал</h1>
          <p>Уся фінансова картина. В одному місці.</p>
        </div>
        <Link href="/app/capital" className="button outline small">
          <Plus size={15} />
          Додати актив
        </Link>
      </div>
      {prior && !period.incomes.length && !period.expenses.length && (
        <div className="notice">
          Почався новий місяць. Попередній план збережено в історії.{" "}
          <Link href="/app/budget" className="inline-link">
            Скопіювати структуру минулого місяця <ArrowUpRight size={14} />
          </Link>
        </div>
      )}
      <div className="stats">
        <Stat
          label="Чистий капітал"
          value={net}
          foot="Активи мінус зобов’язання"
          accent
        />
        <Stat
          label="Дохід цього місяця"
          value={flow ? fmt(flow.income) : "Потрібні курси"}
          foot="План після податків"
        />
        <Stat
          label="Витрати цього місяця"
          value={flow ? fmt(flow.expenses) : "Потрібні курси"}
          foot="Обов’язкові + інші + борги"
        />
        <Stat
          label="Вільний cash flow"
          value={flow ? fmt(flow.free) : "Потрібні курси"}
          foot="Після введених вами витрат"
        />
      </div>
      <div className="dashboard-grid">
        <Card>
          <div className="card-title">
            <h2>Цей місяць</h2>
            <Link href="/app/budget" className="inline-link">
              Змінити план <ArrowUpRight size={15} />
            </Link>
          </div>
          <div className="metrics">
            {(
              [
                ["reserve", "Резерв"],
                ["goals", "Фінансові цілі"],
                ["invest", "Інвестиції"],
                ["free", "Вільні гроші"],
              ] as const
            ).map(([key, label]) => (
              <div className="metric" key={key}>
                <span>
                  {label} · {pct(period.plan[key])}
                </span>
                <strong>
                  {fmt((Math.max(0, flow?.free ?? 0) * period.plan[key]) / 100)}
                </strong>
              </div>
            ))}
          </div>
          <Tip title="Що означає вільний cash flow?">
            Сума, яка залишається після введених доходів і витрат. Ви самі
            визначаєте, як її використовувати. Якщо сума від’ємна, витрати
            перевищують дохід.
          </Tip>
        </Card>
        <Card>
          <div className="card-title">
            <h2>Структура сценарію</h2>
            <Link href="/app/portfolio" className="inline-link">
              Portfolio Lab <ArrowUpRight size={15} />
            </Link>
          </div>
          <div
            style={{
              display: "flex",
              gap: 25,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <div
              className="donut"
              style={{ background: `conic-gradient(${gradient})` }}
            >
              <div>
                <small>У сценарії</small>
                <strong>{fmt(state.portfolio.capital)}</strong>
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 120 }}>
              {segments.slice(0, 5).map((a) => (
                <div className="legend" key={a.id}>
                  <i
                    style={{
                      background: assets.find((x) => x.id === a.id)?.color,
                    }}
                  />
                  <span>{assets.find((x) => x.id === a.id)?.short}</span>
                  <span>{pct(a.percent)}</span>
                </div>
              ))}
              <Badge kind="scenario">Ваш розподіл</Badge>
            </div>
          </div>
        </Card>
        <Card>
          <div className="card-title">
            <h2>
              <Shield size={17} style={{ display: "inline", marginRight: 9 }} />
              Фінансовий резерв
            </h2>
            <Link href="/app/reserve" className="inline-link">
              Налаштувати <ArrowUpRight size={15} />
            </Link>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <strong style={{ fontSize: 30, fontWeight: 500 }}>
              {fmt(state.reserve.current)}
            </strong>
            <span className="muted" style={{ fontSize: 12 }}>
              із {fmt(r.target)}
            </span>
          </div>
          <Progress value={r.progress} label="Фінансовий резерв" />
          <div className="goal-meta">
            <span>{state.reserve.months} місяців обов’язкових витрат</span>
            <span>{pct(r.progress)}</span>
          </div>
        </Card>
        <Card>
          <div className="card-title">
            <h2>
              <Target size={17} style={{ display: "inline", marginRight: 9 }} />
              Мої цілі
            </h2>
            <Link href="/app/goals" className="inline-link">
              Усі цілі <ArrowUpRight size={15} />
            </Link>
          </div>
          {state.goals.length ? (
            state.goals.slice(0, 2).map((g) => {
              const m = goalMonths(
                g.target,
                g.current,
                g.monthly,
                g.scenarioEnabled ? g.rate / 100 : 0,
              );
              return (
                <div key={g.id} style={{ marginBottom: 20 }}>
                  <div className="goal-meta">
                    <strong>{g.name}</strong>
                    <span>
                      {fmt(g.current, g.currency)} / {fmt(g.target, g.currency)}
                    </span>
                  </div>
                  <Progress
                    value={g.target ? (g.current / g.target) * 100 : 0}
                    label={g.name}
                  />
                  <small>
                    {m !== null
                      ? `Орієнтовно ${dateFmt(addMonths(new Date().toISOString().slice(0, 10), m))}`
                      : "Додайте щомісячний внесок"}
                  </small>
                </div>
              );
            })
          ) : (
            <Empty
              title="Визначте, заради чого збираєте"
              body="Квартира, авто, навчання чи власний бізнес. Кожній цілі — свій шлях."
              action={
                <Link href="/app/goals" className="button outline small">
                  Створити ціль
                </Link>
              }
            />
          )}
        </Card>
      </div>
      <Install />
      <div
        className="section-heading"
        style={{ marginTop: 35, marginBottom: 16 }}
      >
        <h2 style={{ fontSize: 18 }}>Дані ринку</h2>
        <Link className="inline-link" href="/data-sources">
          Джерела та стан оновлень <ArrowUpRight size={14} />
        </Link>
      </div>
      <div className="market-strip">
        {["USD", "EUR", "XAU", "XAG"].map((code) => {
          const r = market.rates.find((x) => x.code === code);
          return (
            <div className="market-item" key={code}>
              <span>
                {
                  (
                    {
                      USD: "Долар США",
                      EUR: "Євро",
                      XAU: "Золото · тройська унція",
                      XAG: "Срібло · тройська унція",
                    } as Record<string, string>
                  )[code]
                }
              </span>
              <strong style={{ fontSize: 18 }}>{r ? fmt(r.value) : "—"}</strong>
              <small>
                {r
                  ? `НБУ · ${dateFmt(r.meta.effectiveDate)}`
                  : "Актуальні дані недоступні"}
              </small>
            </div>
          );
        })}
      </div>
      {total === 0 && (
        <p className="muted" style={{ fontSize: 11, marginTop: 15 }}>
          Додайте ваші фактичні активи в розділі «Капітал». Суми з Portfolio Lab
          є сценарієм і не змінюють облік активів.
        </p>
      )}
    </>
  );
}
