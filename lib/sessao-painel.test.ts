import { describe, expect, it } from "vitest";

import {
  INATIVIDADE_MS,
  MAXIMO_MS,
  criarCookiePainel,
  lerCookiePainel,
} from "./sessao-painel";

process.env.PAINEL_SESSAO_SECRET = "teste";

describe("sessão do painel", () => {
  const t0 = 1_800_000_000_000;
  it("aceita um cookie recente", () => {
    const c = criarCookiePainel("u1", t0);
    expect(lerCookiePainel(c, t0 + 1000)?.utilizador).toBe("u1");
  });
  it("recusa assinatura adulterada", () => {
    const c = criarCookiePainel("u1", t0).replace("u1", "u2");
    expect(lerCookiePainel(c, t0)).toBeNull();
  });
  it("expira por inatividade", () => {
    const c = criarCookiePainel("u1", t0);
    expect(lerCookiePainel(c, t0 + INATIVIDADE_MS + 1)).toBeNull();
  });
  it("expira ao fim do máximo, mesmo com atividade recente", () => {
    const c = criarCookiePainel("u1", t0, t0 + MAXIMO_MS - 1000);
    expect(lerCookiePainel(c, t0 + MAXIMO_MS + 1)).toBeNull();
  });
  it("recusa lixo e vazio", () => {
    expect(lerCookiePainel(undefined)).toBeNull();
    expect(lerCookiePainel("a.b.c")).toBeNull();
  });
});
