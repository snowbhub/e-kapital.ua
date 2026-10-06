# MASTER PRODUCT PROMPT — єКапітал

Потрібно з нуля спроєктувати, реалізувати, протестувати та підготувати до production deployment повністю готовий вебзастосунок/PWA **«єКапітал»**.

Це НЕ prototype, НЕ proof-of-concept, НЕ demo та НЕ набір мокапів.

Результатом повинен бути завершений production-ready продукт, який після додавання production environment variables та домену можна одразу розгорнути у production.

Не залишати TODO, fake data, lorem ipsum, тимчасові компоненти, placeholder calculators, порожні сторінки або кнопки, які нічого не роблять.

Усі функції першого релізу повинні бути реалізовані повністю.

---

# 0. НАЗВА ТА ПОЗИЦІОНУВАННЯ

Назва:

**єКапітал**

Латинська brand identifier:

**YEKAPITAL**

Основний descriptor:

**Навігатор особистого капіталу**

Основний сенс продукту:

єКапітал — це приватний local-first фінансовий вебзастосунок для українців, який допомагає людині:

- зрозуміти власний cash flow;
- порахувати реальні щомісячні витрати;
- визначити вільні гроші після витрат;
- створити фінансовий резерв;
- поставити фінансові цілі;
- вести особистий план накопичення;
- вручну сформувати власну структуру активів;
- порівнювати різні способи зберігання та інвестування грошей;
- бачити історичні результати різних активів;
- моделювати власні сценарії;
- розуміти вплив інфляції;
- розуміти валютний ризик;
- відстежувати прогрес;
- дізнаватися, як фізично придбати певний актив;
- переходити до банків, брокерів, Inzhur та інших партнерів через official або affiliate links.

Ключова концепція:

**Сервіс не прогнозує майбутнє. Сервіс показує факти та рахує сценарії.**

---

# 1. ЮРИДИЧНА МЕЖА

У першій production-версії єКапітал НЕ є ліцензованим інвестиційним консультантом.

Тому застосунок НЕ повинен генерувати персональну інвестиційну рекомендацію.

Не використовувати:

«Вам потрібно купити…»

«Найкращий портфель для вас…»

«Рекомендуємо 40% ОВДП…»

«Вам краще інвестувати…»

«Оптимальним рішенням буде…»

Замість цього:

«Створіть власний сценарій»

«Порівняйте варіанти»

«Змініть структуру»

«Подивіться, як змінюється результат»

«Ось історичні дані»

«Ось поточні умови інструменту»

«Ось результат при заданих вами припущеннях»

У footer та legal pages чітко зазначити:

**«єКапітал — незалежний приватний інформаційно-аналітичний сервіс. Не є державною програмою, банком, брокером або інвестиційною фірмою. Розрахунки та сценарії не є індивідуальною інвестиційною рекомендацією.»**

Не створювати враження зв'язку з:

- Дією;
- Міністерством фінансів;
- НБУ;
- Міністерством оборони;
- іншими державними установами.

Офіційні державні джерела можна використовувати як data sources із чітким зазначенням джерела.

---

# 2. ГОЛОВНА ФІЛОСОФІЯ РОЗРАХУНКІВ

В системі існує лише три категорії фінансових чисел.

## FACT

Реальні історичні або поточні дані з перевіреного джерела.

Приклади:

- фактичний курс USD;
- фактичний курс EUR;
- фактична ціна банківського золота;
- фактичний CPI;
- фактична ставка конкретного ОВДП;
- фактична дата погашення;
- фактичні історичні виплати Inzhur;
- фактична ВЧА.

Badge:

**ФАКТ**

---

## CURRENT TERMS

Актуальна публічна умова конкретного продукту.

Наприклад:

- ставка випуску ОВДП;
- комісія;
- строк;
- дата погашення;
- поточна опублікована ціна;
- актуальні правила єОселі.

Badge:

**ПОТОЧНІ УМОВИ**

---

## USER SCENARIO

Майбутній результат, побудований виключно з припущень користувача.

Наприклад:

USD +7%/рік.

Золото +4%.

Інфляція 8%.

Inzhur +9%.

Badge:

**ВАШ СЦЕНАРІЙ**

Обов'язково показувати assumptions.

Ніколи не називати user scenario прогнозом єКапітал.

---

# 3. НЕ ВИКОРИСТОВУВАТИ AI FORECASTING

Не створювати:

- прогноз USD;
- прогноз EUR;
- прогноз золота;
- прогноз нерухомості;
- прогноз Inzhur;
- прогноз фондового ринку;
- AI portfolio recommendation;
- AI-generated target allocation.

Не використовувати Monte Carlo у першій версії.

Всі майбутні projections детерміновані.

Однаковий input завжди повинен давати однаковий output.

---

# 4. TECHNOLOGY

Використати актуальні stable production-compatible версії:

