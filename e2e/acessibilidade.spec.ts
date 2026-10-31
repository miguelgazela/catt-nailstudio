import AxeBuilder from "@axe-core/playwright";
import { type Page, expect, test } from "@playwright/test";

import {
  criarAdmin,
  criarMarcacao,
  db,
  entrarAdmin,
  limparDados,
  limparUtilizadores,
  proximaSegunda,
} from "./admin-helpers";

// axe-core (WCAG 2.0/2.1 A e AA) nas páginas públicas, /marcar, /conta e no painel.
async function semViolacoes(page: Page, caminho: string) {
  await page.goto(caminho);
  await page.waitForTimeout(500);
  const r = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(
    r.violations.map(
      (v) => `${v.id}: ${v.nodes.map((n) => n.target).join(" | ")}`,
    ),
    caminho,
  ).toEqual([]);
}

test.beforeEach(async () => {
  await limparUtilizadores();
  await limparDados();
});

test("páginas públicas e /marcar", async ({ page }) => {
  for (const c of ["/", "/marcar", "/entrar", "/privacidade", "/termos"]) {
    await semViolacoes(page, c);
  }
});

test("a primeira tabulação chega a um controlo com foco visível", async ({
  page,
}) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  const foco = await page.evaluate(() => {
    const el = document.activeElement as HTMLElement;
    const s = getComputedStyle(el);
    return {
      tag: el.tagName,
      contorno: s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0,
      sombra: s.boxShadow !== "none",
    };
  });
  expect(["A", "BUTTON"]).toContain(foco.tag);
  expect(foco.contorno || foco.sombra).toBe(true);
});

test("/conta (cliente com conta)", async ({ page }) => {
  const email = "cliente-a11y@example.com";
  const sb = db();
  await sb.auth.admin.createUser({ email, email_confirm: true });
  const { data } = await sb.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  await page.goto(
    `/auth/confirmar?token_hash=${data.properties!.hashed_token}&type=magiclink&next=${encodeURIComponent("/conta")}`,
  );
  await expect(page).toHaveURL(/\/conta/);
  await semViolacoes(page, "/conta");
});

test("painel", async ({ page }) => {
  const a = await criarAdmin();
  const { id } = await criarMarcacao(proximaSegunda(), "09:00");
  expect(id).toBeTruthy();
  await entrarAdmin(page, a);
  for (const c of [
    "/admin",
    "/admin/semana",
    "/admin/nova",
    "/admin/clientes",
    "/admin/servicos",
    "/admin/horario",
    "/admin/definicoes",
    `/admin/marcacao/${id}`,
  ]) {
    await semViolacoes(page, c);
  }
});
