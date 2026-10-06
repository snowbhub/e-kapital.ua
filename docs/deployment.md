# Railway deployment

Source для підключення: `snowbhub/e-kapital.ua`, branch `main`.

Проєкт перенесено в публічний репозиторій на прохання власника. Приватний `snowbhub/e-kapital` залишається попередньою копією; подальші зміни й авто-деплой використовують `e-kapital.ua`.

Офіційна інструкція: https://docs.railway.com/deployments/github-autodeploys

## Підготовлена конфігурація

Service: `e-kapital`, production. Через ліміт створення нових проєктів сервіс розміщено в наявному Railway project `virex-test`; це окремий service без залежностей від Virex та без спільної бази даних.

URL: https://e-kapital-production.up.railway.app

Variables:

```text
SITE_URL=https://e-kapital-production.up.railway.app
PORT=3000
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
```

Railway автоматично збирає кореневий Dockerfile. Docker build виконує lint, TypeScript, unit tests та production build. `SITE_URL` передається через Docker ARG для правильних canonical / sitemap у статично згенерованих сторінках. Runtime працює під non-root користувачем і слухає 0.0.0.0:$PORT. Healthcheck `/api/health`, timeout 120 с; restart on failure, 3 retries.

GitHub workflow `Quality gate` додає E2E у Chrome, Firefox, WebKit та mobile emulation. Docker gate блокує невдалу збірку, але повна E2E-перевірка виконується окремо в GitHub Actions. Railway Wait for CI не налаштований цим API; за потреби увімкнути в dashboard до наступного production release.

Зміни `main` запускають Railway auto-deploy. Перевіряти commit SHA й status SUCCESS, `/api/health`, `/api/market`, sitemap host та головну сторінку. Якщо джерело даних недоступне, додатково дивитися `/data-sources`.

`/api/health` повертає `commit` із Railway `RAILWAY_GIT_COMMIT_SHA` (локально `null`). Після quality checks GitHub Action на `main` чекає цей commit на публічному домені та перевіряє live flows у desktop Chromium й iPhone WebKit. Перевірки створюють тимчасові профілі тільки в браузерах runner; особисті дані користувачів не читаються і не змінюються.

Rollback у Railway повертає попередній deployment; особисті IndexedDB-дані користувача залишаються на його пристрої. Перед несумісною зміною State потрібна міграція версії та перевірка старих backup.