- React;
- Next.js;
- TypeScript strict mode;
- Tailwind CSS;
- accessible component primitives;
- Framer Motion або актуальний maintained equivalent;
- charting library, придатну для фінансових графіків;
- Zod;
- IndexedDB;
- Dexie або аналогічний mature IndexedDB wrapper;
- Web Crypto API;
- PWA manifest;
- service worker;
- SSR/SSG/ISR;
- server route handlers тільки там, де вони реально необхідні.

Перед встановленням dependency перевірити, що пакет:

- підтримується;
- сумісний з поточною stable Next.js;
- не deprecated;
- не має відомих критичних security issues.

Lock package versions.

---

# 5. LOCAL-FIRST

У застосунку НЕ потрібно створювати акаунт.

НЕ потрібно:

- email;
- пароль;
- телефон;
- backend user database.

Весь особистий фінансовий профіль за замовчуванням зберігається тільки на пристрої користувача.

IndexedDB:

- profile;
- income;
- expenses;
- assets;
- portfolio;
- goals;
- monthly plans;
- transactions;
- historical snapshots користувача;
- saved scenarios;
- settings.

localStorage:

- theme;
- locale;
- onboarding status;
- non-sensitive UI preferences.

Cookies:

не використовувати для зберігання фінансового профілю.

Cookies використовувати тільки для:

- consent;
- affiliate attribution;
- analytics, якщо користувач погодився.

---

# 6. BACKUP

Створити:

**Експорт моїх даних**

Експорт усіх локальних даних у versioned JSON.

Додатково реалізувати encrypted export.

Користувач задає пароль.

Дані шифруються через Web Crypto.

Створюється encrypted backup file.

Створити:

**Імпорт резервної копії**

з:

- перевіркою schema version;
- validation;
- migration;
- decrypt;
- preview перед імпортом.

---

# 7. PWA — ОБОВ'ЯЗКОВО

єКапітал повинен повністю встановлюватися як Progressive Web App.

Реалізувати:

- Web App Manifest;
- standalone mode;
- adaptive icons;
- maskable icons;
- Apple touch icon;
- theme-color;
- splash-compatible metadata;
- service worker;
- offline application shell;
- cached calculators;
- cached last successful financial dataset;
- app update detection;
- update available banner.

На Android:

використовувати browser install flow, якщо доступний.

На iOS:

показувати красивий native-looking bottom sheet:

**Встановити єКапітал**

із інструкцією:

Поділитися → На початковий екран → Додати.

Якщо PWA вже працює standalone — instruction не показувати.

---

# 8. OFFLINE

Без інтернету користувач повинен мати доступ до:

- свого профілю;
- cash-flow calculator;
- goals;
- saved portfolio;
- saved historical datasets;
- calculator logic;
- saved scenarios;
- monthly plan.

Для market data показувати:

**Останні доступні дані**

та timestamp.

Ніколи не замінювати відсутні дані нулем.

---

# 9. DESIGN SYSTEM

Напрям:

premium Ukrainian fintech.

Не робити копію Дії.

Не робити military website.

Не робити Forex landing.

Не робити crypto casino.

Візуальна система:

- deep graphite;
- dark navy;
- off-white typography;
- restrained Ukrainian accent;
- very subtle electric/cyan/lime accent допускається;
- великі цифри;
- мінімалістичні charts;
- soft gradients;
- glass panels дуже помірно;
- мікросітка;
- navigation/map metaphor;
- high-quality motion.

Дизайн повинен нагадувати сучасний персональний financial operating system.

---

# 10. LOGO DIRECTION

Wordmark:

**єКапітал**

Літера «є» може бути окремим brand symbol.

Не використовувати:

- герб;
- тризуб як logo;
- державний прапор як UI control;
- стилістику державного порталу.

Логотип має бути достатньо унікальним для подальшої реєстрації комбінованої ТМ.

---

# 11. HOMEPAGE

Route:

`/`

Це одночасно:

- сильний product landing;
- SEO landing;
- вхід у застосунок.

SSR/SSG content повинен бути доступний search engines навіть без client JavaScript.

---

# 12. HERO

Headline:

**Твої гроші потребують маршруту.**

Subheadline:

**єКапітал допомагає побачити, скільки в тебе реально вільних грошей, створити резерв, поставити фінансові цілі та змоделювати власну структуру капіталу.**

Primary CTA:

**Відкрити мій єКапітал**

Secondary CTA:

**Порахувати 100 000 ₴**

Нижче інтерактивний preview dashboard.

---

# 13. HOMEPAGE LIVE STRIP

Створити live data strip.

Приклад:

USD / UAH

EUR / UAH

Gold

Інфляція

ОВДП

Усі значення отримуються автоматично.

Біля кожного:

джерело;

дата;

час.

Ніяких hardcoded current values.

---

# 14. HOMEPAGE STORY

Секції:

## Що відбувається з твоїми грошима?

Пояснити:

- cash;
- inflation;
- currency;
- investment return.

