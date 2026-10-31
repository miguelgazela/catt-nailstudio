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

test("ativar grava a subscrição no servidor e reabrir volta a sincronizar", async ({
  page,
}) => {
  const a = await criarAdmin();
  // O browser dos testes não fala com um serviço de push a sério: finge a subscrição.
  // Guarda o estado em localStorage para sobreviver ao reload, como a subscrição real.
  await page.addInitScript(() => {
    const falsa = {
      endpoint: "https://push.example.com/e2e-dispositivo",
      toJSON: () => ({
        endpoint: "https://push.example.com/e2e-dispositivo",
        keys: { p256dh: "chave-p256dh-de-teste", auth: "auth-de-teste" },
      }),
      unsubscribe: async () => {
        localStorage.removeItem("e2e-sub");
        return true;
      },
    };
    // O Chromium headless nega sempre notificações, mesmo com grantPermissions.
    Object.defineProperty(Notification, "permission", { get: () => "granted" });
    Notification.requestPermission = async () => "granted";
    PushManager.prototype.subscribe = async function () {
      localStorage.setItem("e2e-sub", "1");
      return falsa as unknown as PushSubscription;
    };
    PushManager.prototype.getSubscription = async function () {
      return (
        localStorage.getItem("e2e-sub") ? falsa : null
      ) as PushSubscription | null;
    };
  });
  await entrarAdmin(page, a);
  await page.goto("/admin/definicoes");
  await expect(
    page.getByRole("heading", { name: /Notificações neste telemóvel/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Ativar notificações" }).click();
  await expect(page.getByText("Ativas neste telemóvel.")).toBeVisible();

  const c = db();
  const { data } = await c
    .from("push_subscriptions")
    .select("user_id, endpoint");
  expect(data).toEqual([
    { user_id: a.id, endpoint: "https://push.example.com/e2e-dispositivo" },
  ]);

  // Browser subscrito mas servidor sem a linha (o caso do bug): abrir as definições volta a gravar.
  await c.from("push_subscriptions").delete().eq("user_id", a.id);
  await page.reload();
  await expect(page.getByText("Ativas neste telemóvel.")).toBeVisible();
  await expect
    .poll(async () => {
      const { count } = await c
        .from("push_subscriptions")
        .select("id", { count: "exact", head: true });
      return count;
    })
    .toBe(1);

  const sw = await page.request.get("/sw.js");
  expect(sw.ok()).toBe(true);
});
