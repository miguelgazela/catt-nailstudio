import { expect, test } from "@playwright/test";

import {
  criarAdmin,
  db,
  entrarAdmin,
  limparDados,
  limparUtilizadores,
} from "./admin-helpers";

test.beforeEach(async ({ page }) => {
  await limparUtilizadores();
  await limparDados();
  await entrarAdmin(page, await criarAdmin());
});

test("guarda as definições e valida números", async ({ page }) => {
  await page.goto("/admin/definicoes");
  await page.getByLabel("Antecedência mínima (horas)").fill("3");
  await page.getByLabel("Antecedência máxima (dias)").fill("30");
  await page.getByLabel("Prazo para cancelar (horas antes)").fill("12");
  await page.getByLabel("Telemóvel", { exact: true }).fill("912 345 678");
  await page.getByLabel("Instagram").fill("@catarina.nails");
  await page.getByRole("button", { name: "Guardar definições" }).click();
  await expect(page.getByText("Definições guardadas.")).toBeVisible();
  const { data } = await db().from("settings").select("*").single();
  expect(data).toMatchObject({
    min_notice_minutes: 180,
    max_advance_days: 30,
    cancel_window_hours: 12,
    contact_phone: "+351912345678",
    instagram: "catarina.nails",
  });

  await page.getByLabel("Antecedência máxima (dias)").fill("0");
  await page.getByRole("button", { name: "Guardar definições" }).click();
  await expect(
    page.getByText("Escreva um número de dias entre 1 e 365."),
  ).toBeVisible();

  // repõe os valores por omissão
  await db()
    .from("settings")
    .update({
      min_notice_minutes: 120,
      max_advance_days: 42,
      cancel_window_hours: 24,
      contact_phone: null,
      instagram: null,
    })
    .eq("id", true);
});
