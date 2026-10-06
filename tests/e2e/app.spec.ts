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
  await page.goto(base + "/app/setup");
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
async function navigate(page: Page, name: string) {
  const link = page.getByRole("link", { name, exact: true });
  if (!(await link.isVisible())) {
    const mobile = page.getByRole("button", { name: "Меню", exact: true });
    await (
      (await mobile.isVisible())
        ? mobile
        : page.getByRole("button", {
            name: "Додаткові інструменти",
            exact: true,
          })
    ).click();
  }
  const href = await link.getAttribute("href");
  await link.click();
  if (href) await page.waitForURL((url) => url.pathname === href);
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
  await navigate(page, "Бюджет");
  await expect(page.getByLabel("Сума Основний дохід")).toHaveValue("65000");
  await page.getByLabel("Інвестиційний капітал", { exact: true }).fill("30");
  await expect(page.getByText("Разом 100%", { exact: true })).toBeVisible();
  await navigate(page, "Мої цілі");
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
  await navigate(page, "Портфель");
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
  await navigate(page, "Мої цілі");
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
  await navigate(page, "Бюджет");
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
  await navigate(page, "Налаштування");
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
  await expect(page.getByLabel("Сума для рішення (без резерву)")).toHaveValue(
    "0",
  );
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
    const overflow = await page.evaluate(() =>
      [...document.querySelectorAll("main *")]
        .filter((el) => el.getBoundingClientRect().right > innerWidth + 1)
        .map((el) => ({ tag: el.tagName, class: el.className, right: el.getBoundingClientRect().right, text: el.textContent?.slice(0, 100) })),
    );
    if (overflow.length) console.log("Overflow diagnostics", path, overflow);
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
    await page.goto(origin + "/app");
    await page.getByLabel("Сума для рішення (без резерву)").fill("120000");
    await expect(page.getByText("Збережено", { exact: true })).toBeVisible();
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
      page.getByRole("heading", { name: "Що можуть дати ваші гроші?" }),
    ).toBeVisible();
    await expect(page.getByLabel("Сума для рішення (без резерву)")).toHaveValue(
      "120000",
    );
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

