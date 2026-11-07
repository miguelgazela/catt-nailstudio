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
  const a = await criarAdmin();
  await entrarAdmin(page, a);
});

test("agenda do dia: marcação, horas livres e navegação", async ({ page }) => {
  await criarMarcacao(segunda, "10:00");
  await page.goto(`/admin?dia=${segunda}`);
  await expect(page.getByRole("link", { name: /Rita Teste/ })).toBeVisible();
  await expect(page.getByText("1 marcação", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Livre · marcar/ }).first(),
  ).toBeVisible();
  await page.getByRole("link", { name: "Seguinte" }).click();
  await expect(page).toHaveURL(/dia=\d{4}-\d{2}-\d{2}/);
  await expect(page.getByText("Sem marcações")).toBeVisible();
});

test("agenda da semana lista as marcações", async ({ page }) => {
  await criarMarcacao(segunda, "11:00", "Joana Semana", "+351913000111");
  await page.goto(`/admin/semana?dia=${segunda}`);
  await expect(
    page.getByRole("link", { name: /Joana Semana/ }).first(),
  ).toBeVisible();
});

test("detalhe: mover, falta e cancelar, com registo de alterações", async ({
  page,
}) => {
  const { id } = await criarMarcacao(segunda, "10:00");
  await page.goto(`/admin/marcacao/${id}`);
  await expect(page.getByRole("heading", { name: "Marcação" })).toBeVisible();
  await expect(page.getByText("10:00 às 11:00")).toBeVisible();

  await page.getByRole("link", { name: "Mover" }).click();
  await page.getByText("11:00", { exact: true }).click();
  await page.getByRole("button", { name: "Mover marcação" }).click();
  await expect(page.getByText("Marcação movida.")).toBeVisible();
  await expect(page.getByText("11:00 às 12:00")).toBeVisible();
  await expect(page.getByText(/Alterado: hora/)).toBeVisible();

  await page.locator("summary", { hasText: "Marcar falta" }).click();
  await page.getByRole("button", { name: "Marcar falta" }).click();
  await expect(page.getByText("Marcada como falta.")).toBeVisible();
  const { data } = await db()
    .from("clients")
    .select("no_show_count")
    .eq("name", "Rita Teste")
    .single();
  expect(data?.no_show_count).toBe(1);

  await page.locator("summary", { hasText: "Voltar a confirmada" }).click();
  await page.getByRole("button", { name: "Voltar a confirmada" }).click();
  await page.locator("summary", { hasText: "Cancelar marcação" }).click();
  await page.getByRole("button", { name: "Cancelar marcação" }).click();
  await expect(page.getByText("Marcação cancelada.")).toBeVisible();
  const { data: m } = await db()
    .from("appointments")
    .select("status, cancelled_by")
    .eq("id", id)
    .single();
  expect(m).toEqual({ status: "cancelled", cancelled_by: "admin" });
});

test("mover para uma hora ocupada dá erro", async ({ page }) => {
  await criarMarcacao(segunda, "10:00");
  const { id } = await criarMarcacao(
    segunda,
    "09:00",
    "Outra Cliente",
    "+351913222333",
  );
  await page.goto(`/admin/marcacao/${id}/mover`);
  await page.getByLabel("Fora do horário").check();
  await page.getByLabel(/Hora \(1 hora/).fill("10:30");
  await page.getByRole("button", { name: "Mover marcação" }).click();
  await expect(page.getByText("Essa hora já está ocupada")).toBeVisible();
});

test("nova marcação manual no horário e fora do horário", async ({ page }) => {
  await page.goto(`/admin/nova?dia=${segunda}&hora=09:00`);
  await page.getByLabel("Nome").fill("Marta Manual");
  await page.getByLabel("Telemóvel").fill("913555666");
  await page.getByRole("radio").nth(1).check({ force: true });
  await expect(page.getByText("09:00", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Guardar marcação" }).click();
  await expect(page.getByText("Marcação guardada.")).toBeVisible();
  await expect(page.getByText("Marcada por si")).toBeVisible();
  await expect(page.getByText("Marta Manual")).toBeVisible();

  // Fora do horário: 13:00 não existe no horário de segunda
  await page.goto(`/admin/nova?dia=${segunda}`);
  await page.getByLabel("Nome").fill("Marta Manual");
  await page.getByLabel("Telemóvel").fill("913555666");
  await page.getByRole("radio").nth(1).check({ force: true });
  await page.getByLabel("Fora do horário").check();
  await page.getByLabel(/Hora \(1 hora/).fill("13:00");
  await page.getByRole("button", { name: "Guardar marcação" }).click();
  await expect(page.getByText("Marcação guardada.")).toBeVisible();
  await expect(page.getByText("13:00 às 14:00")).toBeVisible();
  const { count } = await db()
    .from("clients")
    .select("*", { count: "exact", head: true })
    .eq("phone", "+351913555666");
  expect(count).toBe(1); // reutilizou a mesma ficha
});

test("não deixa marcar duas vezes a mesma hora", async ({ page }) => {
  await criarMarcacao(segunda, "09:00");
  await page.goto(`/admin/nova?dia=${segunda}`);
  await page.getByLabel("Nome").fill("Sobreposta");
  await page.getByLabel("Telemóvel").fill("913777888");
  await page.getByRole("radio").nth(1).check({ force: true });
  await page.getByLabel("Fora do horário").check();
  await page.getByLabel(/Hora \(1 hora/).fill("09:30");
  await page.getByRole("button", { name: "Guardar marcação" }).click();
  await expect(page.getByText("Essa hora já está ocupada")).toBeVisible();
});
