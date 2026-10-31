import { createClient } from "@supabase/supabase-js";
import { type Browser, type Page, expect, test } from "@playwright/test";

const admin = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

// Números e IPs novos em cada execução: o limite de pedidos guarda contagens durante 10 minutos.
const aleatorio = (n: number) =>
  Array.from({ length: n }, () => Math.floor(Math.random() * 10)).join("");
const telefone = () => `91${aleatorio(7)}`;
const ipAleatorio = () =>
  `10.${aleatorio(2)}.${aleatorio(2)}.${aleatorio(2)}`.replace(
    /\b0+(\d)/g,
    "$1",
  );

test.use({ extraHTTPHeaders: { "x-real-ip": ipAleatorio() } });

test.beforeEach(async () => {
  // BD local limpa de marcações e clientes; o horário e os serviços vêm do seed.
  const db = admin();
  await db.from("appointments").delete().not("id", "is", null);
  await db.from("clients").delete().not("id", "is", null);
});

async function escolherPrimeiraHora(page: Page) {
  await page.goto("/marcar");
  await page.getByRole("link", { name: /Manicure simples/ }).click();
  await expect(
    page.getByRole("heading", { name: "Escolha o dia e a hora" }),
  ).toBeVisible();
  const horas = page
    .getByRole("group", { name: "Horas livres" })
    .getByRole("button");
  await expect(horas.first()).toBeVisible();
  await horas.first().click();
  await page.getByRole("link", { name: "Continuar" }).click();
  await expect(
    page.getByRole("heading", { name: "Os seus dados" }),
  ).toBeVisible();
}

async function preencher(page: Page, nome: string, tel: string, email = "") {
  await page.getByLabel("Nome").fill(nome);
  await page.getByLabel("Telemóvel").fill(tel);
  if (email) await page.getByLabel(/Email/).fill(email);
  const enviar = page.getByRole("button", { name: "Confirmar marcação" });
  await expect(enviar).toBeEnabled({ timeout: 30_000 });
  return enviar;
}

test("da página inicial para o fluxo de marcação sem erros no browser", async ({
  page,
}) => {
  const erros: string[] = [];
  page.on("pageerror", (e) => erros.push(e.message));
  await page.goto("/");
  // Uma pessoa real demora mais de meio segundo a tocar em "Marcar".
  await page.waitForTimeout(800);
  await page.getByRole("link", { name: "Marcar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Escolha o serviço" }),
  ).toBeVisible();
  await page.getByRole("link", { name: /Manicure simples/ }).click();
  await expect(
    page.getByRole("heading", { name: "Escolha o dia e a hora" }),
  ).toBeVisible();
  await page.goBack();
  await page.goBack();
  await expect(
    page.getByRole("heading", { name: /Mãos cuidadas/ }),
  ).toBeVisible();
  expect(erros).toEqual([]);
});

test("convidada marca do início ao fim", async ({ page }) => {
  const tel = telefone();
  await escolherPrimeiraHora(page);
  const enviar = await preencher(page, "Ana Ribeiro", tel, "ana@example.com");
  await enviar.click();

  await expect(
    page.getByRole("heading", { name: "Marcação confirmada" }),
  ).toBeVisible();
  await expect(page.getByText("Manicure simples")).toBeVisible();

  const { data } = await admin()
    .from("appointments")
    .select("status, clients(phone)");
  expect(data).toHaveLength(1);
  expect(data![0].status).toBe("confirmed");
  expect(data![0].clients).toMatchObject({ phone: `+351${tel}` });
});

test("a mesma pessoa não marca duas vezes sem conta", async ({ page }) => {
  const tel = telefone();
  await escolherPrimeiraHora(page);
  await (await preencher(page, "Ana Ribeiro", tel)).click();
  await expect(
    page.getByRole("heading", { name: "Marcação confirmada" }),
  ).toBeVisible();

  await escolherPrimeiraHora(page);
  await (await preencher(page, "Ana Ribeiro", tel)).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Já tem uma marcação futura" }),
  ).toBeVisible();
});

test("telemóvel inválido mostra erro no campo", async ({ page }) => {
  await escolherPrimeiraHora(page);
  await (await preencher(page, "Ana", "12345")).click();
  await expect(page.getByText("Número inválido")).toBeVisible();
});

test("duas marcações na mesma hora ao mesmo tempo: só uma ganha", async ({
  browser,
}) => {
  // A segunda pessoa abre o passo dos dados antes de a primeira confirmar.
  const a = await novaPagina(browser);
  const b = await novaPagina(browser);
  await escolherPrimeiraHora(a);
  await b.goto(a.url());
  await expect(b.getByRole("heading", { name: "Os seus dados" })).toBeVisible();

  const enviarA = await preencher(a, "Ana", telefone());
  const enviarB = await preencher(b, "Rita", telefone());
  await Promise.all([enviarA.click(), enviarB.click()]);

  await expect
    .poll(async () => {
      const urls = [a.url(), b.url()];
      return urls.filter((u) => u.includes("/marcar/confirmada")).length;
    })
    .toBe(1);
  // A perdedora volta ao passo 2 com o aviso.
  const perdedora = a.url().includes("/confirmada") ? b : a;
  await expect(
    perdedora.getByRole("alert").filter({ hasText: "acabou de ser ocupada" }),
  ).toBeVisible();

  const { data } = await admin().from("appointments").select("id");
  expect(data).toHaveLength(1);
});

async function novaPagina(browser: Browser): Promise<Page> {
  const ctx = await browser.newContext({
    baseURL: "http://localhost:3100",
    locale: "pt-PT",
    timezoneId: "Europe/Lisbon",
    viewport: { width: 412, height: 915 },
    extraHTTPHeaders: { "x-real-ip": ipAleatorio() },
  });
  return ctx.newPage();
}
