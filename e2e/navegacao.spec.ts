import { type Page, expect, test } from "@playwright/test";

import { proximaSegunda } from "./admin-helpers";

// Servidor lento (1,5 s em cada navegação, sem contar os prefetch): o ecrã tem de reagir logo.
async function servidorLento(page: Page) {
  await page.route("**/*", async (r) => {
    const h = r.request().headers();
    if (h["rsc"] && !h["next-router-prefetch"]) {
      await new Promise((ok) => setTimeout(ok, 1500));
    }
    await r.continue();
  });
}

test("mudar de página mostra logo o ecrã de espera", async ({ page }) => {
  await servidorLento(page);
  await page.goto("/");
  await page.waitForTimeout(2500); // prefetch do esqueleto
  await page
    .getByRole("link", { name: /Manicure simples/ })
    .first()
    .click();
  await expect(page.getByRole("status", { name: "A carregar" })).toBeVisible({
    timeout: 500,
  });
  await expect(
    page.getByRole("heading", { name: "Escolhe o dia e a hora" }),
  ).toBeVisible();
});

test("mudar só os parâmetros mostra a barra no topo até a página chegar", async ({
  page,
}) => {
  await servidorLento(page);
  await page.goto("/marcar");
  await page.getByRole("link", { name: /Manicure simples/ }).click();
  await expect(
    page.getByRole("heading", { name: "Escolhe o dia e a hora" }),
  ).toBeVisible();
  await page.goto(`${page.url()}&dia=${proximaSegunda()}`);
  await page
    .getByRole("group", { name: "Horas livres" })
    .getByRole("button")
    .first()
    .click();
  await page.getByRole("link", { name: "Continuar" }).click();
  const barra = page.locator("[data-barra-navegacao]");
  await expect(barra).toHaveCount(1, { timeout: 500 });
  await expect(
    page.getByRole("heading", { name: "Os teus dados" }),
  ).toBeVisible();
  await expect(barra).toHaveCount(0);
});
