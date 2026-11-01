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

test("estatísticas: chega-se pelas Definições e conta as marcações", async ({
  page,
}) => {
  const c = db();
  const { data: s } = await c
    .from("services")
    .select("id, price_cents")
    .eq("name", "Manicure gel")
    .single();
  const { data: cli } = await c
    .from("clients")
    .insert({ name: "Rita Teste", phone: "+351910000123" })
    .select("id")
    .single();
  const ontem = new Date(Date.now() - 24 * 60 * 60 * 1000);
  ontem.setUTCMinutes(0, 0, 0);
  const { error } = await c.from("appointments").insert({
    client_id: cli!.id,
    service_id: s!.id,
    starts_at: ontem.toISOString(),
    ends_at: new Date(ontem.getTime() + 60 * 60 * 1000).toISOString(),
    price_cents: s!.price_cents,
    status: "done",
    origin: "online",
  });
  expect(error).toBeNull();

  await page.goto("/admin/definicoes");
  await page.getByRole("link", { name: "Estatísticas" }).click();
  await expect(
    page.getByRole("heading", { name: "Estatísticas" }),
  ).toBeVisible();
  // A tab Definições continua marcada.
  await expect(
    page.getByRole("link", { name: "Definições" }).first(),
  ).toHaveAttribute("aria-current", "page");

  await expect(page.getByText("100% online")).toBeVisible();
  await expect(page.getByText("Manicure gel")).toBeVisible();
  await page.getByRole("link", { name: "12 meses" }).click();
  await expect(page).toHaveURL(/p=365/);
  await expect(page.getByRole("link", { name: "12 meses" })).toHaveAttribute(
    "aria-current",
    "true",
  );
});
