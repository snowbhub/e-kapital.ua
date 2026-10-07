"use client";
import Link from "next/link";
import { useState } from "react";
import {
  Fingerprint,
  Cloud,
  ShieldCheck,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { useCapital } from "./profile-context";
export function AccountWorkspace() {
  const { account, cloud, erase } = useCapital();
  const [name, setName] = useState(""),
    [register, setRegister] = useState(false),
    [remove, setRemove] = useState(false),
    [message, setMessage] = useState("");
  const u = account.user;
  return (
    <div className="account-workspace">
      <div className="account-hero">
        <div className="account-emblem">
          <Fingerprint size={36} />
        </div>
        <span className="micro-label">ВАШ ОСОБИСТИЙ ПРОСТІР</span>
        <h1>{u ? `Вітаю, ${u.name}` : "Ваші плани — з вами"}</h1>
        <p>
          {u
            ? cloud.status
            : "Ключ доступу замість пароля. Один профіль на ваших пристроях."}
        </p>
      </div>
      {account.error && (
        <p role="alert" className="notice error">
          {account.error}
        </p>
      )}
      {message && (
        <p role="status" className="notice">
          {message}
        </p>
      )}
      {!u ? (
        <section className="account-panel">
          {!account.enabled && (
            <p className="notice">
              Акаунти ще не підключені до бази даних. Ваші плани працюють на
              цьому пристрої.
            </p>
          )}
          <div className="pill-switch">
            <button
              className={!register ? "active" : ""}
              onClick={() => setRegister(false)}
            >
              Увійти
            </button>
            <button
              className={register ? "active" : ""}
              onClick={() => setRegister(true)}
            >
              Створити профіль
            </button>
          </div>
          {register && (
            <label className="account-field">
              Як до вас звертатися?
              <input
                autoComplete="nickname"
                maxLength={80}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ваше ім’я"
              />
            </label>
          )}
          <button
            className="button"
            disabled={
              !account.enabled || account.busy || (register && !name.trim())
            }
            onClick={() =>
              void account.authenticate(register ? "register" : "login", name)
            }
          >
            <Fingerprint size={19} />
            {account.busy
              ? "Підтвердіть на пристрої…"
              : register
                ? "Створити ключ доступу"
                : "Увійти з ключем доступу"}
          </button>
          <p className="account-hint">
            Face ID, Touch ID або PIN перевіряє ваш пристрій. Біометрію ми не
            отримуємо. Збережіть passkey у менеджері ключів і додайте запасний
            ключ після входу.
          </p>
          <Link href="/app" className="inline-link">
            Продовжити на пристрої <ChevronRight size={16} />
          </Link>
          <p className="account-hint">
            Створюючи профіль, ви обираєте серверне зберігання своїх фінансових
            даних. <Link href="/privacy">Як обробляємо дані</Link>
          </p>
        </section>
      ) : (
        <>
          <section className="account-panel">
            <h2>
              <Cloud size={20} /> Синхронізація
            </h2>
            <p role="status">{cloud.status}</p>
            <div className="form-actions">
              <button
                className="button outline"
                disabled={!cloud.hydrated && !cloud.conflict}
                onClick={() => {
                  if (
                    confirm(
                      "Замінити поточні дані профілю останньою копією з сервера? Локальні незбережені зміни буде втрачено.",
                    )
                  )
                    void cloud.reload();
                }}
              >
                Завантажити з профілю
              </button>
              <button
                className="button"
                disabled={!cloud.hydrated || cloud.conflict}
                onClick={() => {
                  if (
                    confirm(
                      "Перенести гостьові дані цього пристрою в акаунт, замінивши поточний профіль?",
                    )
                  )
                    void cloud.importGuest();
                }}
              >
                Перенести дані пристрою
              </button>
            </div>
            <p className="account-hint">
              Надсилаємо змінені розділи після паузи у введенні. Офлайн зміни
              залишаються на пристрої. При конфлікті копії не перезаписуються
              автоматично.
            </p>
          </section>
          <section className="account-panel">
            <h2>
              <ShieldCheck size={20} /> Ваші дозволи
            </h2>
            <label className="account-toggle">
              <input
                type="checkbox"
                checked={u.analytics}
                disabled={account.busy}
                onChange={(e) =>
                  void account.preferences(
                    e.target.checked,
                    e.target.checked && u.geography,
                  )
                }
              />
              <span>
                Допомагати покращувати застосунок
                <small>
                  Події переходів, вибір інструментів і збереження планів. Без
                  сум і тексту ваших планів. До 90 днів.
                </small>
              </span>
            </label>
            <label className="account-toggle">
              <input
                type="checkbox"
                checked={u.geography}
                disabled={account.busy || !u.analytics}
                onChange={(e) =>
                  void account.preferences(u.analytics, e.target.checked)
                }
              />
              <span>
                Дозволити приблизну географію за IP
                <small>
                  IP передається IPWhois для визначення країни, регіону й міста.
                  Адміністратор бачить IP до 7 днів. Це не GPS і не ваша точна
                  адреса.
                </small>
              </span>
            </label>
            <p className="account-hint">
              Відкликання дозволу видаляє відповідні події або географію з нашої
              бази.
            </p>
          </section>
          <section className="account-panel">
            <h2>
              <Fingerprint size={20} /> Ключі та сеанси
            </h2>
            <div className="form-actions">
              <button
                className="button outline"
                disabled={account.busy}
                onClick={() => void account.authenticate("register", u.name)}
              >
                Додати запасний ключ
              </button>
              <button
                className="button outline"
                disabled={account.busy}
                onClick={() => void account.logout(true)}
              >
                Вийти з усіх пристроїв
              </button>
              <button
                className="button outline"
                disabled={account.busy}
                onClick={() => void account.logout()}
              >
                <LogOut size={17} /> Вийти
              </button>
            </div>
            <p className="account-hint">
              Акаунт {u.id}. Немає відновлення за email: збережіть другий ключ
              або синхронізований passkey. Після виходу відкриються гостьові
              дані пристрою.
            </p>
            {u.admin && (
              <Link href="/app/admin" className="button">
                Відкрити адмінку
              </Link>
            )}
          </section>
          <section className="account-panel">
            <h2>Видалення акаунта</h2>
            {!remove ? (
              <button
                className="button outline"
                onClick={() => setRemove(true)}
              >
                Видалити акаунт…
              </button>
            ) : (
              <>
                <p>
                  Це видалить профіль, ключі, сеанси й аналітику на сервері.
                  Спочатку збережіть резервну копію в налаштуваннях.
                </p>
                <div className="form-actions">
                  <button
                    className="button outline"
                    onClick={() => setRemove(false)}
                  >
                    Скасувати
                  </button>
                  <button
                    className="button"
                    onClick={async () => {
                      try {
                        await account.remove();
                        await erase();
                        await account.refresh();
                      } catch (e) {
                        setMessage((e as Error).message);
                      }
                    }}
                  >
                    Підтверджую видалення
                  </button>
                </div>
              </>
            )}
          </section>
        </>
      )}
    </div>
  );
}