test("amount editing, formatted summary and responsive app menu", async ({
  page,
}) => {
  await page.goto("/app/setup");
  const income = page.getByLabel("Місячний дохід після податків");
  await income.focus();
  await expect(income).toHaveValue("");
  await income.pressSequentially("0550");
  await expect(income).toHaveValue("550");
  await income.fill("65 000,50");
  await page.getByLabel("Обов’язкові витрати на місяць").fill("43000");
  await expect(income).toHaveValue("65000.5");
  await expect(page.locator(".onboarding-context strong")).toContainText("22");
  await page.getByRole("button", { name: "Продовжити" }).click();
  await page.getByLabel("Поточний фінансовий резерв").fill("550");
  await page.getByLabel("Інший поточний капітал (без резерву)").fill("55000");
  await page.getByRole("button", { name: "Назад", exact: true }).click();
  await expect(income).toHaveValue("65000.5");
  await page.getByRole("button", { name: "Продовжити" }).click();
  await expect(page.getByLabel("Поточний фінансовий резерв")).toHaveValue(
    "550",
  );
  await page.getByRole("button", { name: "Продовжити" }).click();
  await expect(page.locator(".onboarding-summary")).toContainText(/55\s000/);
  await page.getByRole("button", { name: "Відкрити мій єКапітал" }).click();
  await expect(page.getByText("Збережено", { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 320, height: 640 });
  const menu = page.getByRole("button", { name: "Меню", exact: true });
  await menu.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(menu).toBeFocused();
  await menu.click();
  await page.getByRole("button", { name: "Закрити меню" }).click();
  await navigate(page, "Мої активи");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.getByLabel("Вартість Поточний капітал")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await navigate(page, "Бюджет");
  await expect(page.getByLabel("Сума Основний дохід")).toHaveValue("65000.5");
  await page.getByRole("button", { name: "Додати дохід", exact: true }).click();
  const amount = page.getByLabel("Сума Зарплата", { exact: true });
  await amount.focus();
  await expect(amount).toHaveValue("");
  await amount.pressSequentially("0550");
  await expect(amount).toHaveValue("550");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("numeric drafts respect bounds and whole-number terms", async ({
  page,
}) => {
  await page.goto("/deposit-calculator");
  const months = page.getByLabel("Строк у місяцях", { exact: true });
  const before = await page.locator(".metrics").textContent();
  const valid = await months.inputValue();
  await months.fill("0");
  await expect(months).toHaveAttribute("aria-invalid", "true");
  await expect(page.locator(".metrics")).toHaveText(before!);
  await months.fill("1.5");
  await expect(
    page.getByText("Введіть ціле число", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Ставка банку", { exact: true }).focus();
  await expect(months).toHaveValue(valid);
  const sum = page.getByLabel("Сума депозиту", { exact: true });
  await sum.fill("1000000000001");
  await expect(sum).toHaveAttribute("aria-invalid", "true");
  await sum.fill("50000,25");
  await expect(sum).toHaveAttribute("aria-invalid", "false");
});

test("three inputs lead to an investment decision, saved assumptions and a next step", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/app");
  await expect(
    page.getByRole("heading", { name: "Що можуть дати ваші гроші?" }),
  ).toBeVisible();
  await expect(page.getByLabel("Місячний дохід після податків")).toHaveCount(0);
  await expect(page.locator(".decision-start input:visible")).toHaveCount(3);
  await page.getByLabel("Сума для рішення (без резерву)").fill("100000");
  await page.getByLabel("Можу додавати щомісяця").fill("5000");
  await page.getByLabel("На скільки місяців?").fill("12");
  const card = page.locator(".comparison-card").filter({
    has: page.getByRole("heading", { name: "Депозит", exact: true }),
  });
  await card.locator("summary").click();
  await page
    .getByLabel("Депозит: грошові виплати на рік", { exact: true })
    .fill("15");
  await page
    .getByLabel("Депозит: податок із виплат", { exact: true })
    .fill("23");
  await card.getByRole("button", { name: "Розібрати цей варіант" }).click();
  await page
    .getByLabel("Мій наступний крок", { exact: true })
    .fill("Перевірити договір і дострокове повернення");
  await page
    .getByRole("button", { name: "Зберегти мій план", exact: true })
    .click();
  await expect(
    page.getByText("План збережено на цьому пристрої.", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Збережено", { exact: true })).toBeVisible();
  await navigate(page, "Мої плани");
  await expect(
    page.getByText("Перевірити договір і дострокове повернення", {
      exact: true,
    }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Мої плани", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Порахувати знову" }).click();
  await expect(page.getByLabel("Сума для рішення (без резерву)")).toHaveValue(
    "100000",
  );
  await card.locator("summary").click();
  await expect(
    page.getByLabel("Депозит: грошові виплати на рік", { exact: true }),
  ).toHaveValue("15");
  await expect(
    page.getByLabel("Депозит: податок із виплат", { exact: true }),
  ).toHaveValue("23");
  await page.setViewportSize({ width: 320, height: 640 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `test-results/decision-${test.info().project.name}.png`,
    fullPage: true,
  });
  expect(errors).toEqual([]);
});

test("housing compares equal budgets and exposes gaps before saving a plan", async ({
  page,
}) => {
  await page.goto("/app/home");
  await page.getByLabel("Мої гроші на житло (без резерву)").fill("100000");
  await page.getByLabel("Можу відкладати крім оренди").fill("10000");
  await page.getByLabel("Вартість бажаного житла").fill("3000000");
  await page.getByLabel("Моя оренда на місяць").fill("15000");
  await expect(page.locator(".housing-verdict")).toContainText(/500\s000/);
  await expect(page.locator(".housing-paths")).toContainText("Недоступно");
  await page.getByLabel("Мої гроші на житло (без резерву)").fill("1000000");
  await expect(page.locator(".housing-paths")).not.toContainText("Недоступно");
  await page.getByLabel("Чиста дохідність грошових виплат").fill("12");
  await expect(page.locator(".coverage-card .metric").first()).toContainText(
    /4\s000/,
  );
  await page
    .getByLabel("Перевірити без інвестиційного доходу та виплат")
    .check();
  await expect(page.locator(".coverage-card .metric").first()).toContainText(
    "0",
  );
  await page
    .getByRole("button", { name: "Перевірити іпотеку з банком", exact: true })
    .click();
  await page.getByRole("button", { name: "Зберегти план житла" }).click();
  await expect(page.getByText("Збережено", { exact: true })).toBeVisible();
  await navigate(page, "Мої плани");
  await page.getByRole("link", { name: "Порахувати знову" }).click();
  await expect(page.getByLabel("Вартість бажаного житла")).toHaveValue(
    "3000000",
  );
  await expect(page.getByLabel("Чиста дохідність грошових виплат")).toHaveValue(
    "12",
  );
  await page.setViewportSize({ width: 320, height: 640 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `test-results/housing-${test.info().project.name}.png`,
    fullPage: true,
  });
});
