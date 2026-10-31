import { createClient } from "@supabase/supabase-js";
import { type Page, expect, test } from "@playwright/test";

const admin = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

const aleatorio = (n: number) =>
  Array.from({ length: n }, () => Math.floor(Math.random() * 10)).join("");
test.use({
  extraHTTPHeaders: {
    "x-real-ip": `10.${aleatorio(2)}.${aleatorio(2)}.${aleatorio(2)}`.replace(
      /\b0+(\d)/g,
      "$1",
    ),
  },
});

test.beforeEach(async () => {
  const db = admin();
  const { data } = await db.auth.admin.listUsers();
  for (const u of data.users) await db.auth.admin.deleteUser(u.id);
});

// Cria a utilizadora e devolve um link de entrada como o do email.
async function linkDeEntrada(email: string, next = "/conta") {
  const db = admin();
  await db.auth.admin.createUser({ email, email_confirm: true });
  const { data } = await db.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  const token = data.properties!.hashed_token;
  return {
    id: data.user!.id,
    url: `/auth/confirmar?token_hash=${token}&type=magiclink&next=${encodeURIComponent(next)}`,
  };
}

async function entrar(page: Page, email: string, next = "/conta") {
  const l = await linkDeEntrada(email, next);
  await page.goto(l.url);
  return l;
}

test("sem sessão, /conta manda para entrar e volta depois", async ({
  page,
}) => {
  await page.goto("/conta");
  await expect(page).toHaveURL(/\/entrar\?next=%2Fconta/);
  // Diz que também é aqui que se cria a conta.
  await expect(
    page.getByRole("heading", { name: "Entrar ou criar conta" }),
  ).toBeVisible();
  await expect(
    page.getByText("Se for a primeira vez, a conta é criada nesse momento."),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Entrar" })).toBeVisible();
});

test("a página inicial tem 'Entrar' (na app instalada não há barra de endereço)", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/entrar\?next=%2Fconta/);
  // Na própria página de entrar não aparece outra vez.
  await expect(
    page.getByRole("link", { name: "Entrar", exact: true }),
  ).toHaveCount(0);

  // Vindo do painel diz só "Entrar": o painel não cria contas.
  await page.goto("/entrar?next=%2Fadmin");
  await expect(
    page.getByRole("heading", { name: "Entrar", exact: true }),
  ).toBeVisible();
});

test("pedir o link mostra sempre a mesma resposta, haja conta ou não", async ({
  page,
}) => {
  await page.goto("/entrar");
  await page.getByLabel("Email").fill(`ninguem${aleatorio(6)}@example.com`);
  const enviar = page.getByRole("button", { name: "Enviar link" });
  await expect(enviar).toBeEnabled({ timeout: 30_000 });
  await enviar.click();
  await expect(
    page.getByText("Se o email estiver certo, enviámos-lhe um link"),
  ).toBeVisible();
});

test("pedido de entrada no painel: quem não é admin não recebe link nem fica com conta", async ({
  page,
}) => {
  const email = `cliente${aleatorio(6)}@example.com`;
  await page.goto("/entrar?next=%2Fadmin");
  await page.getByLabel("Email").fill(email);
  const enviar = page.getByRole("button", { name: "Enviar link" });
  await expect(enviar).toBeEnabled({ timeout: 30_000 });
  await enviar.click();
  // A resposta é a mesma (não revela quem é admin)...
  await expect(
    page.getByText("Se o email estiver certo, enviámos-lhe um link"),
  ).toBeVisible();
  // ...mas não foi gerado link, por isso o utilizador nem existe.
  const { data } = await admin().auth.admin.listUsers();
  expect(data.users.some((u) => u.email === email)).toBe(false);
});

test("entrar com o código do email (app instalada, onde o link abre noutro browser)", async ({
  page,
}) => {
  const email = `codigo${aleatorio(6)}@example.com`;
  const db = admin();
  await db.auth.admin.createUser({ email, email_confirm: true });
  await page.goto("/entrar");
  await page.getByLabel("Email").fill(email);
  const enviar = page.getByRole("button", { name: "Enviar link" });
  await expect(enviar).toBeEnabled({ timeout: 30_000 });
  await enviar.click();
  await expect(page.getByLabel("Código do email")).toBeVisible();

  await page.getByLabel("Código do email").fill("000000");
  await page.getByRole("button", { name: "Entrar com o código" }).click();
  await expect(page.getByText("Código errado ou expirado")).toBeVisible();

  // O código do email (os emails não saem nos testes): o último gerado é o válido.
  const { data } = await db.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  await page.getByLabel("Código do email").fill(data.properties!.email_otp);
  await page.getByRole("button", { name: "Entrar com o código" }).click();
  await expect(page).toHaveURL(/\/conta$/);
});

test("email inválido mostra erro no campo", async ({ page }) => {
  await page.goto("/entrar");
  await page.getByLabel("Email").fill("isto-nao-e-email");
  const enviar = page.getByRole("button", { name: "Enviar link" });
  await expect(enviar).toBeEnabled({ timeout: 30_000 });
  await enviar.click();
  await expect(page.getByText("Email inválido")).toBeVisible();
});

test("o link do email inicia sessão e sair termina-a", async ({ page }) => {
  await entrar(page, "ana@example.com");
  await expect(page).toHaveURL(/\/conta$/);
  await expect(page.getByText("ana@example.com")).toBeVisible();

  await page.getByRole("button", { name: "Sair" }).click();
  await expect(page).toHaveURL("/");
  await page.goto("/conta");
  await expect(page).toHaveURL(/\/entrar/);
});

test("o link só serve uma vez", async ({ page, context }) => {
  const l = await linkDeEntrada("ana@example.com");
  await page.goto(l.url);
  await expect(page).toHaveURL(/\/conta$/);
  await context.clearCookies();
  await page.goto(l.url);
  await expect(page).toHaveURL(/\/entrar\?erro=link/);
  await expect(page.getByText("Este link já não é válido")).toBeVisible();
});

test("link inventado não inicia sessão", async ({ page }) => {
  await page.goto("/auth/confirmar?token_hash=inventado&type=magiclink");
  await expect(page).toHaveURL(/\/entrar\?erro=link/);
});

test("o destino depois do login nunca sai do site", async ({ page }) => {
  const l = await linkDeEntrada("ana@example.com", "//mau.example");
  await page.goto(l.url);
  await expect(page).toHaveURL(/\/conta$/);
});

test("/admin: 404 para quem não é admin", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/entrar\?next=%2Fadmin/);

  await entrar(page, "ana@example.com", "/admin");
  const r = await page.goto("/admin");
  expect(r?.status()).toBe(404);
});
