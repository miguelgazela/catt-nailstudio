import { expect, test } from "@playwright/test";

import {
  criarAdmin,
  criarMarcacao,
  entrarAdmin,
  limparDados,
  limparUtilizadores,
  proximaSegunda,
} from "./admin-helpers";

test.beforeEach(async () => {
  await limparUtilizadores();
  await limparDados();
});

test("/api/push só aceita o segredo e responde sem chaves VAPID", async ({
  request,
}) => {
  const { id } = await criarMarcacao(proximaSegunda(), "09:00");
  const sem = await request.post("/api/push", { data: { id, evento: "nova" } });
  expect(sem.status()).toBe(401);
  const mau = await request.post("/api/push", {
    headers: { authorization: "Bearer errado!" },
    data: { id, evento: "nova" },
  });
  expect(mau.status()).toBe(401);
  const ok = await request.post("/api/push", {
    headers: { authorization: "Bearer e2e-cron" },
    data: { id, evento: "nova" },
  });
  expect(ok.status()).toBe(200);
  expect(await ok.json()).toEqual({ enviados: 0 });
  const invalido = await request.post("/api/push", {
    headers: { authorization: "Bearer e2e-cron" },
    data: { id: "x", evento: "nova" },
  });
  expect(invalido.status()).toBe(400);
});

test("definições mostram o estado das notificações", async ({ page }) => {
  await entrarAdmin(page, await criarAdmin());
  await page.goto("/admin/definicoes");
  await expect(
    page.getByRole("heading", { name: /Notificações neste telemóvel/ }),
  ).toBeVisible();
  await expect(
    page.getByText("ainda não estão configuradas no servidor"),
  ).toBeVisible();
  const sw = await page.request.get("/sw.js");
  expect(sw.ok()).toBe(true);
});