## Побач свою реальну картину

CTA до cash flow.

## Створи резерв

CTA до reserve planner.

## Постав ціль

Квартира / будинок / резерв / бізнес / авто / інша.

## Створи власну структуру

Portfolio Lab.

## Порівняй активи

ОВДП / Inzhur / USD / EUR / золото / срібло / депозит.

## Відкрий двері до інвестицій

Покрокові guides + verified providers.

---

# 15. RETURNING USER HOMEPAGE

Якщо локальний profile вже існує:

hero CTA змінюється.

Показувати:

**Продовжити мій план**

і коротко:

«Останній вхід: …»

«План на серпень: …»

Не показувати фінансові суми до hydration у server HTML.

---

# 16. APP ROUTES

Створити:

`/app`

`/app/cashflow`

`/app/reserve`

`/app/portfolio`

`/app/goals`

`/app/plan`

`/app/history`

`/app/scenarios`

`/app/settings`

Mobile app повинен мати bottom navigation.

Desktop — navigation rail.

---

# 17. ПЕРШИЙ ONBOARDING

Onboarding має займати 2–4 хвилини.

Не починати з питання:

«Скільки хочете інвестувати?»

Починати з фінансової реальності людини.

---

# 18. ДОХОДИ

Дозволити додати кілька джерел.

Наприклад:

Зарплата 1.

Зарплата 2.

ФОП.

Підробіток.

Оренда.

Інше.

Для кожного:

- сума;
- валюта;
- частота;
- стабільний / нерегулярний.

---

# 19. ВИТРАТИ

Категорії:

Житло.

Комунальні.

Їжа.

Транспорт.

Авто.

Кредити.

Здоров'я.

Діти.

Підписки.

Розваги.

Допомога родині.

Інше.

Користувач сам вводить реальні цифри.

---

# 20. CASH FLOW

Розрахувати:

загальний місячний дохід;

обов'язкові витрати;

інші витрати;

боргові платежі;

вільний cash flow.

Формулювання:

**Після введених вами витрат залишається: X ₴ / місяць.**

НЕ писати:

«Ви повинні інвестувати X».

---

# 21. MONTHLY PLAN

Із вільного cash flow користувач сам задає:

Резерв — X%.

Фінансова ціль — X%.

Інвестиційний капітал — X%.

Вільні гроші — X%.

Allocation має дорівнювати 100%.

---

# 22. ФІНАНСОВИЙ РЕЗЕРВ

Reserve Planner.

Користувач сам вибирає scenario:

1 місяць.

3 місяці.

6 місяців.

9 місяців.

12 місяців.

Custom.

Target reserve:

essentialMonthlyExpenses × selectedMonths.

Показувати:

поточний резерв;

ціль;

нестача;

місяців до цілі при заданому користувачем внеску.

---

# 23. RESERVE STORAGE LAB

Користувач може сам розподілити резерв між:

UAH cash/account;

USD;

EUR;

іншим.

Не рекомендувати allocation.

Показувати:

currency exposure;

liquidity;

historical currency behaviour.

---

# 24. PORTFOLIO LAB

Центральний модуль продукту.

Користувач задає:

існуючий капітал;

щомісячний внесок;

горизонт.

Активи launch-version:

- військові ОВДП UAH;
- ОВДП UAH;
- валютні ОВДП;
- Inzhur REIT;
- Inzhur Energy, якщо продукт є актуальним;
- депозит;
- USD;
- EUR;
- золото;
- срібло;
- cash.

---

# 25. ALLOCATION

Кожний asset має slider.

Приклад:

ОВДП — 35%.

USD — 20%.

Inzhur — 15%.

Gold — 10%.

Deposit — 10%.

Cash — 10%.

Total = 100%.

Підтримати:

- drag;
- slider;
- direct percentage input;
- direct money input.

Якщо користувач вводить суму — автоматично перерахувати %.

---

# 26. LOCK ALLOCATION

Дозволити locked allocations.

Наприклад:

USD = 20% locked.

Тоді при зміні інших часток locked allocation залишається.

---

# 27. PORTFOLIO METRICS

Показувати:

Загальна сума.

UAH exposure.

USD exposure.

EUR exposure.

Precious metals exposure.

Fixed-income exposure.

Real-estate exposure.

Cash exposure.

Liquidity distribution.

Concentration.

Expected cash-flow за scenario.

Не використовувати «хороший/поганий портфель».

---

# 28. ASSET RETURN MODEL

Кожен asset повинен мати окрему mathematical model.

НЕ використовувати одну універсальну формулу для всього.

---

# 29. CASH

Return:

0%.

Але real value змінюється через inflation.

---

# 30. USD / EUR

Валюта сама по собі НЕ має процентної доходності.

Результат виникає тільки від зміни FX rate.

Не показувати:

«дохідність USD 10%».

Показувати:

«зміна вартості гривневого еквівалента».

---

