import { expect, test } from "@playwright/test";

import {
  criarAdmin,
  db,
  entrarAdmin,
  limparDados,
  limparUtilizadores,
} from "./admin-helpers";

// PNG 1x1
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

test.beforeEach(async ({ page }) => {
  await limparUtilizadores();
  await limparDados();
  await entrarAdmin(page, await criarAdmin());
  // estado conhecido: só os 3 do seed, ordenados e ativos
  const c = db();
  await c
    .from("services")
    .delete()
    .not("name", "in", '("Manicure simples","Manicure gel","Unhas de gel")');
  for (const [i, n] of [
    "Manicure simples",
    "Manicure gel",
    "Unhas de gel",
  ].entries()) {
    await c
      .from("services")
      .update({ sort_order: i + 1, active: true, photo_url: null })
      .eq("name", n);
  }
});

async function ordem() {
  const { data } = await db()
    .from("services")
    .select("name")
    .order("sort_order");
  return data!.map((s) => s.name);
}

test("muda a ordem com os botões", async ({ page }) => {
  await page.goto("/admin/servicos");
  await page.getByRole("button", { name: "Descer Manicure simples" }).click();
  await expect
    .poll(ordem)
    .toEqual(["Manicure gel", "Manicure simples", "Unhas de gel"]);
  await page.getByRole("button", { name: "Subir Unhas de gel" }).click();
  await expect
    .poll(ordem)
    .toEqual(["Manicure gel", "Unhas de gel", "Manicure simples"]);
});

test("esconde e mostra um serviço (a marcação online deixa de o ver)", async ({
  page,
}) => {
  await page.goto("/admin/servicos");
  await page.getByRole("button", { name: "Esconder" }).first().click();
  await expect(page.getByText("Serviço escondido das clientes.")).toBeVisible();
  const { data } = await db()
    .from("services")
    .select("name")
    .eq("active", true);
  expect(data).toHaveLength(2);
  await page.getByRole("button", { name: "Mostrar" }).click();
  await expect(
    page.getByText("Serviço visível para as clientes."),
  ).toBeVisible();
});

test("cria um serviço com foto e depois edita o preço", async ({ page }) => {
  await page.goto("/admin/servicos/novo");
  await page.getByLabel("Nome").fill("Pedicure");
  await page.getByLabel("Preço (€)").fill("32,50");
  await page
    .getByLabel("Foto")
    .setInputFiles({ name: "x.png", mimeType: "image/png", buffer: PNG });
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText("Serviço criado.")).toBeVisible();
  const { data } = await db()
    .from("services")
    .select("*")
    .eq("name", "Pedicure")
    .single();
  expect(data?.price_cents).toBe(3250);
  expect(data?.sort_order).toBe(4);
  expect(data?.photo_url).toContain("/storage/v1/object/public/servicos/");
  const r = await page.request.get(data!.photo_url!);
  expect(r.ok()).toBe(true);

  await page.getByRole("link", { name: "Pedicure" }).click();
  await page.getByLabel("Preço (€)").fill("35");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText("Serviço guardado.")).toBeVisible();
  const { data: d2 } = await db()
    .from("services")
    .select("price_cents")
    .eq("name", "Pedicure")
    .single();
  expect(d2?.price_cents).toBe(3500);
});

test("preço inválido mostra erro no campo", async ({ page }) => {
  await page.goto("/admin/servicos/novo");
  await page.getByLabel("Nome").fill("Teste");
  await page.getByLabel("Preço (€)").fill("abc");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText("Preço inválido")).toBeVisible();
});
