import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
export function Logo() {
  return (
    <Link className="logo" href="/" aria-label="єКапітал — головна">
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
          <Link href="/assets">Активи</Link>
          <Link href="/eoselia">Житло</Link>
          <Link href="/finansova-gramotnist">Знання</Link>
        </nav>
        <Link href="/app" className="button small">
          Мій єКапітал <ArrowUpRight size={16} />
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
          Навігатор особистого капіталу.
          <br />
          Ваші гроші. Ваші рішення.
        </p>
      </div>
      <div className="footer-links">
        <Link href="/data-sources">Джерела даних</Link>
        <Link href="/privacy">Приватність</Link>
        <Link href="/legal">Умови використання</Link>
        <Link href="/assets">Усі активи</Link>
      </div>
      <p className="footer-note">
        єКапітал — незалежний освітній сервіс. Розрахунки за вашими припущеннями
        не є прогнозом або персональною інвестиційною рекомендацією. Ми не є
        державним сервісом і не приймаємо кошти для інвестування.
      </p>
    </footer>
  );
}
