"use client";
import Link from "next/link";
import { useCapital, useNumbers } from "./profile-context";
import { Card, Field, Stat, Progress, Tip, Badge } from "./ui";
import { fmt, pct } from "@/lib/format";
import { reserve, changeAllocation } from "@/lib/finance/calculations";
export function Reserve() {
  const { state, update } = useCapital(),
    { flow } = useNumbers();
  const r = state.reserve,
    result = reserve(
      (flow?.essential ?? 0) + (flow?.debt ?? 0),
      r.months,
      r.current,
      r.monthly,
    );
  const set = (patch: Partial<typeof r>) =>
    update((s) => ({ ...s, reserve: { ...s.reserve, ...patch } }));
  function storage(id: string, value: number) {
    const rows = changeAllocation(
      Object.entries(r.storage).map(([id, percent]) => ({
        id,
        percent,
        locked: false,
      })),
      id,
      value,
    );
    set({
      storage: Object.fromEntries(
        rows.map((x) => [x.id, x.percent]),
      ) as typeof r.storage,
    });
  }
  return (
    <>
      <div className="page-title">
        <div>
          <div className="eyebrow">
            <i />
            ВАША ФІНАНСОВА ПОДУШКА
          </div>
          <h1>Резерв спокою</h1>
          <p>Запас часу та грошей на непередбачене.</p>
        </div>
        <Badge kind="scenario">Ваш сценарій</Badge>
      </div>
      <div className="stats">
        <Stat label="Поточний резерв" value={fmt(r.current)} accent />
        <Stat
          label="Ваша ціль"
          value={fmt(result.target)}
          foot={`${r.months} місяців обов’язкових витрат і боргових платежів`}
        />
        <Stat label="Залишилось зібрати" value={fmt(result.gap)} />
        <Stat
          label="Місяців до цілі"
          value={result.months === null ? "—" : String(result.months)}
          foot="За заданого вами внеску, без дохідності"
        />
      </div>
      <Card>
        <div className="card-title">
          <h2>На скільки місяців потрібен запас?</h2>
        </div>
        <div className="tabs">
          {[1, 3, 6, 9, 12].map((m) => (
            <button
              className={r.months === m ? "active" : ""}
              key={m}
              onClick={() => set({ months: m })}
            >
              {m} міс.
            </button>
          ))}
        </div>
        <div className="form-grid">
          <Field
            label="Власна кількість місяців"
            value={r.months}
            onChange={(months) => set({ months })}
            max={120}
          />
          <Field
            label="Вже у резерві"
            value={r.current}
            onChange={(current) => set({ current })}
            suffix="₴"
          />
          <Field
            label="Ваш щомісячний внесок"
            value={r.monthly}
            onChange={(monthly) => set({ monthly })}
            suffix="₴"
          />
        </div>
        <Progress value={result.progress} label="Резерв" />
        <div className="goal-meta">
          <span>
            Обов’язкові витрати і борги:{" "}
            {fmt((flow?.essential ?? 0) + (flow?.debt ?? 0))} / місяць
          </span>
          <span>{pct(result.progress)}</span>
        </div>
        <Tip title="Навіщо фінансовий резерв?">
          Резерв допомагає покривати необхідні витрати, якщо дохід тимчасово
          зникне або виникне незапланована потреба. Ви самі обираєте кількість
          місяців; сервіс не призначає її автоматично.
        </Tip>
      </Card>
      <Card>
        <div className="card-title">
          <div>
            <h2>Reserve Storage Lab</h2>
            <p>Ваш розподіл між валютами. Без рекомендованих часток.</p>
          </div>
          <Badge>Разом 100%</Badge>
        </div>
        <div className="form-grid">
          {(["UAH", "USD", "EUR"] as const).map((code) => (
            <div key={code}>
              <Field
                label={code}
                value={Math.round(r.storage[code] * 100) / 100}
                onChange={(n) => storage(code, n)}
                max={100}
                suffix="%"
              />
              <small style={{ display: "block", marginTop: 10 }}>
                Гривневий еквівалент: {fmt((r.current * r.storage[code]) / 100)}
              </small>
            </div>
          ))}
        </div>
        <div className="notice">
          Гривня доступна для поточних гривневих витрат. Для USD / EUR потрібен
          обмін; фактичний результат залежить від курсу, спреду та доступності
          коштів.
        </div>
        <Tip title="Що таке валютний ризик?">
          Коли валюта накопичень відрізняється від валюти витрат, зміна курсу
          змінює доступну суму у валюті витрат. USD та EUR самі по собі не
          нараховують відсотків.
        </Tip>
        <Link
          href="/currency"
          className="inline-link"
          style={{ marginTop: 18 }}
        >
          Подивитися історичну поведінку валют ↗
        </Link>
      </Card>
    </>
  );
}
