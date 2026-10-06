"use client";
import Link from "next/link";
import { Bookmark, ArrowRight, Trash2 } from "lucide-react";
import { useState } from "react";
import { useCapital } from "./profile-context";
import { Card, Badge, Empty } from "./ui";
import { fmt, dateFmt } from "@/lib/format";
export function DecisionPlans() {
  const { state, update } = useCapital();
  const [deleteId, setDeleteId] = useState("");
  return (
    <>
      <div className="decision-heading">
        <Badge kind="green">
          <Bookmark size={13} /> Ваш наступний крок
        </Badge>
        <h1>Мої плани</h1>
        <p>
          Збережені рішення, суми й припущення. Переглядайте їх, коли змінюються
          ваші обставини або умови ринку.
        </p>
      </div>
      {!state.decision.plans.length ? (
        <Card>
          <Empty
            title="План починається з одного рішення"
            body="Порівняйте свої варіанти й збережіть той, який хочете перевірити далі."
            action={
              <Link prefetch={false} className="button" href="/app">
                Порівняти мої варіанти <ArrowRight size={17} />
              </Link>
            }
          />
        </Card>
      ) : (
        <div className="plan-list">
          {[...state.decision.plans].reverse().map((p) => (
            <Card key={p.id} className="decision-plan">
              <div className="card-title">
                <div>
                  <Badge>{p.kind === "housing" ? "Житло" : "Інвестиції"}</Badge>
                  <h2>{p.name}</h2>
                </div>
                <small>{dateFmt(p.createdAt.slice(0, 10))}</small>
              </div>
              <p className="plan-inputs">
                {fmt(p.inputs.capital, p.inputs.currency)} зараз ·{" "}
                {fmt(p.inputs.monthly, p.inputs.currency)} / міс. ·{" "}
                {p.inputs.months} міс.
              </p>
              <p>{p.result}</p>
              <div className="next-step-box">
                <span className="eyebrow">МІЙ НАСТУПНИЙ КРОК</span>
                <p>{p.nextStep}</p>
              </div>
              <details className="option-assumptions">
                <summary>Припущення цього плану</summary>
                <ul>
                  {Object.entries(p.assumptions)
                    .filter(([k]) => !["mode", "optionId"].includes(k))
                    .map(([k, v]) => (
                      <li key={k}>
                        <span>
                          {(
                            {
                              bank: "Банк або інструмент",
                              currency: "Валюта",
                              rate: "Ставка до податку, %/рік",
                              netRate: "Ставка після податку, %/рік",
                              source: "Офіційне джерело",
                              projectedTotal: "Сума наприкінці у ₴",
                              realTotal: "Купівельна спроможність у ₴",
                              cashRate: "Виплати, %/рік",
                              priceRate: "Зміна вартості, %/рік",
                              tax: "Податок із виплат, %",
                              annualFee: "Річні комісії, %",
                              entryFee: "Витрати на вхід, %",
                              exitFee: "Витрати на вихід, %",
                              inflation: "Інфляція, %/рік",
                              reinvest: "Реінвестування",
                              stress: "Стрес-сценарій",
                              reference: "Орієнтир",
                              referenceDate: "Дата орієнтира",
                              price: "Ціна житла",
                              rent: "Оренда / місяць",
                              age: "Вік",
                              years: "Строк кредиту, років",
                              down: "Внесок",
                              fees: "Разові витрати",
                              upkeep: "Утримання / місяць",
                              houseGrowth: "Зміна ціни житла, %/рік",
                              rentGrowth: "Зростання оренди, %/рік",
                              investmentRate: "Чиста ставка сценарію, %/рік",
                              cashYield: "Чисті грошові виплати, %/рік",
                              subsidized: "Пільгова ставка",
                              category: "Категорія",
                              investmentMode: "Сценарій інвестицій",
                              referenceIsin: "Випуск-орієнтир",
                              referenceRateDate: "Дата розміщення",
                              capital: "Капітал",
                              monthly: "Поповнення",
                              months: "Горизонт, місяців",
                              purpose: "Мета",
                            } as Record<string, string>
                          )[k] ?? k}
                        </span>
                        <strong>
                          {typeof v === "boolean"
                            ? v
                              ? "Так"
                              : "Ні"
                            : String(v)}
                        </strong>
                      </li>
                    ))}
                </ul>
                <p>
                  Дані джерел на момент збереження: {dateFmt(p.sourceDate)}. Це
                  знімок сценарію, а не обіцянка або факт купівлі.
                </p>
              </details>
              <div className="form-actions">
                <Link
                  prefetch={false}
                  className="button outline small"
                  href={
                    p.kind === "housing"
                      ? "/app/home"
                      : p.assumptions.mode === "automatic"
                        ? "/app"
                        : "/app/scenario"
                  }
                  onClick={() =>
                    update((s) => ({
                      ...s,
                      decision: {
                        ...s.decision,
                        inputs: p.inputs,
                        resumeId: p.id,
                      },
                    }))
                  }
                >
                  Порахувати знову <ArrowRight size={15} />
                </Link>
                <button
                  className="icon-button"
                  aria-label={`Видалити план ${p.name}`}
                  onClick={() => setDeleteId(p.id)}
                >
                  <Trash2 size={17} />
                </button>
              </div>
              {deleteId === p.id && (
                <div className="notice">
                  <p>Видалити цей збережений план?</p>
                  <div className="form-actions">
                    <button
                      className="button danger small"
                      onClick={() => {
                        update((s) => ({
                          ...s,
                          decision: {
                            ...s.decision,
                            plans: s.decision.plans.filter(
                              (x) => x.id !== p.id,
                            ),
                          },
                        }));
                        setDeleteId("");
                      }}
                    >
                      Видалити план
                    </button>
                    <button
                      className="button outline small"
                      onClick={() => setDeleteId("")}
                    >
                      Скасувати
                    </button>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
      <p className="comparison-note">
        Плани зберігаються в цьому браузері. Для перенесення скористайтеся
        зашифрованою резервною копією в{" "}
        <Link prefetch={false} href="/app/settings">
          налаштуваннях
        </Link>
        . Реєстрація та синхронізація між пристроями поки не потрібні для
        користування.
      </p>
    </>
  );
}
