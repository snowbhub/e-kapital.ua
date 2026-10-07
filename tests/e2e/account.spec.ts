import { test, expect } from "@playwright/test";
test.skip(
  process.env.ACCOUNT_TESTS !== "true",
  "Requires an isolated PostgreSQL test database",
);
test("passkey registration, patch sync, logout, login and server authorization", async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== "chromium", "Virtual authenticator uses CDP");
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("WebAuthn.enable");
  await cdp.send("WebAuthn.addVirtualAuthenticator", {
    options: {
      protocol: "ctap2",
      transport: "internal",
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      automaticPresenceSimulation: true,
    },
  });
  await page.goto("/app/account");
  await page
    .getByRole("button", { name: "Створити профіль", exact: true })
    .click();
  await page.getByLabel("Як до вас звертатися?").fill("Account integration");
  await page
    .getByRole("button", { name: "Створити ключ доступу", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Вітаю, Account integration" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Перенести дані пристрою", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("link", { name: "Порівняти", exact: true })
    .first()
    .click();
  await page.getByLabel("Вільні гроші зараз").fill("12345");
  await expect
    .poll(async () => {
      const r = await page.request.get("/api/profile");
      const p = await r.json();
      return p.state?.decision.inputs.capital;
    })
    .toBe(12345);
  const p = await (await page.request.get("/api/profile")).json();
  const cross = await page.request.patch("/api/profile", {
    headers: {
      Origin: "https://evil.example",
      "Content-Type": "application/json",
    },
    data: { revision: p.revision, patch: {} },
  });
  expect(cross.status()).toBe(403);
  const conflict = await page.request.patch("/api/profile", {
    headers: {
      Origin: "http://localhost:3000",
      "Content-Type": "application/json",
    },
    data: { revision: 0, patch: { decision: p.state.decision } },
  });
  expect(conflict.status()).toBe(409);
  const admin = await page.request.get("/api/admin/metrics");
  expect(admin.status()).toBe(403);
  const anonymousEvents = await page.request.post("/api/events", {
    headers: { Origin: "http://localhost:3000" },
    data: {
      events: [
        {
          id: crypto.randomUUID(),
          name: "page_view",
          feature: "compare",
          device: "desktop",
        },
      ],
    },
  });
  expect((await anonymousEvents.json()).accepted).toBe(0);
  await page.goto("/app/account");
  await page.getByRole("button", { name: "Вийти", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Ваші плани — з вами" }),
  ).toBeVisible();
  expect((await page.request.get("/api/profile")).status()).toBe(401);
  await page
    .getByRole("button", { name: "Увійти з ключем доступу", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Вітаю, Account integration" }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Порівняти", exact: true })
    .first()
    .click();
  await expect(page.getByLabel("Вільні гроші зараз")).toHaveValue("12345");
});
