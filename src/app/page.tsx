import Link from "next/link";
import {
  ArrowUpRight,
  LockKeyhole,
  Shield,
  Target,
  ChartNoAxesCombined,
  Check,
  ArrowRight,
} from "lucide-react";
import { Header, Footer } from "@/components/header";
import { AssetGrid } from "@/components/asset-grid";
import { getSnapshot } from "@/lib/data/market";
import { fmt, dateFmt } from "@/lib/format";
import { jsonLd, siteUrl } from "@/lib/site";
export default function Home() {
  const market = getSnapshot();
  return (
    <>
      <Header />
      <main id="main">
        <section className="hero container">
          <div>
            <div className="eyebrow">
              <i />
              НАВІГАТОР ОСОБИСТОГО КАПІТАЛУ
            </div>
            <h1>
              Ваші гроші.
              <br />
              Зрозуміла картина.
              <br />
              <em>Власні рішення.</em>
            </h1>
            <p>
              Від щоденного бюджету до власної квартири. Плануйте, порівнюйте та
              бачте, як працює ваш капітал.
            </p>
            <div className="hero-actions">
              <Link className="button" href="/app">
                Відкрити мій єКапітал <ArrowUpRight size={17} />
              </Link>
              <Link href="/assets" className="inline-link">
                Дослідити активи <ArrowRight size={15} />
              </Link>
            </div>
            <div className="hero-foot">
              <LockKeyhole size={14} />
              Без реєстрації · Дані на вашому пристрої
            </div>
          </div>
          <div
            className="hero-visual"
            aria-label="Можливості особистого кабінету"
          >
            <div className="visual-top">
              <strong>Мій фінансовий простір</strong>
              <span>Ваш план ↗</span>
            </div>
            <div className="visual-main">
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <h3>Кожна гривня має призначення</h3>
                <ChartNoAxesCombined size={18} />
              </div>
              <div className="visual-amount">
                Бачити. Планувати.
                <br />
                Рухатися до свого.
              </div>
              <div className="visual-grid" aria-hidden="true">
                <span />
                <span />
                <span />
                <span />
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: 12,
                  color: "#8a947f",
                  fontSize: 9,
                }}
              >
                <span>Резерв</span>
                <span>Цілі</span>
                <span>Інвестиції</span>
                <span>Вільні гроші</span>
              </div>
            </div>
            <div className="visual-bottom">
              <div className="visual-mini">
                <Shield size={19} />
                <strong>Запас спокою</strong>
                <p>Резерв на ваші витрати</p>
              </div>
              <div className="visual-mini">
                <Target size={19} />
                <strong>Велика мета</strong>
                <p>Власне житло та більше</p>
              </div>
            </div>
            <div className="visual-caption">
              <Check size={12} />
              Свої цифри ви додаєте самі. Починайте з реальності.
            </div>
          </div>
        </section>
        <div className="container">
          <div className="market-strip">
            {["USD", "EUR", "XAU", "XAG"].map((code) => {
              const rate = market.rates.find((r) => r.code === code);
              return (
                <div className="market-item" key={code}>
                  <span>
                    {
                      {
                        USD: "USD / UAH",
                        EUR: "EUR / UAH",
                        XAU: "Золото · ₴ / унція",
                        XAG: "Срібло · ₴ / унція",
                      }[code]
                    }
                  </span>
                  <strong>{rate ? fmt(rate.value) : "—"}</strong>
                  <small>
                    {rate
                      ? `НБУ · ${dateFmt(rate.meta.effectiveDate)}`
                      : "Актуальні дані тимчасово недоступні"}
                  </small>
                </div>
              );
            })}
          </div>
        </div>
        <section className="section container">
          <div className="section-heading">
            <div>
              <div className="eyebrow">ПОЧИНАЄМО З ВАШОГО ЖИТТЯ</div>
              <h2>Капітал — це більше, ніж інвестиції.</h2>
            </div>
            <p>
              Спочатку зрозумійте, що вже є. Потім визначте, що потрібно. І
              порівняйте власні варіанти.
            </p>
          </div>
          <div className="path-grid">
            {[
              [
                "01",
                "Зрозумійте свій місяць",
                "Доходи, реальні витрати та вільний cash flow. Розподіл визначаєте тільки ви.",
                ChartNoAxesCombined,
              ],
              [
                "02",
                "Створіть запас і цілі",
                "Резерв, перший внесок на квартиру, авто чи бізнес. Сума, внесок і дата.",
                Shield,
              ],
              [
                "03",
                "Порівняйте сценарії",
                "Власний портфель, історичні факти та купівельна спроможність після інфляції.",
                Target,
              ],
            ].map(([step, title, text, Icon]) => {
              const I = Icon as typeof Shield;
              return (
                <div className="path-card" key={step as string}>
                  <div className="step">
                    {step as string} / ВАШ НАСТУПНИЙ КРОК
                  </div>
                  <I size={25} />
                  <h3>{title as string}</h3>
                  <p>{text as string}</p>
                </div>
              );
            })}
          </div>
        </section>
        <section className="section container">
          <div className="section-heading">
            <div>
              <div className="eyebrow">ЗНАЙОМТЕСЯ З МОЖЛИВОСТЯМИ</div>
              <h2>Різні активи. Зрозумілі правила.</h2>
            </div>
            <Link className="inline-link" href="/assets">
              Усі активи <ArrowUpRight size={16} />
            </Link>
          </div>
          <AssetGrid limit={8} />
        </section>
        <section className="section container">
          <div className="cta-panel">
            <div>
              <div className="eyebrow" style={{ color: "#acb99d" }}>
                МЕТА, ЯКА ЗМІНЮЄ ЖИТТЯ
              </div>
              <h2>Власна квартира починається з першого внеску.</h2>
              <p>
                Розрахуйте єОселю, визначте суму до заявки й перетворіть її на
                план накопичення.
              </p>
            </div>
            <Link href="/eoselia" className="button lime no-wrap">
              Порахувати житло <ArrowUpRight size={16} />
            </Link>
          </div>
        </section>
        <section className="section container">
          <div className="section-heading">
            <div>
              <div className="eyebrow">ВАШІ ДАНІ ПІД ВАШИМ КОНТРОЛЕМ</div>
              <h2>Особисте залишається особистим.</h2>
            </div>
            <p>
              Доходи, цілі та активи залишаються на пристрої. Без банківських
              логінів. Із зашифрованою резервною копією.
            </p>
          </div>
          <Link className="button outline" href="/app">
            Почати з моїх цифр <ArrowRight size={16} />
          </Link>
        </section>
      </main>
      <Footer />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd({
            "@context": "https://schema.org",
            "@graph": [
              { "@type": "Organization", name: "єКапітал", url: siteUrl() },
              { "@type": "WebSite", name: "єКапітал", url: siteUrl() },
              {
                "@type": "WebApplication",
                name: "єКапітал",
                url: siteUrl() + "/app",
                applicationCategory: "FinanceApplication",
                operatingSystem: "Web",
                browserRequirements: "Requires JavaScript and IndexedDB",
                inLanguage: "uk",
              },
            ],
          }),
        }}
      />
    </>
  );
}
