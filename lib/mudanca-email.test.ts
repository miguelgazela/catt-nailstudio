import { beforeAll, describe, expect, it } from "vitest";

import { VALIDADE_MS, criarTokenEmail, lerTokenEmail } from "./mudanca-email";

beforeAll(() => {
  process.env.PAINEL_SESSAO_SECRET = "segredo-de-teste";
});

describe("token para mudar de email", () => {
  const t0 = 1_800_000_000_000;

  it("lê o que foi assinado", () => {
    const t = criarTokenEmail("u1", "nova.morada@example.com", t0);
    expect(lerTokenEmail(t, t0 + 1000)).toEqual({
      utilizador: "u1",
      email: "nova.morada@example.com",
    });
  });

  it("expira ao fim de uma hora", () => {
    const t = criarTokenEmail("u1", "a@example.com", t0);
    expect(lerTokenEmail(t, t0 + VALIDADE_MS + 1)).toBeNull();
  });

  it("recusa tokens alterados ou inventados", () => {
    const t = criarTokenEmail("u1", "a@example.com", t0);
    const [corpo, sig] = t.split(".");
    const outro = Buffer.from(
      JSON.stringify({ u: "u2", e: "a@example.com", x: t0 + VALIDADE_MS }),
    ).toString("base64url");
    expect(lerTokenEmail(`${outro}.${sig}`, t0)).toBeNull();
    expect(lerTokenEmail(`${corpo}.${"0".repeat(64)}`, t0)).toBeNull();
    expect(lerTokenEmail("lixo", t0)).toBeNull();
    expect(lerTokenEmail(null, t0)).toBeNull();
  });
});