# 31. GOLD / SILVER

Не мають coupon yield.

Модель:

зміна ціни металу;

purchase spread;

sale spread;

fees.

---

# 32. DEPOSIT

Модель:

principal;

interest rate;

capitalization;

term;

tax;

fees.

---

# 33. OVDP

Модель повинна використовувати:

ISIN;

purchase price;

nominal;

currency;

coupon;

coupon schedule;

purchase date;

maturity;

fees;

actual cash flows.

Розраховувати:

кількість;

вкладено;

cash flows;

profit;

annualized yield;

XIRR, якщо потрібно.

Не прирівнювати coupon rate до фактичної yield.

---

# 34. INZHUR

Модель повинна розділяти:

cash distributions;

NAV/capitalization change;

fees.

Історичні результати показувати як FACT.

Опубліковану компанією очікувану дохідність, якщо вона використовується, показувати окремо:

**Очікування емітента**

і ніколи не подавати як гарантований результат.

У Scenario Lab користувач має можливість вручну змінити assumption.

---

# 35. SCENARIO LAB

Ніяких прогнозів від єКапітал.

Створити sliders:

USD annual change.

EUR annual change.

Gold annual change.

Silver annual change.

Inzhur cash yield.

Inzhur NAV change.

Deposit rate.

Inflation.

Період:

1 / 3 / 5 / 10 років.

---

# 36. HISTORICAL REPLAY

Дуже важлива функція.

Користувач створює portfolio.

Потім:

**Як такий розподіл поводився б у минулому?**

Періоди:

останні 12 місяців;

3 роки;

5 років;

custom.

Використовувати тільки реальні historical datasets.

Якщо asset не існував протягом усього періоду — чітко це зазначити.

Не синтезувати відсутню історію.

---

# 37. INFLATION

Для кожного scenario показувати:

Nominal value.

Inflation-adjusted value.

Real purchasing power change.

Формула real return має бути математично коректною.

---

# 38. DATA SOURCES

Пріоритет:

1. офіційне державне API;
2. офіційний сайт емітента;
3. офіційний regulated provider;
4. secondary source тільки якщо немає іншого.

Кожне число має metadata:

source;

source URL internally;

retrievedAt;

effectiveDate;

dataType;

freshness.

---

# 39. NBU ADAPTER

Реалізувати NBU adapter для:

USD;

EUR;

інших потрібних валют;

gold;

silver;

historical exchange rates;

historical metals data.

Не hardcode endpoints прямо в UI components.

---

# 40. CPI / INFLATION ADAPTER

Основний source:

офіційні дані Державної служби статистики через SDMX API.

При необхідності використовувати відповідні офіційні макроекономічні datasets НБУ як fallback.

Отримувати:

monthly CPI;

YoY CPI;

annual CPI.

---

# 41. AUTOMATIC ANNUAL DATA

Історичні таблиці НЕ оновлюються вручну.

На основі monthly data автоматично формувати yearly aggregates.

Наприклад:

2024.

2025.

2026.

2027.

Коли закінчується новий рік, новий annual result повинен з'являтися автоматично після отримання повного dataset.

---

# 42. OVDP DATA

Створити OVDPProvider.

Отримувати дані з:

- офіційного порталу військових облігацій;
- відкритих даних НБУ/державних open-data datasets щодо ОВДП;
- офіційних результатів аукціонів.

Для поточних військових облігацій автоматично витягувати:

ISIN;

currency;

maturity;

coupon/discount;

rate;

last placement;

nominal.

---

# 43. НЕ HARDCODE OVDP

Заборонено прописувати:

«поточна ставка ОВДП = 15.13%»

в React component.

UI повинен отримувати ці дані через normalized data layer.

---

# 44. INZHUR AUTOMATIC INGESTION

Оскільки публічного stable developer API може не бути, реалізувати окремий scheduled ingestion layer.

Джерело:

тільки офіційні сторінки Inzhur.

Отримувати:

current public product data;

NAV;

fees;

published distributions;

monthly reports;

historical statistics.

---

# 45. AUTOMATED SNAPSHOTS

Для sources без API створити scheduled GitHub Action.

Наприклад:

щоденно для current data;

щомісячно для historical report ingestion.

Workflow:

fetch;

parse;

validate через Zod;

compare;

generate normalized JSON;

run data integrity tests;

commit updated dataset через GitHub Actions bot;

trigger normal production deployment.

Це дозволяє не створювати окрему database.

---

# 46. PARSER FAILURE

Якщо source markup змінився:

НЕ записувати неправильні дані.

Validation має зупинити update.

Production продовжує використовувати last-known-good snapshot.

UI показує:

**Дані станом на DD.MM.YYYY**

Monitoring отримує error.

---

# 47. єОСЕЛЯ ADAPTER

Створити EoseliaProvider.

Primary sources:

офіційний сайт єОселі;

Укрфінжитло;

Дія.

Автоматично отримувати актуальні:

