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
const telefone = () => `91${aleatorio(7)}`;
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
  await db.from("appointments").delete().not("id", "is", null);
  await db.from("clients").delete().not("id", "is", null);
  const { data } = await db.auth.admin.listUsers();
  for (const u of data.users) await db.auth.admin.deleteUser(u.id);
});

async function entrar(page: Page, email: string, next = "/conta") {
  const db = admin();
  await db.auth.admin.createUser({ email, email_confirm: true });
  const { data } = await db.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  await page.goto(
    `/auth/confirmar?token_hash=${data.properties!.hashed_token}&type=magiclink&next=${encodeURIComponent(next)}`,
  );
}

async function servicoId() {
  const { data } = await admin()
    .from("services")
    .select("id")
    .eq("active", true)
    .order("sort_order")
    .limit(1)
    .single();
  return data!.id;
}

/** Cria marcação direta na BD (como convidada, via função) numa hora futura livre. */
async function marcarNaBD(
  tel: string,
  email: string | undefined,
  diasDepois: number,
) {
  const db = admin();
  const hoje = new Date();
  const de = hoje.toISOString().slice(0, 10);
  const ate = new Date(hoje.getTime() + 40 * 86400_000)
    .toISOString()
    .slice(0, 10);
  const { data: vagas } = await db.rpc("available_slots", {
    p_from: de,
    p_to: ate,
  });
  const alvo = new Date(hoje.getTime() + diasDepois * 86400_000).getTime();
  const vaga = (vagas as { starts_at: string }[]).find(
    (v) => new Date(v.starts_at).getTime() > alvo,
  )!;
  const { data } = await db.rpc("book_appointment", {
    p_service: await servicoId(),
    p_starts_at: vaga.starts_at,
    p_name: "Ana Antiga",
    p_phone: `+351${tel}`,
    p_email: email,
  });
  expect((data as { ok: boolean }).ok).toBe(true);
}

test("completar a conta liga as marcações antigas do mesmo telemóvel e email", async ({
  page,
}) => {
  const tel = telefone();
  await marcarNaBD(tel, "ana@example.com", 5);
  await entrar(page, "ana@example.com");
  await expect(
    page.getByRole("heading", { name: "Complete a sua conta" }),
  ).toBeVisible();
  await page.getByLabel("Nome").fill("Ana");
  await page.getByLabel("Telemóvel").fill(tel);
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText("Encontrámos 1 marcação antiga")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Próximas" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Cancelar" }).first(),
  ).toBeVisible();
});

test("não herda marcações de um telemóvel com outro email, sem revelar porquê", async ({
  page,
}) => {
  const tel = telefone();
  await marcarNaBD(tel, "dona@example.com", 5);
  await entrar(page, "intrusa@example.com");
  await page.getByLabel("Nome").fill("Intrusa");
  await page.getByLabel("Telemóvel").fill(tel);
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(
    page.getByText("Não conseguimos associar este número"),
  ).toBeVisible();
  await expect(page.getByText("Encontrámos")).toHaveCount(0);
});

