"use client";
import { useCallback, useEffect, useState } from "react";
import { Users, Activity, RefreshCw, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useCapital } from "./profile-context";
type Metrics = {
  counts: {
    users: number;
    new_users: number;
    active_day: number;
    active_month: number;
    opted_in: number;
  };
  activity: { date: string; events: number; people: number }[];
  features: { feature: string; events: number; people: number }[];
  locations: {
    country: string | null;
    region: string | null;
    city: string | null;
    people: number;
  }[];
  people: {
    id: string;
    name: string;
    created_at: string;
    last_seen: string;
    country: string | null;
    region: string | null;
    city: string | null;
    ip: string | null;
  }[];
  coverage: string;
  updatedAt: string;
};
const names: Record<string, string> = {
  compare: "Порівняння",
  deposit: "Депозити",
  currency: "Валюта",
  fund: "Фонди",
  bond: "ОВДП",
  mix: "Мікси",
  property: "Нерухомість",
  business: "Бізнес",
  history: "Історичні сценарії",
  plan: "Плани",
  account: "Акаунт",
  metals: "Метали",
  stocks: "Фондовий ринок",
  forex: "Forex",
  other: "Інше",
};
export function AdminWorkspace() {
  const { account } = useCapital();
  const [data, setData] = useState<Metrics | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const refresh = useCallback(async () => {
    if (!account.user?.admin) return;
    setBusy(true);
    try {
      const r = await fetch("/api/admin/metrics", { cache: "no-store" }),
        v = await r.json();
      if (!r.ok) throw Error(v.error);
      setData(v);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [account.user?.admin]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  if (!account.user?.admin)
    return (
      <section className="account-panel">
        <ShieldCheck size={32} />
        <h1>Адміністрування</h1>
        <p>
          Доступ обмежено роллю адміністратора. Перший зареєстрований користувач
          не отримує її автоматично.
        </p>
        <Link href="/app/account" className="button">
          Мій акаунт
        </Link>
      </section>
    );
  return (
    <div className="admin-workspace">
      <div className="list-heading">
        <div>
          <span className="micro-label">КЕРУВАННЯ єКАПІТАЛОМ</span>
          <h1>Пульс застосунку</h1>
        </div>
        <button
          className="button outline"
          disabled={busy}
          onClick={() => void refresh()}
        >
          <RefreshCw size={17} /> Оновити
        </button>
      </div>
      {error && (
        <p role="alert" className="notice error">
          {error}
        </p>
      )}
      {!data ? (
        <p role="status">Завантажуємо метрики…</p>
      ) : (
        <>
          <div className="admin-stats">
            {[
              ["Усього акаунтів", data.counts.users],
              ["Нові за 7 днів", data.counts.new_users],
              ["Активні за добу", data.counts.active_day],
              ["Активні за 30 днів", data.counts.active_month],
            ].map(([label, value]) => (
              <section className="account-panel" key={label}>
                <Users size={19} />
                <span>{label}</span>
                <strong>{value}</strong>
              </section>
            ))}
          </div>
          <section className="account-panel">
            <h2>
              <Activity size={20} /> Активність за 30 днів
            </h2>
            <div className="admin-bars" aria-label="Кількість подій за днями">
              {data.activity.map((d) => (
                <div
                  key={d.date}
                  title={`${d.date}: ${d.events} подій, ${d.people} користувачів`}
                >
                  <span
                    style={{
                      height: `${Math.max(4, (100 * d.events) / Math.max(1, ...data.activity.map((x) => x.events)))}%`,
                    }}
                  />
                  <small>{d.date.slice(8)}</small>
                </div>
              ))}
            </div>
            {!data.activity.length && (
              <p>Ще немає подій від користувачів зі згодою.</p>
            )}
          </section>
          <div className="admin-columns">
            <section className="account-panel">
              <h2>Чим користуються</h2>
              {data.features.map((f) => (
                <div className="admin-metric-row" key={f.feature}>
                  <span>{names[f.feature] ?? f.feature}</span>
                  <strong>
                    {f.events} дій · {f.people} людей
                  </strong>
                </div>
              ))}
              {!data.features.length && (
                <p>Дані з’являться після перших дій.</p>
              )}
            </section>
            <section className="account-panel">
              <h2>Приблизна географія</h2>
              {data.locations.map((l, i) => (
                <div className="admin-metric-row" key={i}>
                  <span>
                    {[l.country, l.region, l.city]
                      .filter(Boolean)
                      .join(" · ") || "Невідомо"}
                  </span>
                  <strong>{l.people}</strong>
                </div>
              ))}
            </section>
          </div>
          <section className="account-panel">
            <h2>Останні 50 акаунтів</h2>
            <div className="admin-table">
              <table>
                <thead>
                  <tr>
                    <th>Профіль</th>
                    <th>Реєстрація</th>
                    <th>Остання активність</th>
                    <th>Географія</th>
                    <th>IP зі згодою</th>
                  </tr>
                </thead>
                <tbody>
                  {data.people.map((p) => (
                    <tr key={p.id}>
                      <td>
                        {p.name}
                        <small>{p.id}</small>
                      </td>
                      <td>
                        {new Date(p.created_at).toLocaleDateString("uk-UA")}
                      </td>
                      <td>{new Date(p.last_seen).toLocaleString("uk-UA")}</td>
                      <td>
                        {[p.country, p.city].filter(Boolean).join(" · ") ||
                          "Невідомо"}
                      </td>
                      <td>{p.ip ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <p className="account-hint">
            {data.coverage} Згоду дали {data.counts.opted_in} з{" "}
            {data.counts.users} акаунтів. Оновлено{" "}
            {new Date(data.updatedAt).toLocaleString("uk-UA")}. Час у графіку —
            UTC.
          </p>
        </>
      )}
    </div>
  );
}