rates;

maximum term;

minimum down payment;

age-specific rules;

categories;

banks;

інші параметри, потрібні калькулятору.

Не hardcode program terms у UI.

---

# 48. GOALS

Створити повноцінний Goals Engine.

Типи:

Фінансовий резерв.

Квартира.

Будинок.

Перший внесок.

єОселя.

Оренда.

Покриття оренди інвестиційним cash-flow.

Покриття іпотеки інвестиційним cash-flow.

Авто.

Бізнес.

Навчання.

Переїзд.

Велика покупка.

Фінансова свобода.

Custom.

---

# 49. GENERIC GOAL

Поля:

назва;

target amount;

current amount;

target date;

monthly contribution;

currency.

Показувати:

прогрес;

залишок;

місяців;

необхідний average monthly contribution без investment return;

сценарій із user-defined return.

---

# 50. GOAL — КВАРТИРА

Користувач вводить:

вартість квартири;

місто;

поточні накопичення;

бажану дату;

спосіб:

повна оплата;

звичайна іпотека;

єОселя.

---

# 51. єОСЕЛЯ GOAL

Користувач вводить:

вартість житла;

вік;

категорію;

перший внесок;

строк.

Поточні правила отримувати через EoseliaProvider.

Показати:

мінімальний required down payment;

власний planned down payment;

сума кредиту;

орієнтовний monthly payment;

total payments;

interest;

етапи ставки, якщо умови програми передбачають зміну ставки.

---

# 52. GOAL — НАКОПИЧИТИ ПЕРШИЙ ВНЕСОК

Наприклад:

Квартира = 3 000 000 ₴.

Перший внесок = X.

Вже є = Y.

Щомісячно = Z.

Показати:

estimated target date без investment return.

Додатково дозволити scenario return.

---

# 53. INVESTMENT INCOME COVERS MORTGAGE

Створити калькулятор:

**Який капітал потрібен, щоб cash-flow від активів покривав іпотечний платіж?**

Input:

monthly mortgage payment;

selected asset/scenario;

expected cash yield;

tax;

fees;

inflation.

Показати:

required capital.

Важливо:

не використовувати capital appreciation як guaranteed monthly income.

Cash-flow assets та price-growth assets рахувати окремо.

---

# 54. INVESTMENT INCOME COVERS RENT

Аналогічно:

monthly rent;

annual rent inflation scenario;

user-selected cash yield;

fees;

tax.

Output:

required starting capital.

---

# 55. FINANCIAL FREEDOM

Користувач вводить:

monthly essential expenses.

System annualizes expenses.

Користувач сам вводить assumed sustainable cash yield.

Розрахувати capital target.

Не використовувати автоматичне правило 4% як персональну рекомендацію.

Можна показати його тільки в educational article окремо.

---

# 56. MONTHLY INVESTMENT PLAN

Створити місячний план.

Наприклад:

Дохід:

65 000 ₴.

Витрати:

43 000 ₴.

Вільний cash flow:

22 000 ₴.

Далі користувач сам розподіляє:

резерв;

ціль квартира;

інвестиції;

залишити вільними.

---

# 57. PLAN MEMORY

При переході в новий календарний місяць:

на першому відкритті app створити новий monthly period.

Попередній план зберегти в history.

Запропонувати:

**Скопіювати структуру минулого місяця**

але не копіювати автоматично без згоди.

---

# 58. ACTUAL VS PLAN

Користувач може вручну внести:

«Планував інвестувати 10 000»

«Фактично інвестував 7 500»

Показувати:

Plan;

Actual;

Difference.

---

# 59. ASSET TRANSACTIONS

Дозволити вручну записати:

Купив ОВДП.

Купив USD.

Купив EUR.

Купив золото.

Inzhur contribution.

Deposit.

Продаж.

Погашення.

Dividend.

Coupon.

---

# 60. НЕ ПІДКЛЮЧАТИ БАНК

У release 1 не підключати банківські рахунки.

Не просити bank login.

Не використовувати screen scraping банків.

---

# 61. NET WORTH

На основі введених активів показувати:

Total capital.

Liquid assets.

Investment assets.

Goal assets.

Liabilities.

Net worth.

---

# 62. HISTORY

Створити історію:

Net worth over time.

Contributions.

Goal progress.

Asset structure.

Monthly cash flow.

Усі дані local-first.

---

# 63. FINANCIAL LITERACY

Створити Knowledge Layer.

Не окремий нудний блог.

Пояснення мають з'являтися contextually.

Наприклад:

**Що таке ліквідність?**

«Наскільки швидко актив можна перетворити назад у гроші.»

**Що таке реальна дохідність?**

**Що таке валютний ризик?**

**Що таке диверсифікація?**

**Чому номінальний прибуток та реальний прибуток різні?**

---

# 64. ASSET EXPLORER

Route:

`/assets`

Cards:

ОВДП.

Військові ОВДП.

