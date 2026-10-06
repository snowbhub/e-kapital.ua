import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { articles } from "@/lib/content";
import { Header, Footer } from "@/components/header";
import { PublicCalculator } from "@/components/public-calculators";
import { AssetGrid } from "@/components/asset-grid";
import { Card, Badge } from "@/components/ui";
import { ProviderDirectory } from "@/components/providers";
import { getSnapshot } from "@/lib/data/market";
import { sources } from "@/lib/data/providers";
import { jsonLd, siteUrl } from "@/lib/site";
import { pct, dateFmt, num } from "@/lib/format";
const special = [
  "assets",
  "data-sources",
  "privacy",
  "legal",
  "finansova-gramotnist",
];
export function generateStaticParams() {
  return [...Object.keys(articles), ...special].map((slug) => ({ slug }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const a = articles[slug];
  return {
    title:
      a?.title ??
      (
        {
          assets: "Усі активи",
          "data-sources": "Джерела даних",
          privacy: "Приватність",
          legal: "Умови використання",
          "finansova-gramotnist": "Фінансова грамотність",
        } as Record<string, string>
      )[slug],
    description:
      a?.description ?? "Прозорі інструменти для особистого фінансового плану.",
    alternates: { canonical: `/${slug}` },
    openGraph: {
      title: a?.title,
      url: `/${slug}`,
      description: a?.description,
    },
    twitter: { title: a?.title, description: a?.description },
  };
}
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!articles[slug] && !special.includes(slug)) notFound();
  const a = articles[slug],
    market = getSnapshot();
  let content;
  if (slug === "assets")
    content = (
      <>
        <div className="article-hero">
          <div className="eyebrow">
            <i />
            ASSET EXPLORER
          </div>
          <h1>Активи без складних слів.</h1>
          <p>
            Як працюють, звідки береться результат, скільки коштує доступ до
            грошей. Почніть з того, що хочете зрозуміти.
          </p>
        </div>
        <AssetGrid />
      </>
    );
  else if (slug === "data-sources")
    content = (
      <>
        <div className="article-hero">
          <div className="eyebrow">
            <i />
            ПРОЗОРІСТЬ ДАНИХ
          </div>
          <h1>Джерела та стан оновлень.</h1>
          <p>
            Кожне ринкове число має джерело, дату отримання та дату, до якої
            воно належить. Особисті фінансові дані не надсилаються сюди.
          </p>
        </div>
        <Card>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Джерело</th>
                  <th>Частота</th>
                  <th>Останній успішний sync</th>
                  <th>Стан</th>
                </tr>
              </thead>
              <tbody>
                {market.health.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <a
                        target="_blank"
                        rel="noopener noreferrer"
                        href={s.sourceUrl}
                      >
                        {s.name} ↗
                      </a>
                    </td>
                    <td>{s.frequency}</td>
                    <td>
                      {s.lastSuccess ? dateFmt(s.lastSuccess) : "Не отримано"}
                    </td>
                    <td>
                      <Badge kind={s.error ? "warning" : "green"}>
                        {s.error
                          ? s.lastSuccess
                            ? "Останні перевірені дані"
                            : "Недоступно"
                          : "Перевірено"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card>
          <h2>Як ми перевіряємо</h2>
          <p className="muted" style={{ marginTop: 18, fontSize: 13 }}>
            JSON та HTML проходять перевірку схеми, дат, одиниць і обов’язкових
            полів. Якщо формат джерела змінюється, оновлення зупиняється;
            попередній перевірений набір зберігається. Річний CPI формується
            тільки з 12 місячних точок. Для сторінок без дати показника
            відображається дата отримання, це не дата окремого звіту.
          </p>
        </Card>
      </>
    );
  else if (slug === "privacy" || slug === "legal")
    content = (
      <>
        <div className="article-hero">
          <div className="eyebrow">
            <i />
            ВАШІ ПРАВА ТА КОНТРОЛЬ
          </div>
          <h1>
            {slug === "privacy"
              ? "Особисті дані залишаються з вами."
              : "Прозорі межі сервісу."}
          </h1>
          <p>Оновлено 06.10.2026</p>
        </div>
        <div className="article-body">
          <Card>
            {slug === "privacy" ? (
              <>
                <h2>Що зберігається і де</h2>
                <p>
                  Доходи, витрати, місячні плани, резерв, цілі, активи,
                  операції, знімки та сценарії зберігаються в IndexedDB браузера
                  цього пристрою. У звичайному потоці застосунку ці дані не
                  надсилаються на сервер. Коли ви самі створюєте публічне
                  посилання, воно містить лише гіпотетичний капітал, частки,
                  внесок, горизонт і припущення, які показані у попередньому
                  перегляді.
                </p>
                <h2>Технічні запити</h2>
                <p>
                  Браузер завантажує сторінки та публічні ринкові дані. Railway
                  може обробляти IP-адресу та технічні журнали запитів для
                  роботи хостингу. Аналітичні трекери, рекламні cookies та
                  банківські інтеграції не встановлені. Сервіс не просить
                  банківський пароль. Зовнішні сайти мають власні політики
                  приватності.
                </p>
                <h2>Backup та видалення</h2>
                <p>
                  Backup шифрується у браузері ключем, отриманим із вашого
                  пароля. Пароль та файл не завантажуються на сервер. Без пароля
                  відновлення неможливе. У налаштуваннях можна видалити всі
                  особисті фінансові дані з подвійним підтвердженням. Очищення
                  даних браузера теж видалить локальний профіль, тому зберігайте
                  backup.
                </p>
              </>
            ) : (
              <>
                <h2>Освіта та розрахунки</h2>
                <p>
                  єКапітал — незалежний фінансовий планувальник і освітній
                  сервіс. Ми не надаємо персональних рекомендацій, не керуємо
                  портфелями, не приймаємо кошти і не укладаємо інвестиційних
                  угод. Користувач сам обирає суми, частки, інструменти та
                  припущення.
                </p>
                <h2>Факт, умови та сценарій</h2>
                <p>
                  Історія описує минуле. Поточні умови мають джерело і дату та
                  можуть змінюватися. Очікування емітента не є гарантією.
                  Результат вашого сценарію є математичним наслідком припущень,
                  а не прогнозом. Перед угодою перевіряйте актуальні документи,
                  ціни, витрати, право на програму та юридичні умови у
                  провайдера.
                </p>
                <h2>Посилання і незалежність</h2>
                <p>
                  Сервіс не є сайтом держави, НБУ, Мінфіну, Дії чи Inzhur.
                  Партнерські посилання, якщо активовані, позначаються поруч із
                  кнопкою, а sponsored-провайдер — як партнер. Прихованого
                  ранжування за винагороду немає.
                </p>
              </>
            )}
          </Card>
        </div>
      </>
    );
  else if (slug === "finansova-gramotnist")
    content = (
      <>
        <div className="article-hero">
          <div className="eyebrow">
            <i />
            ЗНАННЯ У ПОТРІБНИЙ МОМЕНТ
          </div>
          <h1>Розуміти — означає контролювати.</h1>
          <p>
            Прості пояснення понять, які допомагають читати власні цифри. Ці
            пояснення також є поряд із калькуляторами.
          </p>
        </div>
        <div className="reading-grid">
          {[
            [
              "Cash flow",
              "Дохід після всіх введених витрат. Додатний залишок ви розподіляєте самі.",
              "monthly-investing",
            ],
            [
              "Ліквідність",
              "Наскільки швидко і з якими витратами актив можна повернути у гроші.",
              "assets",
            ],
            [
              "Реальна дохідність",
              "Зміна купівельної спроможності після інфляції, за формулою відношення індексів.",
              "inflation",
            ],
            [
              "Валютний ризик",
              "Зміна доступної суми, якщо валюта активу відрізняється від валюти витрат.",
              "currency",
            ],
            [
              "Диверсифікація",
              "Розподіл капіталу між різними джерелами ризику. Однакові назви чи різні фонди однієї компанії не гарантують незалежності ризиків.",
              "app/portfolio",
            ],
            [
              "Купон та XIRR",
              "Купон — платіж випуску. XIRR — річна дохідність ваших датованих грошових потоків.",
              "ovdp",
            ],
            [
              "NAV та виплати",
              "Оцінка чистих активів фонду та гроші, які реально надійшли інвестору, рахуються окремо.",
              "inzhur",
            ],
            [
              "Резерв",
              "Гроші для обов’язкових витрат за відсутності доходу або при несподіваній потребі.",
              "finansovyi-rezerv",
            ],
            [
              "Концентрація",
              "Велика частка одного активу або спільного ризику. Показник структури, без оцінки «хороший» чи «поганий».",
              "app/portfolio",
            ],
          ].map(([title, text, url]) => (
            <Link href={"/" + url} key={title}>
              <Card>
                <h3>{title}</h3>
                <p>{text}</p>
                <span className="inline-link" style={{ marginTop: 18 }}>
                  Дослідити ↗
                </span>
              </Card>
            </Link>
          ))}
        </div>
      </>
    );
  else
    content = (
      <>
        <div className="article-hero">
          <div className="eyebrow">
            <i />
            {a.tag}
          </div>
          <h1>{a.title}</h1>
          <p>{a.description}</p>
        </div>
        {["ovdp", "viiskovi-obligatsii", "calculator-ovdp"].includes(slug) && (
          <Card>
            <div className="card-title">
              <h2>Опубліковані випуски</h2>
              <Badge>Офіційний портал Мінфіну</Badge>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>ISIN</th>
                    <th>Валюта</th>
                    <th>Погашення</th>
                    <th>Опублікована ставка</th>
                    <th>Дата розміщення</th>
                  </tr>
                </thead>
                <tbody>
                  {market.bonds
                    .filter(
                      (b) =>
                        b.maturity > new Date().toISOString().slice(0, 10) &&
                        (!slug.includes("viiskovi") || b.military),
                    )
                    .slice(0, 18)
                    .map((b) => (
                      <tr key={b.isin}>
                        <td>{b.isin}</td>
                        <td>{b.currency}</td>
                        <td>{dateFmt(b.maturity)}</td>
                        <td>
                          {b.publishedRate === null
                            ? "—"
                            : pct(b.publishedRate)}
                        </td>
                        <td>
                          {b.lastPlacement ? dateFmt(b.lastPlacement) : "—"}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            <p className="muted" style={{ fontSize: 11, marginTop: 15 }}>
              Опублікована ставка розміщення не є поточною ціною купівлі чи
              фактичною дохідністю вашої угоди.
            </p>
          </Card>
        )}
        {slug === "inzhur" && (
          <Card>
            <h2>Поточні продукти емітента</h2>
            <div className="metrics">
              {market.funds.map((f) => (
                <div className="metric" key={f.id}>
                  <span>
                    {f.name} · {dateFmt(f.meta.effectiveDate)}
                  </span>
                  <strong>{num(f.nav, 4)} ₴ / сертифікат</strong>
                  <p style={{ fontSize: 11, marginTop: 12 }}>
                    Ціна купівлі від {num(f.purchasePrice)} ₴.{" "}
                    {f.actualReturn || ""}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        )}
        <Card>
          <div className="card-title">
            <h2>Порахуйте за своїми умовами</h2>
            <Badge kind="scenario">Ваші введені дані</Badge>
          </div>
          <PublicCalculator kind={a.calculator} initialMarket={market} />
        </Card>
        <div className="article-grid">
          <div className="article-body">
            <Card>
              {a.sections.map((s) => (
                <section key={s.title}>
                  <h2>{s.title}</h2>
                  <p>{s.text}</p>
                </section>
              ))}
            </Card>
          </div>
          <div>
            <Card>
              <h2>Зрозуміла точка відліку</h2>
              <p className="muted" style={{ fontSize: 13, margin: "18px 0" }}>
                Розрахунок стає корисним, коли пов’язаний із вашим доходом,
                витратами, резервом і конкретною ціллю.
              </p>
              <Link href="/app" className="button">
                Відкрити мій єКапітал ↗
              </Link>
            </Card>
            <Card>
              <h2>Джерела для перевірки</h2>
              <div style={{ display: "grid", gap: 15, marginTop: 22 }}>
                {Object.entries(
                  a.calculator === "eoselia"
                    ? { Дія: sources.eoselia, Укрфінжитло: sources.eoseliaAge }
                    : a.calculator === "fund"
                      ? { Inzhur: sources.inzhur }
                      : a.calculator === "ovdp"
                        ? {
                            Мінфін: sources.military,
                            "НБУ — депозитарій":
                              "https://bank.gov.ua/ua/markets/ovdp",
                          }
                        : {
                            НБУ: "https://bank.gov.ua/",
                            Держстат: "https://stat.gov.ua/",
                          },
                ).map(([name, url]) => (
                  <a
                    key={name}
                    className="inline-link"
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {name} ↗
                  </a>
                ))}
                <Link href="/data-sources" className="inline-link">
                  Дати та стан синхронізації ↗
                </Link>
              </div>
            </Card>
          </div>
        </div>
        {a.provider && (
          <Card>
            <h2 style={{ marginBottom: 15 }}>
              Офіційний шлях купівлі / заявки
            </h2>
            <ProviderDirectory category={a.provider} />
          </Card>
        )}
        <Card className="faq">
          <h2 style={{ marginBottom: 15 }}>Поширені запитання</h2>
          {a.faq.map((f) => (
            <details key={f.q}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </Card>
        <Card>
          <h2 style={{ marginBottom: 20 }}>Продовжити дослідження</h2>
          <div className="footer-links" style={{ justifyContent: "start" }}>
            {a.related.map((s) => (
              <Link className="inline-link" href={"/" + s} key={s}>
                {articles[s]?.title ??
                  (s === "app" ? "Мій єКапітал" : "Усі активи")}{" "}
                ↗
              </Link>
            ))}
          </div>
        </Card>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: jsonLd({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "BreadcrumbList",
                  itemListElement: [
                    {
                      "@type": "ListItem",
                      position: 1,
                      name: "Головна",
                      item: siteUrl(),
                    },
                    {
                      "@type": "ListItem",
                      position: 2,
                      name: a.title,
                      item: siteUrl() + "/" + slug,
                    },
                  ],
                },
                {
                  "@type": "Article",
                  headline: a.title,
                  description: a.description,
                  mainEntityOfPage: siteUrl() + "/" + slug,
                  author: { "@type": "Organization", name: "єКапітал" },
                },
                {
                  "@type": "FAQPage",
                  mainEntity: a.faq.map((f) => ({
                    "@type": "Question",
                    name: f.q,
                    acceptedAnswer: { "@type": "Answer", text: f.a },
                  })),
                },
              ],
            }),
          }}
        />
      </>
    );
  return (
    <>
      <Header />
      <main id="main" className="container" style={{ paddingBottom: 60 }}>
        {content}
      </main>
      <Footer />
    </>
  );
}
