import { expect, test } from "@playwright/test";

import {
  criarAdmin,
  criarMarcacao,
  db,
  entrarAdmin,
  limparDados,
  limparUtilizadores,
  proximaSegunda,
} from "./admin-helpers";

const segunda = proximaSegunda();

test.beforeEach(async ({ page }) => {
  await limparUtilizadores();
  await limparDados();
  await entrarAdmin(page, await criarAdmin());
});

test("acrescenta e remove um período, sem aceitar sobreposições", async ({ page }) => {
  await page.goto("/admin/horario");
  // Domingo está fechado
  await page.locator("#weekday").selectOption("7");
  await page.getByLabel("Das").first().fill("10:00");
  await page.getByLabel("Às").first().fill("12:00");
  await page.getByRole("button", { name: "Acrescentar" }).click();
  await expect(page.getByText("Período guardado.")).toBeVisible();
  await expect(page.getByText("10:00 às 12:00")).toBeVisible();

  await page.locator("#weekday").selectOption("7");
  await page.getByLabel("Das").first().fill("11:00");
  await page.getByLabel("Às").first().fill("13:00");
  await page.getByRole("button", { name: "Acrescentar" }).click();
  await expect(page.getByText("sobrepõe-se")).toBeVisible();

  await page.getByRole("button", { name: /Remover período de Domingo/ }).click();
  await expect(page.getByText("Período removido.")).toBeVisible();
});

test("o bloqueio tira as horas da agenda e avisa se já há marcações", async ({ page }) => {
  await criarMarcacao(segunda, "09:00");
  await page.goto("/admin/horario");
  await page.getByLabel("Do dia").fill(segunda);
  await page.getByLabel("Motivo (opcional)").first().fill("Férias");
  await page.getByRole("button", { name: "Bloquear dias" }).click();
  await expect(page.getByText("Bloqueio guardado.")).toBeVisible();
  await expect(page.getByText("já há 1 marcação neste período")).toBeVisible();

  await page.goto(`/admin?dia=${segunda}`);
  await expect(page.getByText("Bloqueada: Férias").first()).toBeVisible();
  // A vaga online também desaparece (available_slots respeita time_off)
  const { data } = await db().rpc("available_slots", { p_from: segunda, p_to: segunda });
  expect(data ?? []).toHaveLength(0);

  await page.goto("/admin/horario");
  await page.getByRole("button", { name: "Remover bloqueio" }).click();
  await expect(page.getByText("Bloqueio removido.")).toBeVisible();
});

test("bloqueia umas horas", async ({ page }) => {
  await page.goto("/admin/horario");
  await page.locator("#dia").fill(segunda);
  await page.getByLabel("Das").nth(1).fill("10:00");
  await page.getByLabel("Às").nth(1).fill("12:00");
  await page.getByRole("button", { name: "Bloquear horas" }).click();
  await expect(page.getByText("Bloqueio guardado.")).toBeVisible();
  await page.goto(`/admin?dia=${segunda}`);
  await expect(page.getByText("Bloqueada").first()).toBeVisible();
  await expect(page.getByRole("link", { name: /Livre · marcar/ }).first()).toBeVisible();
});
