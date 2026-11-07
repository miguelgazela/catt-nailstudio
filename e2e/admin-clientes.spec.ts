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

test("pesquisa por nome e por telemóvel, e filtra por faltas e bloqueio", async ({
  page,
}) => {
  const a = await criarMarcacao(segunda, "09:00", "Ana Silva", "+351911111111");
  await criarMarcacao(segunda, "10:00", "Bruna Costa", "+351922222222");
  await db().from("clients").update({ blocked: true }).eq("id", a.clienteId);

  await page.goto("/admin/clientes");
  await expect(page.getByRole("link", { name: /Ana Silva/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Bruna Costa/ })).toBeVisible();

  await page.getByLabel("Pesquisar clientes").fill("bruna");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("link", { name: /Bruna Costa/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Ana Silva/ })).toHaveCount(0);

  await page.getByLabel("Pesquisar clientes").fill("91 111");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("link", { name: /Ana Silva/ })).toBeVisible();

  await page.goto("/admin/clientes?f=bloqueadas");
  await expect(page.getByRole("link", { name: /Ana Silva/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Bruna Costa/ })).toHaveCount(0);

  await page.goto("/admin/clientes?f=faltas");
  await expect(page.getByText("Nenhuma cliente encontrada.")).toBeVisible();
});

test("ficha: editar notas, histórico, bloquear e exportar", async ({
  page,
}) => {
  const a = await criarMarcacao(segunda, "09:00", "Ana Silva", "+351911111111");
  await page.goto(`/admin/clientes/${a.clienteId}`);
  await expect(page.getByRole("heading", { name: "Ana Silva" })).toBeVisible();
  await expect(
    page.getByText("Não registe alergias nem dados de saúde"),
  ).toBeVisible();
  await expect(page.getByText("Manicure simples · ")).toBeVisible();

  await page.getByLabel("Notas").fill("Gosta de tons nude");
  await page.getByRole("button", { name: "Guardar ficha" }).click();
  await expect(page.getByText("Ficha guardada.")).toBeVisible();
  const { data } = await db()
    .from("clients")
    .select("notes")
    .eq("id", a.clienteId)
    .single();
  expect(data?.notes).toBe("Gosta de tons nude");

  await page.getByLabel("Telemóvel").fill("123");
  await page.getByRole("button", { name: "Guardar ficha" }).click();
  await expect(page.getByText("Número inválido")).toBeVisible();

  await page.getByRole("button", { name: /Bloquear/ }).click();
  await expect(page.getByText("Cliente bloqueada.")).toBeVisible();
  // O servidor recusa marcação online de número bloqueado
  const { data: r } = await db().rpc("book_appointment", {
    p_service: (await db().from("services").select("id").limit(1).single())
      .data!.id,
    p_starts_at: new Date(Date.now() + 5 * 86400_000).toISOString(),
    p_name: "Ana",
    p_phone: "+351911111111",
  });
  expect((r as { error?: string }).error).toBe("blocked");

  const exportacao = await page.request.get(
    `/admin/clientes/${a.clienteId}/exportar`,
  );
  expect(exportacao.headers()["content-disposition"]).toContain("attachment");
  const json = await exportacao.json();
  expect(json.cliente.name).toBe("Ana Silva");
  expect(json.marcacoes).toHaveLength(1);
});

test("apagar anonimiza a cliente e mantém o histórico", async ({ page }) => {
  const a = await criarMarcacao(segunda, "09:00", "Ana Silva", "+351911111111");
  await page.goto(`/admin/clientes/${a.clienteId}`);
  await page.locator("summary", { hasText: "Apagar dados da cliente" }).click();
  await page.getByRole("button", { name: "Apagar dados" }).click();
  await expect(page.getByText("Dados da cliente apagados.")).toBeVisible();
  const { data } = await db()
    .from("clients")
    .select("name, phone, anonymized_at")
    .eq("id", a.clienteId)
    .single();
  expect(data?.name).toBe("Cliente apagada");
  expect(data?.phone).toBeNull();
  expect(data?.anonymized_at).not.toBeNull();
  await page.goto(`/admin?dia=${segunda}`);
  await expect(page.getByText("Cliente apagada")).toBeVisible();
});

test("nova marcação a partir da ficha", async ({ page }) => {
  const a = await criarMarcacao(segunda, "09:00", "Ana Silva", "+351911111111");
  await page.goto(`/admin/clientes/${a.clienteId}`);
  await page.getByRole("link", { name: "Nova marcação" }).click();
  await expect(page.getByText("Ana Silva")).toBeVisible();
  await expect(page.getByRole("button", { name: "Trocar" })).toBeVisible();
});