Inzhur.

Депозити.

USD.

EUR.

Золото.

Срібло.

Cash.

---

# 65. КОЖНА ASSET PAGE

Має:

що це;

як працює;

звідки виникає результат;

ліквідність;

валюта;

мінімальний вхід;

типові fees;

основні risks;

історичні дані;

interactive calculator;

how to buy;

verified providers;

affiliate disclosure.

---

# 66. HOW TO INVEST

Мета:

не просто пояснити актив, а відкрити користувачу двері до реальної покупки.

Наприклад ОВДП:

1. Виберіть provider.
2. Пройдіть ідентифікацію.
3. Оберіть випуск.
4. Вкажіть суму.
5. Підтвердьте купівлю.

---

# 67. PROVIDER DIRECTORY

Створити normalized providers directory.

Fields:

id;

name;

category;

officialUrl;

affiliateUrl;

minInvestment;

fees;

online;

currencies;

verification;

lastChecked;

source.

---

# 68. AFFILIATE LINKS

Створити єдину affiliate architecture.

Partner configuration НЕ розкидати по components.

`partners.ts` або structured source.

AffiliateButton:

- UTM;
- campaign id;
- external target;
- `rel="sponsored nofollow noopener"`;
- disclosure.

Поруч:

**Партнерське посилання**

---

# 69. НЕ РАНЖУВАТИ ЗА ГРОШІ ПРИХОВАНО

Якщо provider sponsored:

позначити:

**Партнер**

або:

**Реклама**

Не називати sponsored provider «найкращим».

---

# 70. MILITARY BONDS LANDING

Route:

`/viiskovi-obligatsii`

Це одна з ключових SEO/conversion pages.

Стиль можна зробити трохи сильнішим.

Але не імітувати державний сайт.

Hero:

**Підтримай державу. Збережи капітал.**

Під ним:

актуальні випуски;

calculator;

how it works;

where to buy;

risk explanation;

FAQ.

---

# 71. OVDP CALCULATOR

Input:

budget.

Автоматично показати доступні current issues.

Користувач сам вибирає випуск.

Результат:

кількість;

purchase amount;

remaining cash;

coupon payments;

maturity;

total cash flow;

annualized yield.

---

# 72. INZHUR PAGE

Route:

`/inzhur`

Показувати:

current products;

historical facts;

published fees;

NAV;

historical distributions;

interactive scenario calculator;

how to invest;

referral CTA, якщо partnership активна.

Чітко розділяти:

historical actual return;

issuer expectation;

user scenario.

---

# 73. CURRENCY HUB

Route:

`/currency`

USD.

EUR.

Historical graph.

1Y.

3Y.

5Y.

10Y, якщо data available.

Показувати CAGR/annualized historical change.

Але називати:

**історична середньорічна зміна**

НЕ:

«очікувана доходність».

---

# 74. GOLD HUB

Route:

`/gold`

NBU metal data.

Historical UAH value.

Грами на задану суму.

Spread calculator.

Physical holding guide.

Investment coins guide.

Scenario calculator.

---

# 75. SILVER HUB

Аналогічно.

---

# 76. SEO ARCHITECTURE

Створити production SEO structure.

Основні pages:

`/`

`/ovdp`

`/viiskovi-obligatsii`

`/calculator-ovdp`

`/ovdp-vs-deposit`

`/ovdp-vs-usd`

`/ovdp-vs-inzhur`

`/inzhur`

`/inzhur-calculator`

`/inzhur-vs-ovdp`

`/currency`

`/usd`

`/eur`

`/gold`

`/silver`

`/inflation`

`/inflation-calculator`

`/deposit-calculator`

`/monthly-investing`

`/kudy-vklasty-groshi`

`/kudy-vklasty-50000`

`/kudy-vklasty-100000`

`/kudy-vklasty-500000`

`/eoselia`

`/eoselia-calculator`

`/pershyi-vnesok-na-kvartyru`

`/yak-nakopychyty-na-kvartyru`

`/investytsiinyi-dokhid-pokryvaie-orendu`

`/investytsiinyi-dokhid-pokryvaie-ipoteku`

`/finansovyi-rezerv`

`/finansova-gramotnist`

---

# 77. SEO QUALITY

Не створювати thin SEO pages.

Кожна money page повинна мати:

interactive calculator;

unique explanation;

source data;

FAQ;

internal links;

CTA.

---

# 78. STRUCTURED DATA

Додати валідний JSON-LD:

Organization;

WebSite;

WebApplication;

BreadcrumbList;

Article;

FAQPage там, де реально є FAQ.

Не створювати fake ratings.

---

# 79. METADATA

Унікальні:

title;

description;

canonical;

OpenGraph;

Twitter/X cards.

---

# 80. SITEMAP

Automatic sitemap.

Robots.txt.

Canonical handling.

Noindex:

`/app/**`

бо приватний dashboard не має бути SEO content.

---