test("marcar com conta e cancelar em /conta", async ({ page }) => {
  const tel = telefone();
  const id = await servicoId();
  await entrar(page, "bia@example.com", "/marcar");
  // dia e hora pelo fluxo normal
  await page.goto(`/marcar?servico=${id}`);
  const horas = page
    .getByRole("group", { name: "Horas livres" })
    .getByRole("button");
  await expect(horas.first()).toBeVisible();
  await horas.first().click();
  await page.getByRole("link", { name: "Continuar" }).click();
  // com sessão, o separador "Com conta" é o padrão
  await expect(page.getByRole("link", { name: "Com conta" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await page.getByLabel("Nome").fill("Bia");
  await page.getByLabel("Telemóvel").fill(tel);
  await page.getByRole("button", { name: "Confirmar marcação" }).click();
  await expect(
    page.getByRole("heading", { name: "Marcação confirmada" }),
  ).toBeVisible();

  await page.goto("/conta");
  await expect(page.getByRole("heading", { name: "Próximas" })).toBeVisible();
  await page.getByRole("button", { name: "Cancelar" }).click();
  await expect(page.getByText("Marcação cancelada")).toBeVisible();
  await expect(page.getByText("Não tem marcações futuras.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Anteriores" })).toBeVisible();
});

test("sem sessão, 'Com conta' leva a entrar e volta ao mesmo passo", async ({
  page,
}) => {
  const id = await servicoId();
  await page.goto(`/marcar?servico=${id}`);
  const horas = page
    .getByRole("group", { name: "Horas livres" })
    .getByRole("button");
  await horas.first().click();
  await page.getByRole("link", { name: "Continuar" }).click();
  await page.getByRole("link", { name: "Com conta" }).click();
  await page.getByRole("link", { name: "Entrar com email" }).click();
  await expect(page).toHaveURL(/\/entrar\?next=%2Fmarcar%3Fservico/);
});

test("não cancela a menos de 24 h (a BD recusa)", async ({ page }) => {
  const tel = telefone();
  await entrar(page, "cris@example.com");
  await page.getByLabel("Nome").fill("Cris");
  await page.getByLabel("Telemóvel").fill(`+351${tel}`);
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByRole("heading", { name: "Próximas" })).toBeVisible();

  const db = admin();
  const { data: c } = await db
    .from("clients")
    .select("id")
    .eq("phone", `+351${tel}`)
    .single();
  const inicio = new Date(Date.now() + 5 * 3600_000);
  const { data: a } = await db
    .from("appointments")
    .insert({
      client_id: c!.id,
      service_id: await servicoId(),
      starts_at: inicio.toISOString(),
      ends_at: new Date(inicio.getTime() + 3600_000).toISOString(),
      price_cents: 1500,
    })
    .select("id")
    .single();
  await page.goto("/conta");
  // dentro das 24 h a página nem oferece o botão
  await expect(page.getByRole("button", { name: "Cancelar" })).toHaveCount(0);
  const { data: r } = await db.rpc("cancel_appointment", {
    p_appointment: a!.id,
    p_user_id: (await db.auth.admin.listUsers()).data.users[0].id,
  });
  expect((r as { error: string }).error).toBe("too_late");
});

test("editar os dados e exportar", async ({ page }) => {
  const tel = telefone();
  await entrar(page, "dani@example.com");
  await page.getByLabel("Nome").fill("Dani");
  await page.getByLabel("Telemóvel").fill(tel);
  await page.getByRole("button", { name: "Guardar" }).click();
  await page.getByRole("link", { name: "Os meus dados" }).click();
  await page.getByLabel("Nome").fill("Daniela");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText("Dados guardados.")).toBeVisible();
  await expect(page.getByLabel("Nome")).toHaveValue("Daniela");

  const r = await page.request.get("/conta/dados/exportar");
  expect(r.status()).toBe(200);
  expect(r.headers()["content-disposition"]).toContain("attachment");
  const j = await r.json();
  expect(j.ficha.name).toBe("Daniela");
  expect(j.conta.email).toBe("dani@example.com");
});

test("a exportação exige sessão", async ({ request }) => {
  const r = await request.get("/conta/dados/exportar");
  expect(r.status()).toBe(401);
});

test("apagar a conta anonimiza, cancela o futuro e remove o utilizador", async ({
  page,
}) => {
  const tel = telefone();
  await marcarNaBD(tel, "eva@example.com", 5);
  await entrar(page, "eva@example.com");
  await page.getByLabel("Nome").fill("Eva");
  await page.getByLabel("Telemóvel").fill(tel);
  await page.getByRole("button", { name: "Guardar" }).click();
  await page.goto("/conta/dados");
  await page.getByRole("link", { name: "Apagar a minha conta" }).click();
  await page.getByRole("button", { name: "Sim, apagar a minha conta" }).click();
  await expect(page).toHaveURL(/\/conta\/apagada$/);

  const db = admin();
  const { data: c } = await db
    .from("clients")
    .select("name, phone, email")
    .eq("name", "Cliente apagada");
  expect(c).toHaveLength(1);
  expect(c![0].phone).toBeNull();
  const { count } = await db
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .eq("status", "confirmed");
  expect(count).toBe(0);
  expect((await db.auth.admin.listUsers()).data.users).toHaveLength(0);
  await page.goto("/conta");
  await expect(page).toHaveURL(/\/entrar/);
});

test("/cancelar/[token]: convidada cancela pelo link", async ({ page }) => {
  const tel = telefone();
  await marcarNaBD(tel, "fia@example.com", 5);
  // o token só existe no momento da marcação: marcamos outra para o obter
  const db = admin();
  const { data: vagas } = await db.rpc("available_slots", {
    p_from: new Date().toISOString().slice(0, 10),
    p_to: new Date(Date.now() + 40 * 86400_000).toISOString().slice(0, 10),
  });
  const { data } = await db.rpc("book_appointment", {
    p_service: await servicoId(),
    p_starts_at: (vagas as { starts_at: string }[]).at(-1)!.starts_at,
    p_name: "Fia",
    p_phone: `+3519${aleatorio(8)}`,
    p_email: "fia2@example.com",
  });
  const t = (data as { cancel_token: string }).cancel_token;
  await page.goto(`/cancelar/${t}`);
  await page.getByRole("button", { name: "Cancelar marcação" }).click();
  await expect(page).toHaveURL(/\/cancelar\/ok/);
  await page.goto(`/cancelar/${t}`);
  await expect(page.getByText("Este link já não é válido")).toBeVisible();
});
