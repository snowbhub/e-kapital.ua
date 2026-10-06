"use client";
import { type ReactNode, useId, useSyncExternalStore } from "react";
import { ArrowUpRight, Info } from "lucide-react";
import { fmt } from "@/lib/format";
const subscribe = () => () => {};
const clientReady = () => true;
const serverReady = () => false;
const useInteractive = () =>
  useSyncExternalStore(subscribe, clientReady, serverReady);
export function Field({
  label,
  value,
  onChange,
  min = 0,
  max = 1e12,
  step = "any",
  suffix,
  hint,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: string | number;
  suffix?: string;
  hint?: string;
}) {
  const id = useId();
  const interactive = useInteractive();
  return (
    <label className="field" htmlFor={id}>
      <span>{label}</span>
      <div className="input-wrap">
        <input
          id={id}
          disabled={!interactive}
          aria-label={label}
          type="number"
          inputMode="decimal"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (Number.isFinite(n) && n >= min && n <= max)
              onChange(step === 1 ? Math.floor(n) : n);
          }}
        />
        {suffix && <small>{suffix}</small>}
      </div>
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function TextField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  const id = useId();
  const interactive = useInteractive();
  return (
    <label className="field" htmlFor={id}>
      <span>{label}</span>
      <input
        id={id}
        disabled={!interactive}
        value={value}
        type={type}
        maxLength={160}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
export function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  const id = useId();
  const interactive = useInteractive();
  return (
    <label className="field" htmlFor={id}>
      <span>{label}</span>
      <select
        id={id}
        disabled={!interactive}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={`card ${className}`}>{children}</section>;
}
export function Stat({
  label,
  value,
  foot,
  accent = false,
}: {
  label: string;
  value: string;
  foot?: string;
  accent?: boolean;
}) {
  return (
    <div className={`stat ${accent ? "stat-accent" : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {foot && <small>{foot}</small>}
    </div>
  );
}
export function Progress({ value, label }: { value: number; label: string }) {
  return (
    <div
      className="progress"
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <span style={{ width: `${Math.max(0, Math.min(value, 100))}%` }} />
    </div>
  );
}
export function Empty({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty-mark">＋</div>
      <h3>{title}</h3>
      <p>{body}</p>
      {action}
    </div>
  );
}
export function Tip({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <details className="tip">
      <summary>
        <Info size={15} />
        {title}
      </summary>
      <p>{children}</p>
    </details>
  );
}
export function Badge({
  children,
  kind = "neutral",
}: {
  children: ReactNode;
  kind?: string;
}) {
  return <span className={`badge badge-${kind}`}>{children}</span>;
}
export function Chart({
  series,
  labels = ["Номінальна вартість", "Реальна вартість"],
  caption,
}: {
  series: { x: string; a: number; b?: number }[];
  labels?: string[];
  caption: string;
}) {
  if (series.length < 2)
    return <p className="muted">Графік з’явиться після введення даних.</p>;
  const width = 700,
    height = 235,
    pad = 18,
    max = Math.max(1, ...series.flatMap((p) => [p.a, p.b ?? 0])),
    min = Math.min(0, ...series.flatMap((p) => [p.a, p.b ?? 0]));
  const path = (field: "a" | "b") =>
    series
      .map(
        (p, i) =>
          `${i === 0 ? "M" : "L"}${pad + (i / (series.length - 1)) * (width - pad * 2)},${height - pad - (((p[field] ?? 0) - min) / (max - min)) * (height - pad * 2)}`,
      )
      .join(" ");
  return (
    <figure className="chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={caption}>
        {[0, 1, 2, 3].map((i) => (
          <line
            key={i}
            x1={pad}
            x2={width - pad}
            y1={pad + (i * (height - pad * 2)) / 3}
            y2={pad + (i * (height - pad * 2)) / 3}
            stroke="#e3e6df"
            strokeDasharray="4 5"
          />
        ))}
        <path
          d={`${path("a")} L${width - pad},${height - pad} L${pad},${height - pad} Z`}
          fill="#c7dca5"
          opacity=".22"
        />
        <path d={path("a")} fill="none" stroke="#557144" strokeWidth="3" />
        {series.some((p) => p.b !== undefined) && (
          <path
            d={path("b")}
            fill="none"
            stroke="#a9997f"
            strokeWidth="2"
            strokeDasharray="6 4"
          />
        )}
      </svg>
      <div className="chart-axis">
        <span>{series[0].x}</span>
        <span>{fmt(max)}</span>
        <span>{series.at(-1)!.x}</span>
      </div>
      <figcaption>
        <span className="legend-dot" />
        {labels[0]}
        {series.some((p) => p.b !== undefined) && (
          <>
            <span className="legend-dot second" />
            {labels[1]}
          </>
        )}
        <p className="sr-only">
          {caption}. На початку {fmt(series[0].a)}, наприкінці{" "}
          {fmt(series.at(-1)!.a)}.{" "}
          {series.at(-1)!.b !== undefined
            ? `Реальна вартість ${fmt(series.at(-1)!.b!)}.`
            : ""}
        </p>
      </figcaption>
    </figure>
  );
}
export function Arrow() {
  return <ArrowUpRight size={18} />;
}