# 81. PERFORMANCE

Ціль:

відмінний mobile performance.

Lazy-load:

charts;

heavy visualizations.

Не lazy-load critical hero text.

Image optimization.

Font optimization.

Reduce client JS.

Server-render SEO content.

---

# 82. ACCESSIBILITY

WCAG-minded implementation.

Keyboard support.

Screen readers.

High contrast.

Accessible charts summary.

Reduced motion.

Touch targets.

No information encoded only by color.

---

# 83. ANALYTICS

Analytics ніколи не повинен отримувати:

income;

expense;

portfolio amounts;

goal amount;

asset holdings;

financial profile.

Можна відправляти тільки:

page_view;

calculator_open;

calculator_complete;

affiliate_click;

install_pwa;

guide_open.

Financial values НЕ додавати навіть як event parameters.

---

# 84. CONSENT

Якщо використовується GA4 або інший non-essential analytics:

реалізувати consent layer.

До consent tracking не запускати.

Якщо можливо, використовувати privacy-friendly analytics.

---

# 85. SECURITY HEADERS

Налаштувати:

Content-Security-Policy;

Strict-Transport-Security;

X-Content-Type-Options;

Referrer-Policy;

Permissions-Policy;

frame protection.

---

# 86. EXTERNAL LINKS

Усі financial provider links відкриваються безпечно.

`noopener`.

`noreferrer` там, де доречно.

Affiliate links — sponsored.

---

# 87. SOURCE TRANSPARENCY

У footer:

**Джерела даних**

Окрема page:

`/data-sources`

Для кожного source:

назва;

що отримуємо;

frequency;

last successful sync;

link to official source.

---

# 88. DATA FRESHNESS

Badges:

Оновлено сьогодні.

Оновлено 2 дні тому.

Історичні дані.

Поточні умови.

Ваш сценарій.

---

# 89. DATA HEALTH

Створити internal data-health module.

Перевіряти:

last successful sync;

schema validation;

missing fields;

impossible values;

duplicate points;

date gaps.

---

# 90. NO FAKE LIVE DATA

Якщо API unavailable:

не показувати random/current-looking value.

Показати last-known-good.

Якщо його нема:

«Актуальні дані тимчасово недоступні.»

---

# 91. TESTING — CALCULATIONS

Unit tests обов'язково для:

cash flow;

reserve;

allocation;

compound growth;

FX;

inflation adjustment;

real return;

monthly contribution;

goal date;

mortgage;

eOselya;

deposit tax;

gold spread;

bond cash flows;

XIRR;

portfolio aggregate.

---

# 92. DATA ADAPTER TESTS

Fixture-based tests.

Schema validation.

Parser change detection.

---

# 93. E2E

Playwright.

Основні flows:

first onboarding;

create profile;

calculate cash flow;

create reserve;

create goal;

create portfolio;

change allocation;

save scenario;

close/reopen;

IndexedDB persistence;

installability conditions;

offline page;

affiliate click disclosure;

data API failure.

---

# 94. RESPONSIVE TESTING

Обов'язково:

iPhone Safari.

Android Chrome.

Desktop Chrome.

Desktop Safari.

Firefox.

---

# 95. CI

GitHub Actions:

lint;

typecheck;

unit tests;

build;

E2E critical flows.

Merge/deploy тільки якщо checks passed.

---

# 96. PRODUCTION BUILD

`npm run build` повинен проходити без:

warnings critical level;

TypeScript errors;

ESLint errors;

broken routes.

---

# 97. DEPLOYMENT

Primary:

Vercel.

Project повинен мати:

production config;

environment validation;

`.env.example`;

deployment documentation;

custom domain support;

HTTPS;

redirects;

security headers.

Якщо deployment credentials доступні — виконати production deployment.

Якщо credentials недоступні — repository все одно має бути повністю deploy-ready без необхідності редагувати source code.

---

# 98. DATA UPDATE ARCHITECTURE

Live official JSON API:

ISR/server caching.

Sources без API:

scheduled ingestion workflow.

Не створювати database лише заради market data.

---

# 99. CACHE

Фінансові data cache TTL визначати за природою даних.

FX:

daily.

Inflation:

monthly.

Annual CPI:

annual.

OVDP:

daily.

Inzhur current:

daily.

Inzhur reports:

monthly.

eOselya terms:

daily check / update only when content changes.

---

# 100. APP HOME

Route:

`/app`

Показувати:

## Мій капітал

Total.

## Цей місяць

Income.

Expenses.

Free cash flow.

Plan.

## Резерв

Progress.

## Цілі

Progress cards.

## Структура активів

Chart.

## Дані ринку

compact strip.

---

# 101. FINANCIAL REFLECTION

Створити щомісячний check-in.

Questions:

Скільки фактично зароблено?

Скільки витрачено?

Скільки відкладено?

Скільки інвестовано?

Чи змінилися регулярні витрати?

Без психологічних оцінок.

