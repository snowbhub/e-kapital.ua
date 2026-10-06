"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Wallet,
  Shield,
  Target,
  ChartNoAxesCombined,
  Landmark,
  History,
  Settings,
  LockKeyhole,
  ArrowUpRight,
} from "lucide-react";
import { Logo } from "./header";
import { useCapital } from "./profile-context";
import { Onboarding } from "./onboarding";
import { Badge } from "./ui";
const nav = [
  ["", "Огляд", LayoutDashboard],
  ["budget", "Бюджет", Wallet],
  ["reserve", "Резерв", Shield],
  ["goals", "Мої цілі", Target],
  ["portfolio", "Портфель", ChartNoAxesCombined],
  ["capital", "Капітал", Landmark],
  ["history", "Історія", History],
  ["settings", "Налаштування", Settings],
] as const;
export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { state, ready, error, saved } = useCapital();
  if (!ready)
    return (
      <main id="main" className="container onboarding">
        <Logo />
        <h1>Відкриваємо ваш єКапітал</h1>
        <p>{error || "Дані зберігаються на цьому пристрої."}</p>
      </main>
    );
  if (!state.onboarded) return <Onboarding />;
  return (
    <div className="app-layout">
      <aside className="sidebar">
        <Logo />
        <nav aria-label="Особистий кабінет">
          {nav.map(([slug, label, Icon]) => (
            <Link
              href={`/app${slug ? "/" + slug : ""}`}
              className={
                path === `/app${slug ? "/" + slug : ""}` ? "active" : ""
              }
              key={slug}
            >
              <Icon size={18} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <LockKeyhole size={17} />
          <p>Приватно на вашому пристрої</p>
          <Link
            href="/assets"
            className="inline-link"
            style={{ marginTop: 18 }}
          >
            Дослідити активи <ArrowUpRight size={14} />
          </Link>
        </div>
      </aside>
      <main id="main" className="app-main">
        <div className="app-topbar">
          <div>
            <span className="mobile-brand">
              <Logo />
            </span>
            <span className="desktop-greeting">
              Ваші гроші. <strong>Ваші рішення.</strong>
            </span>
          </div>
          <div>
            <span>
              {new Date(
                state.currentPeriod + "-01T12:00:00",
              ).toLocaleDateString("uk-UA", { month: "long", year: "numeric" })}
            </span>
            <Badge kind="green">{saved ? "Збережено" : "Зберігаємо…"}</Badge>
          </div>
        </div>
        {error && (
          <div role="alert" className="notice error">
            {error}
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
