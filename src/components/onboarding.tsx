"use client";
import { useState } from "react";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Logo } from "./header";
import { Card, Field, Badge } from "./ui";
import { useCapital } from "./profile-context";
import { fmt } from "@/lib/format";
export function Onboarding() {
  const { update } = useCapital();
  const [step, setStep] = useState(0),
    [income, setIncome] = useState(0),
    [expenses, setExpenses] = useState(0),
    [reserve, setReserve] = useState(0),
    [capital, setCapital] = useState(0);
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
  return (
    <main id="main" className="container onboarding">
      <Logo />
      <div className="onboarding-step">
        {[0, 1, 2].map((i) => (
          <span key={i} className={i <= step ? "active" : ""} />
        ))}
      </div>
      <Badge kind="green">Знайомство · {step + 1} / 3</Badge>
      <h1>
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
            "Введіть свої місячні суми. Пізніше можна додати кілька доходів, різні валюти та детальні витрати.",
            "Резерв — це гроші на непередбачені витрати. Поточний капітал нижче вкажіть окремо, без суми резерву.",
            "Це основа вашого плану. Ви самі визначаєте, яку суму залишати вільною, відкладати на резерв, цілі чи інвестиції.",
          ][step]
        }
      </p>
      <Card>
        {step === 0 ? (
          <div className="form-grid two">
            <Field
              label="Місячний дохід після податків"
              value={income}
              onChange={setIncome}
              suffix="₴"
            />
            <Field
              label="Обов’язкові витрати на місяць"
              value={expenses}
              onChange={setExpenses}
              suffix="₴"
            />
          </div>
        ) : step === 1 ? (
          <div className="form-grid two">
            <Field
              label="Поточний фінансовий резерв"
              value={reserve}
              onChange={setReserve}
              suffix="₴"
            />
            <Field
              label="Інший поточний капітал (без резерву)"
              value={capital}
              onChange={setCapital}
              suffix="₴"
            />
          </div>
        ) : (
          <>
            <div className="eyebrow">ПІСЛЯ ВВЕДЕНИХ ВИТРАТ ЗАЛИШАЄТЬСЯ</div>
            <h2 style={{ fontSize: 38 }}>
              {fmt(income - expenses)} <small>/ місяць</small>
            </h2>
            <p className="muted" style={{ fontSize: 12, marginTop: 18 }}>
              Резерв: {fmt(reserve)} · Інший капітал: {fmt(capital)}
            </p>
          </>
        )}
        <div className="form-actions">
          {step > 0 && (
            <button
              className="button outline"
              onClick={() => setStep(step - 1)}
            >
              Назад
            </button>
          )}
          <button
            className="button"
            onClick={() => (step < 2 ? setStep(step + 1) : finish())}
          >
            {step === 2 ? "Відкрити мій єКапітал" : "Продовжити"}
            <ArrowRight size={16} />
          </button>
        </div>
      </Card>
      <p
        style={{ fontSize: 12, display: "flex", gap: 8, alignItems: "center" }}
      >
        <ShieldCheck size={16} />
        Фінансові дані зберігаються у вашому браузері. Реєстрація не потрібна.
      </p>
    </main>
  );
}
