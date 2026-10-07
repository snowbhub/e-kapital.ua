"use client";
import Link from "next/link";
import { useState, useRef } from "react";
import { Download, Upload, Trash2, LockKeyhole } from "lucide-react";
import { useCapital } from "./profile-context";
import { Card, Field, TextField, Badge } from "./ui";
import { encryptBackup, decryptBackup } from "@/lib/storage/db";
export function SettingsView() {
  const { state, update, market, erase, persist, account } = useCapital();
  const [password, setPassword] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const [deleteStep, setDeleteStep] = useState(0);
  async function exportData() {
    setBusy(true);
    setMessage("");
    try {
      const text = await encryptBackup(state, password),
        url = URL.createObjectURL(
          new Blob([text], { type: "application/json" }),
        );
      const a = document.createElement("a");
      a.href = url;
      a.download = `e-kapital-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage(
        "Зашифрований backup завантажено. Збережіть пароль: без нього відновлення неможливе.",
      );
    } catch (e) {
      setMessage((e as Error).message);
    }
    setBusy(false);
  }
  async function restore(file: File) {
    setBusy(true);
    setMessage("");
    try {
      const restored = await decryptBackup(await file.text(), password);
      if (confirm("Замінити всі поточні фінансові дані даними з backup?")) {
        if (!(await persist(() => restored)))
          throw new Error("Не вдалося відновити дані");
        setMessage("Дані відновлено.");
      }
    } catch (e) {
      setMessage((e as Error).message);
    }
    setBusy(false);
  }
  return (
    <>
      <div className="page-title">
        <div>
          <div className="eyebrow">
            <i />
            ВАШ КОНТРОЛЬ НАД ДАНИМИ
          </div>
          <h1>Налаштування</h1>
          <p>Приватність, резервна копія та власні курси.</p>
        </div>
        <Badge kind="green">Local-first</Badge>
      </div>
      {message && (
        <div role="status" className="notice">
          {message}
        </div>
      )}
      <Card>
        <div className="card-title">
          <h2>
            <LockKeyhole
              size={17}
              style={{ display: "inline", marginRight: 10 }}
            />
            Зашифрована резервна копія
          </h2>
        </div>
        <p className="muted" style={{ fontSize: 13, marginBottom: 22 }}>
          {account.user
            ? "Профіль синхронізується з сервером і має локальну копію."
            : "Особисті дані зберігаються у браузері цього пристрою."}{" "}
          Експортуйте backup, щоб відновити їх після очищення браузера або на
          іншому пристрої. Backup шифрується AES-GCM у вашому браузері, файл і
          пароль не надсилаються на сервер.
        </p>
        <div style={{ maxWidth: 400 }}>
          <TextField
            label="Пароль backup (щонайменше 10 символів)"
            value={password}
            onChange={setPassword}
            type="password"
          />
        </div>
        <div className="form-actions">
          <button
            className="button small"
            disabled={busy || password.length < 10}
            onClick={exportData}
          >
            <Download size={15} />
            Завантажити backup
          </button>
          <button
            className="button outline small"
            disabled={busy || password.length < 10}
            onClick={() => input.current?.click()}
          >
            <Upload size={15} />
            Відновити backup
          </button>
          <input
            ref={input}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void restore(file);
              e.target.value = "";
            }}
          />
        </div>
      </Card>
      <Card>
        <h2 style={{ marginBottom: 23 }}>Курси для вашого обліку</h2>
        <p className="muted" style={{ fontSize: 12, marginBottom: 20 }}>
          Якщо ви обліковуєте суми у USD / EUR, можна вказати власний курс UAH
          за одиницю. 0 очищує власний курс і повертає використання НБУ, якщо
          він доступний. Це ваше облікове значення, не ринкова котировка.
        </p>
        <div className="form-grid two">
          {(["USD", "EUR"] as const).map((code) => (
            <Field
              key={code}
              label={`Власний курс ${code}`}
              value={state.manualFx[code] ?? 0}
              onChange={(value) =>
                update((s) => ({
                  ...s,
                  manualFx: { ...s.manualFx, [code]: value || null },
                }))
              }
              suffix="₴"
              hint={
                market.rates.find((r) => r.code === code)
                  ? `НБУ: ${market.rates.find((r) => r.code === code)?.value} ₴`
                  : "Дані НБУ недоступні"
              }
            />
          ))}
        </div>
      </Card>
      <Card>
        <h2 style={{ marginBottom: 15 }}>Приватність</h2>
        <p className="muted" style={{ fontSize: 13 }}>
          ЄКапітал не підключається до банків і не просить банківські логіни.
          Гостьові дані залишаються на пристрої. Після входу ваш профіль
          синхронізується із сервером. Аналітика дій і приблизна географія за IP
          — лише за окремою згодою в акаунті. Backup шифрується локально.
          Хостинг може вести технічні журнали запитів. За допомогою публічного
          посилання ви самі поширюєте вказаний гіпотетичний сценарій.
        </p>
        <Link href="/privacy" className="inline-link" style={{ marginTop: 15 }}>
          Політика приватності ↗
        </Link>
      </Card>
      <Card>
        <h2 style={{ marginBottom: 15 }}>Видалити всі мої дані</h2>
        <p className="muted" style={{ fontSize: 12, marginBottom: 20 }}>
          Це видалить фінансовий профіль, усі місяці, цілі, активи, операції та
          збережені сценарії на цьому пристрої. Спочатку можна зберегти
          зашифрований backup.
        </p>
        {deleteStep === 0 ? (
          <button
            className="button outline small"
            onClick={() => setDeleteStep(1)}
          >
            <Trash2 size={14} />
            Видалити всі мої дані
          </button>
        ) : deleteStep === 1 ? (
          <div className="form-actions">
            <button
              className="button danger small"
              onClick={() => setDeleteStep(2)}
            >
              Так, хочу видалити
            </button>
            <button
              className="button outline small"
              onClick={() => setDeleteStep(0)}
            >
              Скасувати
            </button>
          </div>
        ) : (
          <div className="notice error">
            <p>Останнє підтвердження. Цю дію неможливо скасувати без backup.</p>
            <div className="form-actions">
              <button
                className="button danger small"
                onClick={async () => {
                  await erase();
                  setDeleteStep(0);
                  location.href = new URL("/app", location.origin).href;
                }}
              >
                Остаточно видалити
              </button>
              <button
                className="button outline small"
                onClick={() => setDeleteStep(0)}
              >
                Скасувати
              </button>
            </div>
          </div>
        )}
      </Card>
    </>
  );
}
