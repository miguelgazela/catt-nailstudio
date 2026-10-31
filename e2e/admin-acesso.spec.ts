import { expect, test } from "@playwright/test";

import {
  criarAdmin,
  db,
  entrarAdmin,
  limparUtilizadores,
  novoLink,
  totp,
} from "./admin-helpers";

test.beforeEach(limparUtilizadores);

test("admin com MFA: link, código e painel", async ({ page }) => {
  const a = await criarAdmin();
  await page.goto(await novoLink(a.email));
  // Só com o link ainda não entra no painel.
  await expect(page).toHaveURL(/\/admin\/mfa/);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/mfa/);

  await page.getByLabel("Código da app").fill("000000");
  await page.getByRole("button", { name: "Entrar no painel" }).click();
  await expect(page.getByText("Código errado ou expirado")).toBeVisible();

  await page.getByLabel("Código da app").fill(totp(a.segredo));
  await page.getByRole("button", { name: "Entrar no painel" }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("heading", { name: "Agenda" })).toBeVisible();
});

test("primeira vez: configura o MFA no ecrã", async ({ page }) => {
  const c = db();
  const { data } = await c.auth.admin.createUser({
    email: "nova@example.com",
    email_confirm: true,
  });
  await c.from("admins").insert({ user_id: data.user!.id });
  await page.goto(await novoLink("nova@example.com"));
  await expect(page).toHaveURL(/\/admin\/mfa/);
  await page.getByRole("button", { name: "Configurar" }).click();
  const segredo = (await page.locator("code").innerText()).trim();
  await page.getByLabel("Código da app").fill(totp(segredo));
  await page.getByRole("button", { name: "Entrar no painel" }).click();
  await expect(page.getByRole("heading", { name: "Agenda" })).toBeVisible();
});

test("o painel fecha quando a sessão expira", async ({ page, context }) => {
  const a = await criarAdmin();
  await entrarAdmin(page, a);
  await expect(page.getByRole("heading", { name: "Agenda" })).toBeVisible();
  // Sem o cookie do painel (expirado ou apagado) pede só o código, sem novo email.
  await context.clearCookies({ name: "painel" });
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/mfa\?expirou=1/);
  await expect(page.getByText("O painel fechou por segurança")).toBeVisible();
  await page.getByLabel("Código da app").fill(totp(a.segredo));
  await page.getByRole("button", { name: "Entrar no painel" }).click();
  await expect(page.getByRole("heading", { name: "Agenda" })).toBeVisible();
});

test("quem não é admin continua a ver 404 (sem pedir MFA)", async ({
  page,
}) => {
  await db().auth.admin.createUser({
    email: "x@example.com",
    email_confirm: true,
  });
  await page.goto(await novoLink("x@example.com"));
  const r = await page.goto("/admin");
  expect(r?.status()).toBe(404);
});
