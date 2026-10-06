"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";
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
  Grid2X2,
  X,
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
  const menu = useRef<HTMLDialogElement>(null);
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
              aria-current={
                path === `/app${slug ? "/" + slug : ""}` ? "page" : undefined
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
      <nav className="mobile-nav" aria-label="Основна навігація">
        {nav
          .filter(([slug]) =>
            ["", "budget", "goals", "portfolio"].includes(slug),
          )
          .map(([slug, label, Icon]) => {
            const href = `/app${slug ? "/" + slug : ""}`;
            return (
              <Link
                key={slug}
                href={href}
                className={path === href ? "active" : ""}
                aria-current={path === href ? "page" : undefined}
              >
                <Icon size={21} />
                <span>{label}</span>
              </Link>
            );
          })}
        <button
          className={
            nav
              .slice(2)
              .filter(([slug]) => !["goals", "portfolio"].includes(slug))
              .some(([slug]) => path === `/app/${slug}`)
              ? "active"
              : ""
          }
          onClick={() => menu.current?.showModal()}
          aria-haspopup="dialog"
        >
          <Grid2X2 size={21} />
          <span>Меню</span>
        </button>
      </nav>
      <dialog
        ref={menu}
        className="app-menu"
        aria-labelledby="app-menu-title"
        onClick={(e) => {
          if (e.target === e.currentTarget) menu.current?.close();
        }}
      >
        <div className="menu-header">
          <div>
            <span className="eyebrow">ВАШ ПРОСТІР</span>
            <h2 id="app-menu-title">Більше можливостей</h2>
          </div>
          <button
            className="icon-button"
            aria-label="Закрити меню"
            onClick={() => menu.current?.close()}
          >
            <X size={22} />
          </button>
        </div>
        <nav aria-label="Додаткові розділи">
          {nav
            .filter(([slug]) =>
              ["reserve", "capital", "history", "settings"].includes(slug),
            )
            .map(([slug, label, Icon]) => (
              <Link
                key={slug}
                href={`/app/${slug}`}
                aria-current={path === `/app/${slug}` ? "page" : undefined}
                onClick={() => menu.current?.close()}
              >
                <span className="menu-icon">
                  <Icon size={23} />
                </span>
                <span>{label}</span>
                <ArrowUpRight size={18} />
              </Link>
            ))}
          <Link href="/assets" onClick={() => menu.current?.close()}>
            <span className="menu-icon">
              <ChartNoAxesCombined size={23} />
            </span>
            <span>Дослідити активи</span>
            <ArrowUpRight size={18} />
          </Link>
        </nav>
        <div className="menu-privacy">
          <LockKeyhole size={16} /> Приватно на вашому пристрої
        </div>
      </dialog>
    </div>
  );
}
