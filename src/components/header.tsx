import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
export function Logo() {
  return (
    <Link
      prefetch={false}
      className="logo"
      href="/"
      aria-label="єКапітал — головна"
    >
      <span className="logo-symbol">є</span>
      <span>
        єКапітал<span className="logo-dot">.</span>
      </span>
    </Link>
  );
}
export function Header() {
  return (
    <header className="site-header">
      <div className="container header-inner">
        <Logo />
        <nav aria-label="Головна навігація">
          <Link prefetch={false} href="/assets">
            Активи
          </Link>
          <Link prefetch={false} href="/app/home">
            Житло
          </Link>
          <Link prefetch={false} href="/finansova-gramotnist">
            Знання
          </Link>
        </nav>
        <Link prefetch={false} href="/app" className="button small">
          Порівняти варіанти <ArrowUpRight size={16} />
        </Link>
      </div>
    </header>
  );
}
export function Footer() {
  return (
    <footer className="site-footer container">
      <div>
        <Logo />
        <p>
          Зрозумійте, що можуть дати ваші гроші.
          <br />
          Ваші гроші. Ваші рішення.
        </p>
      </div>
      <div className="footer-links">
        <Link prefetch={false} href="/data-sources">
          Джерела даних
        </Link>
        <Link prefetch={false} href="/privacy">
          Приватність
        </Link>
        <Link prefetch={false} href="/legal">
          Умови використання
        </Link>
        <Link prefetch={false} href="/assets">
          Усі активи
        </Link>
      </div>
      <p className="footer-note">
        єКапітал — незалежний освітній сервіс. Розрахунки за вашими припущеннями
        не є прогнозом або персональною інвестиційною рекомендацією. Ми не є
        державним сервісом і не приймаємо кошти для інвестування.
      </p>
    </footer>
  );
}
