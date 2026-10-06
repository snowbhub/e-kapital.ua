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
  Home,
  Bookmark,
} from "lucide-react";
import { Logo } from "./header";
import { useCapital } from "./profile-context";
import { Onboarding } from "./onboarding";
import { Badge } from "./ui";
const nav = [
  ["", "Порівняти", ChartNoAxesCombined],
  ["home", "Житло", Home],
  ["capital", "Мої активи", Landmark],
  ["plan", "Мої плани", Bookmark],
] as const;
const extraNav = [
  ["scenario", "Свій розрахунок", ChartNoAxesCombined],
  ["overview", "Огляд активів", LayoutDashboard],
  ["budget", "Бюджет", Wallet],
  ["reserve", "Резерв", Shield],
  ["goals", "Мої цілі", Target],
  ["portfolio", "Портфель", ChartNoAxesCombined],
  ["history", "Історія", History],
  ["settings", "Налаштування", Settings],
] as const;
export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const menu = useRef<HTMLDialogElement>(null);
  const { state, ready, error, saved } = useCapital();
  if (ready && !state.onboarded && path === "/app/setup") return <Onboarding />;
  return (
    <div className="app-layout">
      <aside className="sidebar">
        <Logo />
        <nav aria-label="Особистий кабінет">
          {nav.map(([slug, label, Icon]) => (
            <Link
              prefetch={false}
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
          <button
            className="sidebar-tools"
            onClick={() => menu.current?.showModal()}
            aria-haspopup="dialog"
          >
            <Grid2X2 size={18} /> Додаткові інструменти
          </button>
          <LockKeyhole size={17} />
          <p>Приватно на вашому пристрої</p>
          <Link
            prefetch={false}
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
            <span>Без реєстрації</span>
            <Badge kind="green">
              {!ready ? "На пристрої" : saved ? "Збережено" : "Зберігаємо…"}
            </Badge>
          </div>
        </div>
        {error && (
          <div role="alert" className="notice error">
            {error}
          </div>
        )}
        <div
          key={`${path}-${state.decision.resumeId ?? "new"}`}
          className="app-content page-enter"
        >
          {ready ? (
            children
          ) : (
            <section
              className="decision-loading"
              aria-busy="true"
              aria-label="Відкриваємо ваш фінансовий простір"
            >
              <span className="skeleton-line" />
              <span className="skeleton-title" />
              <span className="skeleton-line" />
              <div className="skeleton-form" />
              <p role="status">Відкриваємо ваш простір…</p>
            </section>
          )}
        </div>
      </main>
      <nav className="mobile-nav" aria-label="Основна навігація">
        {nav.map(([slug, label, Icon]) => {
          const href = `/app${slug ? "/" + slug : ""}`;
          return (
            <Link
              prefetch={false}
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
            extraNav.some(([slug]) => path === `/app/${slug}`) ? "active" : ""
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
          {extraNav.map(([slug, label, Icon]) => (
            <Link
              prefetch={false}
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
          <Link
            prefetch={false}
            href="/assets"
            onClick={() => menu.current?.close()}
          >
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
