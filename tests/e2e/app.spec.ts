import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { readFile } from "node:fs/promises";
import { test, expect, type Page } from "@playwright/test";
test("public calculator money labels survive hydration unchanged", async ({
  browser,
  page,
  baseURL,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const context = await browser.newContext({ javaScriptEnabled: false });
  const serverPage = await context.newPage();
  try {
    for (const path of [
      "/deposit-calculator",
      "/eoselia",
      "/inzhur-calculator",
    ]) {
      await serverPage.goto(new URL(path, baseURL!).href);
      const serverMetrics = await serverPage
        .locator(".metric")
        .allTextContents();
      expect(serverMetrics.length).toBeGreaterThan(0);
      await page.goto(path);
      await expect(page.locator(".metric")).toHaveText(serverMetrics);
      await expect(
        page.locator(".metric").filter({ hasText: "₴" }).first(),
      ).toBeVisible();
    }
    expect(errors).toEqual([]);
  } finally {
    await context.close();
  }
});
async function onboard(page: Page, base = "") {
  await page.goto(base + "/app");
  await page.getByLabel("Місячний дохід після податків").fill("65000");
  await page.getByLabel("Обов’язкові витрати на місяць").fill("43000");
  await page.getByRole("button", { name: "Продовжити" }).click();
  await page.getByLabel("Поточний фінансовий резерв").fill("20000");
  await page.getByLabel("Інший поточний капітал (без резерву)").fill("100000");
  await page.getByRole("button", { name: "Продовжити" }).click();
  await page.getByRole("button", { name: "Відкрити мій єКапітал" }).click();
  await expect(
    page.getByRole("heading", { name: "Мій капітал", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Збережено", { exact: true })).toBeVisible();
}
test("first launch, cash flow, goal, allocation, saved scenario and reopen", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const financialRequests: string[] = [];
  page.on("request", (r) => {
    if (r.method() !== "GET" && r.postData()?.includes("65000"))
      financialRequests.push(r.url());
  });
  await onboard(page);
  await expect(page.locator(".stat-accent").getByText(/120/)).toBeVisible();
  await page.getByRole("link", { name: "Бюджет", exact: true }).click();
  await expect(page.getByLabel("Сума Основний дохід")).toHaveValue("65000");
  await page.getByLabel("Інвестиційний капітал", { exact: true }).fill("30");
  await expect(page.getByText("Разом 100%", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Мої цілі", exact: true }).click();
  await page
    .getByRole("button", { name: "Створити ціль", exact: true })
    .click();
  await page.getByLabel("Назва цілі").fill("Моя квартира");
  await page.getByLabel("Цільова сума", { exact: true }).fill("800000");
  await page.getByLabel("Вже накопичено", { exact: true }).fill("100000");
  await page.getByLabel("Внесок на місяць", { exact: true }).fill("10000");
  await page.getByRole("button", { name: "Зберегти ціль" }).click();
  await expect(
    page.getByRole("heading", { name: "Моя квартира" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Портфель", exact: true }).click();
  await page.getByLabel("Відсоток Долар США", { exact: true }).fill("20");
  await page.getByRole("button", { name: "Зафіксувати Долар США" }).click();
  await page.getByLabel("Відсоток Золото", { exact: true }).fill("30");
  await expect(
    page.getByLabel("Відсоток Долар США", { exact: true }),
  ).toHaveValue("20");
  await page.getByRole("button", { name: "Scenario Lab", exact: true }).click();
  await page
    .getByLabel("USD: зміна гривневого еквівалента", { exact: true })
    .fill("5");
  await page.getByLabel("Інфляція", { exact: true }).fill("7");
  await page.getByLabel("Назва сценарію").fill("Сценарій тест");
  await page
    .getByRole("button", { name: "Зберегти сценарій", exact: true })
    .click();
  await expect(
    page.getByLabel("Завантажити збережений сценарій"),
  ).toBeVisible();
  await expect(page.getByText("Збережено", { exact: true })).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Portfolio Lab" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Scenario Lab", exact: true }).click();
  await expect(
    page.getByLabel("USD: зміна гривневого еквівалента", { exact: true }),
  ).toHaveValue("5");
  await page.getByRole("link", { name: "Мої цілі", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Моя квартира" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
  expect(financialRequests).toEqual([]);
});
test("monthly rollover preserves history and asks before copy", async ({
  page,
}) => {
  await onboard(page);
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open("e-kapital", 1);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    const tx = db.transaction("state", "readwrite"),
      store = tx.objectStore("state");
    const state = await new Promise<Record<string, unknown>>((resolve) => {
      const r = store.get("profile");
      r.onsuccess = () => resolve(r.result);
    });
    const key = state.currentPeriod as string;
    const d = new Date(key + "-01T12:00:00");
    d.setMonth(d.getMonth() - 1);
    const old = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    state.currentPeriod = old;
    (state.periods as { id: string }[])[0].id = old;
    store.put(state, "profile");
    await new Promise<void>((resolve) => {
      tx.oncomplete = () => resolve();
    });
    db.close();
  });
  await page.reload();
  await expect(page.getByText(/Почався новий місяць/)).toBeVisible();
  await page.getByRole("link", { name: "Бюджет", exact: true }).click();
  await expect(page.getByLabel("Сума Основний дохід")).toHaveCount(0);
  await page.getByRole("button", { name: "Скопіювати", exact: true }).click();
  await expect(page.getByLabel("Сума Основний дохід")).toHaveValue("65000");
});
test("eOselya, deposit calculator and public source metadata", async ({
  page,
}) => {
  await page.goto("/eoselia");
  await page.getByLabel("Вартість житла", { exact: true }).fill("3000000");
  await page.getByLabel("Ваш вік на дату кредиту").fill("24");
  await page.getByLabel("Запланований перший внесок").fill("300000");
  await expect(
    page
      .locator(".metric")
      .filter({ hasText: "Мінімальний внесок" })
      .getByText(/300/),
  ).toBeVisible();
  await expect(
    page.locator(".metric").filter({ hasText: "Платіж на початку" }),
  ).not.toContainText("—");
  await page.goto("/deposit-calculator");
  await page.getByLabel("Сума депозиту").fill("10000");
  await page.getByLabel("Ставка банку").fill("12");
  await page.getByLabel("Податок із відсотків (ваше значення)").fill("23");
  await expect(
    page.locator(".metric").filter({ hasText: "Всього після комісій" }),
  ).toContainText("10");
  await page.goto("/data-sources");
  await expect(page.getByRole("link", { name: /Держстат/ })).toBeVisible();
});
test("encrypted backup downloads no plaintext and user data deletes only after confirmation", async ({
  page,
}) => {
  await onboard(page);
  await page.getByRole("link", { name: "Налаштування", exact: true }).click();
  await page
    .getByLabel("Пароль backup (щонайменше 10 символів)")
    .fill("testing-safe-password");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Завантажити backup" }).click();
  const backup = await download;
  expect(backup.suggestedFilename()).toContain("e-kapital-backup");
  const path = await backup.path();
  expect(path).toBeTruthy();
  const text = await readFile(path!, "utf8");
  expect(text).not.toContain("65000");
  expect(text).not.toContain("Основний дохід");
  expect(JSON.parse(text).data).toBeTruthy();
  await page
    .getByRole("button", { name: "Видалити всі мої дані", exact: true })
    .click();
  await page.getByRole("button", { name: "Скасувати", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Налаштування", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Видалити всі мої дані", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Так, хочу видалити", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Остаточно видалити", exact: true })
    .click();
  await expect(page.getByLabel("Місячний дохід після податків")).toBeVisible();
});
test("manifest, sources, privacy, sitemap, JSON-LD and provider disclosures", async ({
  page,
  request,
}) => {
  const manifest = await request.get("/manifest.webmanifest");
  const m = await manifest.json();
  expect(m.start_url).toBe("/app");
  expect(
    m.icons.some((i: { purpose: string }) => i.purpose === "maskable"),
  ).toBe(true);
  expect((await request.get("/sw.js")).status()).toBe(200);
  const sitemap = await request.get("/sitemap.xml");
  expect(await sitemap.text()).toContain("/eoselia");
  expect(await sitemap.text()).not.toContain("/app");
  await page.goto("/");
  const schema = await page
    .locator('script[type="application/ld+json"]')
    .textContent();
  expect(JSON.parse(schema!)["@context"]).toBeTruthy();
  await page.goto("/privacy");
  await expect(
    page.getByText(/IndexedDB браузера цього пристрою/),
  ).toBeVisible();
  await page.goto("/ovdp");
  const providers = page.locator('a[target="_blank"]');
  for (let i = 0; i < (await providers.count()); i++)
    expect(await providers.nth(i).getAttribute("rel")).toContain("noopener");
  await expect(
    page.getByText(/Партнерські посилання не активні/i),
  ).toBeVisible();
});
test("all public and app routes respond without horizontal page overflow", async ({
  page,
  request,
}) => {
  const sitemap = await (await request.get("/sitemap.xml")).text();
  const paths = [...sitemap.matchAll(/<loc>[^<]+<\/loc>/g)].map(
    (m) => new URL(m[0].replace(/<\/?loc>/g, "")).pathname,
  );
  for (const path of paths) {
    const r = await request.get(path);
    expect(r.status(), path).toBe(200);
  }
  await page.goto("/");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  await onboard(page);
  for (const path of [
    "budget",
    "reserve",
    "goals",
    "portfolio",
    "capital",
    "history",
    "settings",
  ]) {
    await page.goto("/app/" + path);
    await expect(page.locator(".page-title h1")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      path,
    ).toBe(true);
  }
  await page.goto("/app");
  await page.screenshot({
    path: `test-results/dashboard-${test.info().project.name}.png`,
    fullPage: true,
  });
});
test("offline app shell retains IndexedDB state", async ({
  page,
  context,
  browserName,
  baseURL,
  request,
}) => {
  // WebKit setOffline bypasses SW responses: microsoft/playwright#42775.
  // A dedicated origin outage tests its actual service-worker fallback.
  let blocked = false;
  const proxy =
    browserName === "webkit"
      ? createServer(async (req, res) => {
          if (blocked) {
            req.socket.destroy();
            return;
          }
          try {
            const upstream = await fetch(new URL(req.url!, baseURL!), {
              redirect: "manual",
            });
            res.statusCode = upstream.status;
            for (const [key, value] of upstream.headers)
              if (
                ![
                  "content-encoding",
                  "content-length",
                  "transfer-encoding",
                ].includes(key)
              )
                res.setHeader(key, value);
            res.end(Buffer.from(await upstream.arrayBuffer()));
          } catch {
            res.statusCode = 502;
            res.end();
          }
        })
      : null;
  if (proxy)
    await new Promise<void>((resolve) => proxy.listen(0, "127.0.0.1", resolve));
  const origin = proxy
    ? `http://127.0.0.1:${(proxy.address() as AddressInfo).port}`
    : "";
  try {
    await onboard(page, origin);
    await page.evaluate(() =>
      navigator.serviceWorker.ready.then(() => undefined),
    );
    await expect
      .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller), {
        timeout: 30000,
      })
      .toBe(true);
    await expect
      .poll(() => page.evaluate(async () => !!(await caches.match("/app"))))
      .toBe(true);
    if (proxy) {
      blocked = true;
      await expect(
        request.get(origin + "/api/health", { timeout: 3000 }),
      ).rejects.toThrow();
    } else await context.setOffline(true);
    const response = await page.reload();
    expect(response?.fromServiceWorker()).toBe(true);
    await expect(
      page.getByRole("heading", { name: "Мій капітал", exact: true }),
    ).toBeVisible();
    await expect(page.locator(".stat-accent").getByText(/120/)).toBeVisible();
  } finally {
    if (proxy) {
      proxy.closeAllConnections();
      await new Promise<void>((resolve) => proxy.close(() => resolve()));
    } else await context.setOffline(false);
  }
});

test("market payload stays small and historical series loads only on demand", async ({
  request,
  page,
}) => {
  const response = await request.get("/api/market");
  expect(response.status()).toBe(200);
  const text = await response.text();
  expect(text.length).toBeLessThan(600000);
  expect((await response.json()).history).toEqual({});
  const rows = await request.get(
    "/api/history?asset=usd&from=2025-01-01&to=2025-12-31",
  );
  const data = await rows.json();
  expect(data.points.length).toBeGreaterThan(300);
  expect(
    data.points.every(
      (p: { date: string }) => p.date >= "2025-01-01" && p.date <= "2025-12-31",
    ),
  ).toBe(true);
  expect((await request.get("/api/history?asset=income")).status()).toBe(400);
  await page.goto("/currency");
  await expect(
    page.getByText("Історичні дані, не очікувана дохідність", { exact: true }),
  ).toBeVisible();
});
