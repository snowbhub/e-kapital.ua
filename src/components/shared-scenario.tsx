"use client";
import { useState, useEffect } from "react";
import { shareSchema } from "./portfolio";
import { projectPortfolio } from "@/lib/finance/portfolio";
import { emptyScenario, type Scenario } from "@/lib/finance/assets";
import { Chart, Card, Badge } from "./ui";
import { z } from "zod";
import { fmt, pct } from "@/lib/format";
export function SharedScenario() {
  const [payload, setPayload] = useState<z.infer<typeof shareSchema> | null>(
      null,
    ),
    [error, setError] = useState("");
  useEffect(() => {
    try {
      const hash = location.hash.slice(1);
      if (hash.length > 20000) throw new Error();
      const raw = JSON.parse(decodeURIComponent(escape(atob(hash))));
      const value = shareSchema.parse(raw);
      if (
        Math.abs(value.allocation.reduce((a, b) => a + b.percent, 0) - 100) >
        0.01
      )
        throw new Error();
      setPayload(value);
    } catch {
      setError("Посилання не містить коректного сценарію.");
    }
  }, []);
  if (error) return <div className="notice error">{error}</div>;
  if (!payload) return <p className="muted">Відкриваємо сценарій…</p>;
  const assumptions = { ...emptyScenario, ...payload.assumptions } as Scenario;
  const points = projectPortfolio(
    payload.hypotheticalCapital,
    payload.monthlyContribution,
    payload.allocation,
    payload.years,
    assumptions,
  );
  return (
    <Card>
      <Badge kind="scenario">Публічний гіпотетичний сценарій</Badge>
      <h2 style={{ margin: "20px 0" }}>
        Капітал {fmt(payload.hypotheticalCapital)} · {payload.years} років
      </h2>
      <p className="muted">
        Поповнення {fmt(payload.monthlyContribution)} / місяць. Припущення задав
        автор посилання.
      </p>
      <Chart
        series={points.map((v) => ({
          x: `${v.month} міс.`,
          a: v.nominal,
          b: v.real,
        }))}
        caption="Публічний сценарій за припущеннями автора"
      />
      <div className="assumption">
        {Object.entries(assumptions)
          .map(
            ([k, v]) =>
              `${k}: ${typeof v === "number" ? pct(v) : v ? "так" : "ні"}`,
          )
          .join(" · ")}
      </div>
    </Card>
  );
}
