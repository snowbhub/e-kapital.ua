import { test, expect } from "@playwright/test";

test("physical metals use whole bars, bank spread and preserve the guest plan", async ({
  page,
}) => {
  await page.route("**/api/metals", (route) =>
    route.fulfill({
      json: {
        quotes: [
          {
            metal: "XAU",
            grams: 1,
            sell: 6800,
            buy: 6400,
            date: new Date().toISOString().slice(0, 10),
            retrievedAt: new Date().toISOString(),
          },
        ],
        error: null,
      },
    }),
  );
  await page.goto("/app");
  await page.getByLabel("Вільні гроші зараз").fill("12345");
  await expect(page.getByText("Збережено", { exact: true })).toBeVisible();
  await page.goto("/app/markets");
  await expect(page.getByText("1 × 1 г", { exact: true })).toBeVisible();
  await expect(
    page.getByText(/Ціна викупу має зрости на 6[,.]3%/),
  ).toBeVisible();
  await expect(
    page.getByText("Грошей залишиться", { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Акції та фонди", exact: true })
    .click();
  await expect(
    page.getByText(/Поточний торговий потік акцій і ETF не підключений/),
  ).toBeVisible();
  await page.goto("/app/account");
  await expect(
    page.getByRole("heading", { name: "Ваші плани — з вами" }),
  ).toBeVisible();
  await page.goto("/app");
  await expect(page.getByLabel("Вільні гроші зараз")).toHaveValue("12345");
});
