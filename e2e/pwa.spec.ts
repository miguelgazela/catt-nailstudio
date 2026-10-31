import { expect, test } from "@playwright/test";

import { criarAdmin, entrarAdmin, limparUtilizadores } from "./admin-helpers";

test("manifest tem nome, cores, start_url e ícones que existem", async ({
  request,
}) => {
  const r = await request.get("/manifest.webmanifest");
  expect(r.status()).toBe(200);
  const m = await r.json();
  expect(m.name).toBe("Catarina Neves Nails Studio");
  expect(m.short_name).toBe("Catarina Neves");
  expect(m.display).toBe("standalone");
  expect(m.theme_color).toBe("#7A3B52");
  expect(m.background_color).toBe("#F7F1EC");
  expect(m.start_url).toBe("/abrir");
  const tamanhos = m.icons.map(
    (i: { sizes: string; purpose: string }) => `${i.sizes}:${i.purpose}`,
  );
  expect(tamanhos).toEqual(
    expect.arrayContaining(["192x192:any", "512x512:any", "512x512:maskable"]),
  );
  for (const i of m.icons) {
    const img = await request.get(i.src);
    expect(img.status(), i.src).toBe(200);
    expect(img.headers()["content-type"]).toBe("image/png");
  }
});

test("/abrir manda quem não é admin para a página inicial", async ({
  request,
}) => {
  const r = await request.get("/abrir", { maxRedirects: 0 });
  expect(r.status()).toBe(307);
  expect(new URL(r.headers().location).pathname).toBe("/");
});

test("página inicial liga manifest, apple-touch-icon e splash iOS", async ({
  page,
  request,
}) => {
  await page.goto("/");
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
    "href",
    /manifest\.webmanifest/,
  );
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute(
    "href",
    "/icons/apple-touch-icon.png",
  );
  await expect(
    page.locator('meta[name="apple-mobile-web-app-title"]'),
  ).toHaveAttribute("content", "Catarina Neves");
  const splash = page.locator('link[rel="apple-touch-startup-image"]');
  expect(await splash.count()).toBeGreaterThanOrEqual(5);
  for (const href of await splash.evaluateAll((l) =>
    l.map((x) => x.getAttribute("href")!),
  )) {
    expect((await request.get(href)).status(), href).toBe(200);
  }
  const icone = await request.get("/icons/apple-touch-icon.png");
  expect(icone.status()).toBe(200);
});

test("sem rede, a navegação mostra a página offline", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await page.evaluate(() => navigator.serviceWorker.ready);
  // Garante que o SW controla a página antes de cortar a rede.
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
  await context.setOffline(true);
  await page.goto("/marcar").catch(() => {});
  await expect(
    page.getByRole("heading", { name: "Sem ligação" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Tentar outra vez" }),
  ).toBeVisible();
  await context.setOffline(false);
});

test("o service worker não guarda páginas em cache", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => navigator.serviceWorker.ready);
  const chaves = await page.evaluate(async () => {
    const out: string[] = [];
    for (const n of await caches.keys()) {
      const c = await caches.open(n);
      out.push(...(await c.keys()).map((r) => new URL(r.url).pathname));
    }
    return out.sort();
  });
  expect(chaves).toEqual(["/icons/icon-192.png", "/offline.html"]);
});

test("/abrir leva a Catarina (admin) direto ao painel", async ({ page }) => {
  await limparUtilizadores();
  const a = await criarAdmin();
  await entrarAdmin(page, a);
  await page.goto("/abrir");
  await expect(page).toHaveURL(/\/admin(\/|$)/);
});