---

# 102. MONTHLY SUMMARY

Автоматично на основі local data:

«У липні ви:

отримали X;

витратили Y;

відклали Z;

збільшили капітал на N.»

Не називати ринкову переоцінку «заробітком», якщо актив не проданий.

---

# 103. GOAL CARDS

Наприклад:

**Квартира**

420 000 / 800 000 ₴.

52%.

За поточного planned contribution:

орієнтовне досягнення DD.MM.YYYY.

Не враховувати investment return без явно активованого scenario.

---

# 104. HISTORICAL BASELINE

Default projections для goals:

**0% return**

Тобто найпростіший deterministic saving path.

Користувач сам може активувати:

**Додати інвестиційний сценарій**

---

# 105. SCENARIO TRANSPARENCY

Якщо активний:

USD +5%.

Gold +3%.

Inzhur +8%.

Inflation 7%.

На графіку постійно показувати assumptions.

---

# 106. SHARE

Дозволити share public scenario.

Не включати:

income;

expenses;

name;

exact holdings.

Share payload може містити:

total hypothetical capital;

allocation;

scenario assumptions;

horizon.

Перед share preview.

---

# 107. PRIVACY PAGE

Чітко пояснити:

особисті фінансові дані зберігаються на пристрої;

сервер не отримує їх у normal MVP flow;

користувач може видалити їх;

analytics не отримує amounts.

---

# 108. DELETE DATA

Settings:

**Видалити всі мої дані**

Double confirmation.

Очистити:

IndexedDB;

localStorage financial state;

cached user state.

Не видаляти service worker app shell до reload.

---

# 109. APP INSTALL CTA

На dashboard:

**Встановити єКапітал**

Пояснення:

«Ваш план залишатиметься під рукою як окремий застосунок.»

---

# 110. FIRST LAUNCH COMPLETE EXPERIENCE

Користувач заходить на `/`.

Бачить сильний landing.

Натискає:

**Відкрити мій єКапітал**

Вводить:

дохід;

витрати;

резерв;

поточний капітал.

Бачить:

free cash flow.

Створює reserve scenario.

Створює ціль.

Відкриває Portfolio Lab.

Сам розподіляє капітал.

Бачить historical data.

Створює власний scenario.

Дивиться inflation-adjusted result.

Відкриває OVDP.

Бачить current actual bonds.

Вибирає provider.

Переходить на official/affiliate site.

Повертається через місяць.

Усі дані на місці.

Бачить новий monthly period.

Відмічає actual contributions.

Це має працювати end-to-end у першому production release.

---

# 111. НІЯКИХ MOCK DATA У PRODUCTION

Development fixtures допускаються тільки в tests/dev.

Production UI ніколи не повинен використовувати mock financial values.

Build повинен мати guard, який не дозволяє production запуск із `USE_MOCK_DATA=true`.

---

# 112. DOCUMENTATION

README повинен містити:

architecture;

local development;

environment;

data adapters;

data sources;

scheduled ingestion;

tests;

PWA;

deployment;

affiliate config;

adding new asset;

adding new provider;

adding new financial goal;

privacy architecture.

---

# 113. DESIGN DOCUMENT

Створити `/docs/architecture.md`.

Створити `/docs/calculations.md`.

Створити `/docs/data-sources.md`.

Створити `/docs/legal-boundaries.md`.

Створити `/docs/deployment.md`.

---

# 114. CALCULATION DOCUMENTATION

Для кожного calculator:

formula;

units;

rounding;

assumptions;

edge cases.

---

# 115. FINAL QUALITY GATE

Перед завершенням роботи обов'язково:

run lint;

run typecheck;

run unit tests;

run E2E;

run production build;

перевірити всі routes;

перевірити manifest;

перевірити service worker;

перевірити PWA installation;

перевірити offline mode;

перевірити persistence;

перевірити calculators;

перевірити source timestamps;

перевірити affiliate disclosures;

перевірити privacy;

перевірити sitemap;

перевірити structured data;

перевірити mobile UX.

Не оголошувати роботу завершеною, поки critical errors не усунені.

---

# 116. КІНЦЕВИЙ PRODUCT PRINCIPLE

Користувач після використання єКапітал повинен думати:

**«Я бачу, куди йдуть мої гроші, що в мене вже є, чого мені не вистачає і які варіанти я можу сам порівняти.»**

Не:

**«Сайт сказав мені, що купувати.»**

єКапітал повинен створювати:

контроль;

фінансову грамотність;

розуміння;

дисципліну;

довгострокове планування;

прозорість.

А не:

FOMO;

трейдинг;

азарт;

обіцянки прибутку;

псевдопрогнози.

Почни з повного аналізу repository, якщо repository вже існує.

Якщо repository порожній — створи production architecture з нуля.

Не зупиняйся після створення UI.

Реалізуй весь описаний release end-to-end та доведи repository до стану готовності до production deployment.
