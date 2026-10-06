"use client";
import { useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Wallet,
  Shield,
  Sparkles,
} from "lucide-react";
import { Logo } from "./header";
import { Field } from "./ui";
import { useCapital } from "./profile-context";
import { fmt } from "@/lib/format";
export function Onboarding() {
  const { update } = useCapital();
  const [step, setStep] = useState(0),
    [income, setIncome] = useState(0),
    [expenses, setExpenses] = useState(0),
    [reserve, setReserve] = useState(0),
    [capital, setCapital] = useState(0);
  const title = useRef<HTMLHeadingElement>(null);
  function move(next: number) {
    setStep(next);
    requestAnimationFrame(() => {
      title.current?.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }
  function finish() {
    update((s) => ({
      ...s,
      onboarded: true,
      reserve: { ...s.reserve, current: reserve },
      portfolio: { ...s.portfolio, capital },
      holdings: [
        ...(reserve > 0
          ? [
              {
                id: crypto.randomUUID(),
                assetId: "cash" as const,
                name: "Фінансовий резерв",
                value: reserve,
                currency: "UAH" as const,
                bucket: "liquid" as const,
              },
            ]
          : []),
        ...(capital > 0
          ? [
              {
                id: crypto.randomUUID(),
                assetId: "cash" as const,
                name: "Поточний капітал",
                value: capital,
                currency: "UAH" as const,
                bucket: "investment" as const,
              },
            ]
          : []),
      ],
      periods: s.periods.map((p) =>
        p.id === s.currentPeriod
          ? {
              ...p,
              incomes: income
                ? [
                    {
                      id: crypto.randomUUID(),
                      name: "Основний дохід",
                      amount: income,
                      currency: "UAH",
                      frequency: "monthly",
                      regular: true,
                      essential: false,
                      debt: false,
                    },
                  ]
                : [],
              expenses: expenses
                ? [
                    {
                      id: crypto.randomUUID(),
                      name: "Обов’язкові витрати",
                      amount: expenses,
                      currency: "UAH",
                      frequency: "monthly",
                      regular: true,
                      essential: true,
                      debt: false,
                    },
                  ]
                : [],
            }
          : p,
      ),
    }));
  }
  const StepIcon = [Wallet, Shield, Sparkles][step];
  return (
    <main id="main" className="onboarding-screen">
      <header className="onboarding-header">
        <Logo />
        <span className="onboarding-private">
          <ShieldCheck size={16} /> Особистий простір
        </span>
      </header>
      <div className="onboarding-layout">
        <aside className="onboarding-story">
          <div className="eyebrow">ВАШ ФІНАНСОВИЙ ПРОСТІР</div>
          <h2>
            Плани великі.
            <br />
            Початок простий.
          </h2>
          <p>Кілька цифр сьогодні — чіткіша картина вашого завтра.</p>
          <div className="capital-art" aria-hidden="true">
            <div className="art-orbit" />
            <div className="art-card">
              <span>
                єКапітал <Sparkles size={19} />
              </span>
              <div className="art-monogram">є</div>
              <strong>
                Ваші гроші.
                <br />
                Ваші можливості.
              </strong>
              <div className="art-chips">
                <span>Резерв</span>
                <span>Цілі</span>
                <span>Капітал</span>
              </div>
            </div>
            <div className="art-note">
              <ShieldCheck size={22} />
              <span>
                Почніть із себе<strong>Власний план, у вашому темпі</strong>
              </span>
            </div>
          </div>
          <div className="story-footer">
            <ShieldCheck size={17} /> Ваші фінансові дані залишаються на цьому
            пристрої.
          </div>
        </aside>
        <section className="onboarding-panel">
          <div
            className="onboarding-progress"
            aria-label={`Знайомство: крок ${step + 1} із 3`}
          >
            {["Ваш місяць", "Ваш запас", "Ваш план"].map((label, i) => (
              <div key={label} className={i <= step ? "active" : ""}>
                <span />
                <small>{label}</small>
              </div>
            ))}
          </div>
          <div className="onboarding-copy">
            <span className="step-icon">
              <StepIcon size={24} />
            </span>
            <div className="step-caption">Знайомство · {step + 1} / 3</div>
            <h1 ref={title} tabIndex={-1}>
              {
                [
                  "Почнімо з вашої реальності.",
                  "Скільки вже є в запасі?",
                  "Тепер ви бачите картину.",
                ][step]
              }
            </h1>
            <p>
              {
                [
                  "Дохід і необхідні витрати — основа вашого місяця. Деталі можна додати пізніше.",
                  "Резерв — ваш запас на непередбачені витрати. Інші заощадження вкажіть окремо.",
                  "Ви самі обираєте, скільки залишати вільним, відкладати на резерв, цілі та інвестиції.",
                ][step]
              }
            </p>
          </div>
          <form
            className="onboarding-form"
            key={step}
            onSubmit={(e) => {
              e.preventDefault();
              if (step < 2) move(step + 1);
              else finish();
            }}
          >
            {step === 0 ? (
              <div className="form-grid two">
                <Field
                  label="Місячний дохід після податків"
                  value={income}
                  onChange={setIncome}
                  suffix="₴"
                  hint="Сума, яку отримуєте на руки"
                />
                <Field
                  label="Обов’язкові витрати на місяць"
                  value={expenses}
                  onChange={setExpenses}
                  suffix="₴"
                  hint="Житло, їжа, транспорт і платежі"
                />
              </div>
            ) : step === 1 ? (
              <div className="form-grid two">
                <Field
                  label="Поточний фінансовий резерв"
                  value={reserve}
                  onChange={setReserve}
                  suffix="₴"
                  hint="Гроші, доступні в разі потреби"
                />
                <Field
                  label="Інший поточний капітал (без резерву)"
                  value={capital}
                  onChange={setCapital}
                  suffix="₴"
                  hint="Заощадження й інвестиції окремо від резерву"
                />
              </div>
            ) : (
              <div className="onboarding-summary">
                <span>Після введених витрат залишається</span>
                <strong>
                  {fmt(income - expenses)}
                  <small> / місяць</small>
                </strong>
                <div>
                  <span>
                    Ваш резерв<b>{fmt(reserve)}</b>
                  </span>
                  <span>
                    Інший капітал<b>{fmt(capital)}</b>
                  </span>
                </div>
                {expenses > income && (
                  <p>
                    Витрати перевищують дохід. У бюджеті ви зможете скоригувати
                    свій план.
                  </p>
                )}
              </div>
            )}
            {step < 2 && (
              <div className="onboarding-context">
                <span>
                  {step === 0
                    ? "Залишок після витрат"
                    : "Разом резерв і капітал"}
                </span>
                <strong>
                  {fmt(step === 0 ? income - expenses : reserve + capital)}
                </strong>
              </div>
            )}
            <div className="form-actions onboarding-actions">
              {step > 0 && (
                <button
                  type="button"
                  className="button outline"
                  onClick={() => move(step - 1)}
                >
                  <ArrowLeft size={18} />
                  Назад
                </button>
              )}
              <button className="button" type="submit">
                {step === 2 ? "Відкрити мій єКапітал" : "Продовжити"}
                <ArrowRight size={18} />
              </button>
            </div>
          </form>
          <p className="onboarding-foot">
            <ShieldCheck size={16} />
            <span>
              Дані зберігаються у вашому браузері.
              <br />
              Реєстрація не потрібна.
            </span>
          </p>
        </section>
      </div>
    </main>
  );
}
