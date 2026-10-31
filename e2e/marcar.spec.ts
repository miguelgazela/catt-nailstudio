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

// Marca por RPC (como faria a Server Action) e devolve o token de cancelamento.
async function marcarPorRpc(
  opcoes: { email?: string; antecedenciaMinHoras?: number } = {},
) {
  const db = admin();
  const hoje = new Date().toISOString().slice(0, 10);
  const ate = new Date(Date.now() + 14 * 86400_000).toISOString().slice(0, 10);
  const { data: vagas } = await db.rpc("available_slots", {
    p_from: hoje,
    p_to: ate,
  });
  const minimo = Date.now() + (opcoes.antecedenciaMinHoras ?? 30) * 3600_000;
  const vaga = (vagas ?? []).find(
    (v: { starts_at: string }) => new Date(v.starts_at).getTime() > minimo,
  );
  const { data: servico } = await db
    .from("services")
    .select("id")
    .limit(1)
    .single();
  const { data } = await db.rpc("book_appointment", {
    p_service: servico!.id,
    p_starts_at: vaga!.starts_at,
    p_name: "Teste",
    p_phone: `+351${telefone()}`,
    p_email: opcoes.email,
  });
  const r = data as {
    ok: boolean;
    appointment_id: string;
    cancel_token: string | null;
  };
  expect(r.ok).toBe(true);
  return r;
}

test("cancelar pelo link do email", async ({ page }) => {
  const r = await marcarPorRpc({ email: "ana@example.com" });
  expect(r.cancel_token).toMatch(/^[0-9a-f]{64}$/);

  await page.goto(`/cancelar/${r.cancel_token}`);
  await expect(
    page.getByRole("heading", { name: "Cancelar marcação" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Cancelar marcação" }).click();
  await expect(
    page.getByRole("heading", { name: "Marcação cancelada" }),
  ).toBeVisible();

  const { data } = await admin()
    .from("appointments")
    .select("status, cancel_token_hash");
  expect(data![0].status).toBe("cancelled");
  expect(data![0].cancel_token_hash).toBeNull();

  // O link deixa de funcionar.
  await page.goto(`/cancelar/${r.cancel_token}`);
  await expect(
    page.getByRole("heading", { name: "Este link já não é válido" }),
  ).toBeVisible();
});

test("link de cancelamento inventado não revela nada", async ({ page }) => {
  await page.goto(`/cancelar/${"a".repeat(64)}`);
  await expect(
    page.getByRole("heading", { name: "Este link já não é válido" }),
  ).toBeVisible();
});

test("ficheiro .ics da confirmação", async ({ request }) => {
  const r = await marcarPorRpc();
  const res = await request.get(
    `/marcar/confirmada/calendario?id=${r.appointment_id}`,
  );
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("text/calendar");
  const corpo = await res.text();
  expect(corpo).toContain("BEGIN:VEVENT");
  expect(corpo).toMatch(/DTSTART:\d{8}T\d{6}Z/);
  expect(
    (await request.get("/marcar/confirmada/calendario?id=nada")).status(),
  ).toBe(404);
});

test("lembretes: só com segredo, só uma vez", async ({ request }) => {
  const sem = await request.post("/api/lembretes");
  expect(sem.status()).toBe(401);
  const errado = await request.post("/api/lembretes", {
    headers: { authorization: "Bearer x" },
  });
  expect(errado.status()).toBe(401);

  // Marcação para daqui a ~40 h, "criada" há 4 dias.
  const db = admin();
  const r = await marcarPorRpc({
    email: "ana@example.com",
    antecedenciaMinHoras: 2,
  });
  await db
    .from("appointments")
    .update({
      starts_at: new Date(Date.now() + 40 * 3600_000).toISOString(),
      ends_at: new Date(Date.now() + 41 * 3600_000).toISOString(),
      created_at: new Date(Date.now() - 96 * 3600_000).toISOString(),
    })
    .eq("id", r.appointment_id);

  const cabecalho = { authorization: "Bearer e2e-cron" };
  const primeira = await request.post("/api/lembretes", { headers: cabecalho });
  expect(await primeira.json()).toEqual({ enviados: 1, falhados: 0 });
  const { data } = await db
    .from("appointments")
    .select("reminder_sent_at")
    .eq("id", r.appointment_id)
    .single();
  expect(data!.reminder_sent_at).not.toBeNull();

  const segunda = await request.post("/api/lembretes", { headers: cabecalho });
  expect(await segunda.json()).toEqual({ enviados: 0, falhados: 0 });
});
