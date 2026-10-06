"use client";
import { useState } from "react";
import { Plus, Trash2, Camera } from "lucide-react";
import { useCapital, useNumbers } from "./profile-context";
import { Card, Stat, Field, Select, TextField, Empty, Badge } from "./ui";
import { assets, type AssetId } from "@/lib/finance/assets";
import { fmt, today } from "@/lib/format";
import { sum } from "@/lib/finance/calculations";
import type { State } from "@/lib/storage/schema";
export function Capital() {
  const { state, update } = useCapital(),
    { total, owed, netWorth, toUah } = useNumbers();
  const [name, setName] = useState(""),
    [value, setValue] = useState(0),
    [asset, setAsset] = useState<AssetId>("cash"),
    [currency, setCurrency] = useState<"UAH" | "USD" | "EUR">("UAH"),
    [bucket, setBucket] = useState<"liquid" | "investment" | "goal">(
      "investment",
    ),
    [debt, setDebt] = useState(false);
  const [txAsset, setTxAsset] = useState<AssetId>("cash"),
    [txType, setTxType] =
      useState<State["transactions"][number]["type"]>("buy"),
    [txAmount, setTxAmount] = useState(0),
    [txCurrency, setTxCurrency] = useState<"UAH" | "USD" | "EUR">("UAH"),
    [txDate, setTxDate] = useState(today()),
    [note, setNote] = useState(""),
    [recorded, setRecorded] = useState(false),
    [message, setMessage] = useState("");
  const group = (id: string) => {
    const values = state.holdings
      .filter((h) => h.bucket === id)
      .map((h) => toUah(h.value, h.currency));
    return values.some((v) => v === null)
      ? "Потрібні курси"
      : fmt(sum(values as number[]));
  };
  function add() {
    if (!name.trim()) return;
    update((s) => ({
      ...s,
      ...(debt
        ? {
            liabilities: [
              ...s.liabilities,
              { id: crypto.randomUUID(), name, value, currency },
            ],
          }
        : {
            holdings: [
              ...s.holdings,
              {
                id: crypto.randomUUID(),
                name,
                value,
                currency,
                assetId: asset,
                bucket,
              },
            ],
          }),
    }));
    setName("");
    setValue(0);
  }
  function snapshot() {
    if (netWorth === null) return;
    const txValues = state.transactions
      .filter((t) => ["buy", "contribution"].includes(t.type))
      .map((t) => toUah(t.amount, t.currency));
    const goalValues = state.goals.map((g) => toUah(g.current, g.currency));
    if ([...txValues, ...goalValues].some((v) => v === null)) {
      setMessage(
        "Вкажіть курси всіх валют у налаштуваннях, щоб зберегти точний знімок.",
      );
      return;
    }
    const contributions = sum(txValues as number[]);
    const goalProgress = sum(goalValues as number[]);
    const row = {
      date: today(),
      netWorth,
      contributions,
      goalProgress,
      allocation: state.portfolio.allocation.map((a) => ({
        id: a.id,
        percent: a.percent,
      })),
    };
    update((s) => ({
      ...s,
      snapshots: [...s.snapshots.filter((p) => p.date !== row.date), row],
    }));
    setMessage("Знімок капіталу на сьогодні збережено.");
  }
  return (
    <>
      <div className="page-title">
        <div>
          <div className="eyebrow">
            <i />
            ФАКТИЧНИЙ ОБЛІК
          </div>
          <h1>Мій капітал</h1>
          <p>Усе, чим володієте, і всі ваші зобов’язання.</p>
        </div>
        <button
          className="button outline small"
          disabled={netWorth === null}
          onClick={snapshot}
        >
          <Camera size={15} />
          Зберегти знімок
        </button>
      </div>
      {message && (
        <div className="notice" role="status">
          {message}
        </div>
      )}
      <div className="stats">
        <Stat
          label="Загальна сума активів"
          value={total === null ? "Потрібні курси" : fmt(total)}
        />
        <Stat
          label="Зобов’язання"
          value={owed === null ? "Потрібні курси" : fmt(owed)}
        />
        <Stat
          label="Чистий капітал"
          value={netWorth === null ? "Потрібні курси" : fmt(netWorth)}
          accent
        />
        <Stat label="Ліквідні активи" value={group("liquid")} />
      </div>
      <Card>
        <div className="card-title">
          <h2>Додати актив або зобов’язання</h2>
          <Badge>Ручний облік</Badge>
        </div>
        <label className="check" style={{ marginBottom: 15 }}>
          <input
            type="checkbox"
            checked={debt}
            onChange={(e) => setDebt(e.target.checked)}
          />
          Це зобов’язання / борг
        </label>
        <div className="form-grid">
          <TextField label="Назва" value={name} onChange={setName} />
          <Field
            label={debt ? "Поточний залишок боргу" : "Поточна оцінка активу"}
            value={value}
            onChange={setValue}
          />
          <Select
            label="Валюта суми"
            value={currency}
            onChange={(v) => setCurrency(v as typeof currency)}
            options={["UAH", "USD", "EUR"].map((x) => ({ value: x, label: x }))}
          />
          {!debt && (
            <>
              <Select
                label="Тип активу"
                value={asset}
                onChange={(v) => setAsset(v as AssetId)}
                options={assets.map((a) => ({ value: a.id, label: a.name }))}
              />
              <Select
                label="Призначення"
                value={bucket}
                onChange={(v) => setBucket(v as typeof bucket)}
                options={[
                  { value: "liquid", label: "Ліквідні кошти / резерв" },
                  { value: "investment", label: "Інвестиційні активи" },
                  { value: "goal", label: "Кошти фінансової цілі" },
                ]}
              />
            </>
          )}
        </div>
        <button className="button small" disabled={!name.trim()} onClick={add}>
          <Plus size={14} />
          Додати {debt ? "борг" : "актив"}
        </button>
        <p className="muted" style={{ fontSize: 11, marginTop: 15 }}>
          Вкажіть поточну вартість власного активу. Записи в резерві й цілях є
          планами; для загального капіталу внесіть відповідні активи тут один
          раз.
        </p>
      </Card>
      <Card>
        <div className="card-title">
          <h2>Ваші активи</h2>
          <small>
            Інвестиційні: {group("investment")} · Кошти цілей: {group("goal")}
          </small>
        </div>
        {state.holdings.length ? (
          <div className="table-scroll">
            <table className="editable-table">
              <thead>
                <tr>
                  <th>Актив</th>
                  <th>Тип</th>
                  <th>Поточна оцінка</th>
                  <th>Валюта</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {state.holdings.map((h) => (
                  <tr key={h.id}>
                    <td data-label="Актив">{h.name}</td>
                    <td data-label="Тип">
                      {assets.find((a) => a.id === h.assetId)?.name ??
                        h.assetId}
                    </td>
                    <td data-label="Поточна оцінка">
                      <Field
                        label={`Вартість ${h.name}`}
                        value={h.value}
                        onChange={(value) =>
                          update((s) => ({
                            ...s,
                            holdings: s.holdings.map((x) =>
                              x.id === h.id ? { ...x, value } : x,
                            ),
                          }))
                        }
                      />
                    </td>
                    <td data-label="Валюта">{h.currency}</td>
                    <td className="table-delete">
                      <button
                        className="icon-button"
                        aria-label={`Видалити актив ${h.name}`}
                        onClick={() =>
                          update((s) => ({
                            ...s,
                            holdings: s.holdings.filter((x) => x.id !== h.id),
                          }))
                        }
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title="Поки немає активів"
            body="Додайте поточні залишки на рахунках, депозит, ОВДП, валюту чи інший капітал."
          />
        )}
      </Card>
      {state.liabilities.length > 0 && (
        <Card>
          <h2 style={{ marginBottom: 20 }}>Зобов’язання</h2>
          <div className="table-scroll">
            <table className="editable-table">
              <thead>
                <tr>
                  <th>Назва</th>
                  <th>Залишок</th>
                  <th>Валюта</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {state.liabilities.map((l) => (
                  <tr key={l.id}>
                    <td data-label="Назва">{l.name}</td>
                    <td data-label="Залишок">
                      <Field
                        label={`Залишок боргу ${l.name}`}
                        value={l.value}
                        onChange={(value) =>
                          update((s) => ({
                            ...s,
                            liabilities: s.liabilities.map((x) =>
                              x.id === l.id ? { ...x, value } : x,
                            ),
                          }))
                        }
                      />
                    </td>
                    <td data-label="Валюта">{l.currency}</td>
                    <td className="table-delete">
                      <button
                        className="icon-button"
                        aria-label={`Видалити борг ${l.name}`}
                        onClick={() =>
                          update((s) => ({
                            ...s,
                            liabilities: s.liabilities.filter(
                              (x) => x.id !== l.id,
                            ),
                          }))
                        }
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      <Card>
        <h2 style={{ marginBottom: 23 }}>Записати операцію</h2>
        <div className="form-grid">
          <Select
            label="Актив"
            value={txAsset}
            onChange={(v) => setTxAsset(v as AssetId)}
            options={assets.map((a) => ({ value: a.id, label: a.name }))}
          />
          <Select
            label="Операція"
            value={txType}
            onChange={(v) => setTxType(v as typeof txType)}
            options={[
              ["buy", "Купівля"],
              ["sell", "Продаж"],
              ["contribution", "Внесок / депозит"],
              ["redemption", "Погашення"],
              ["dividend", "Дивіденд"],
              ["coupon", "Купон"],
            ].map(([value, label]) => ({ value, label }))}
          />
          <Field
            label="Сума операції"
            value={txAmount}
            onChange={setTxAmount}
          />
          <Select
            label="Валюта"
            value={txCurrency}
            onChange={(v) => setTxCurrency(v as typeof txCurrency)}
            options={["UAH", "USD", "EUR"].map((x) => ({ value: x, label: x }))}
          />
          <TextField
            label="Дата"
            value={txDate}
            onChange={setTxDate}
            type="date"
          />
          <TextField label="Коментар" value={note} onChange={setNote} />
        </div>
        <button
          className="button small"
          disabled={txAmount <= 0 || !txDate}
          onClick={() => {
            update((s) => ({
              ...s,
              transactions: [
                ...s.transactions,
                {
                  id: crypto.randomUUID(),
                  date: txDate,
                  assetId: txAsset,
                  type: txType,
                  amount: txAmount,
                  currency: txCurrency,
                  note,
                },
              ],
            }));
            setTxAmount(0);
            setNote("");
            setRecorded(true);
          }}
        >
          Зберегти операцію
        </button>
        {recorded && (
          <span role="status" style={{ fontSize: 12, marginLeft: 15 }}>
            Операцію записано
          </span>
        )}
        <p className="muted" style={{ fontSize: 11, marginTop: 15 }}>
          Операції зберігаються у журналі. Поточну оцінку активів оновлюйте
          окремо: сума купівлі не завжди дорівнює поточній вартості.
        </p>
      </Card>
    </>
  );
}
