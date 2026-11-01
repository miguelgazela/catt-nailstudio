import { describe, expect, it } from "vitest";

import { limparEvento } from "./analise";

const v = (url: string) => limparEvento({ type: "pageview", url })?.url ?? null;

describe("limpar visitas para as analytics", () => {
  it("tira parâmetros", () => {
    expect(v("https://x.pt/marcar?servico=abc&modo=conta")).toBe(
      "https://x.pt/marcar",
    );
  });

  it("esconde o token de cancelar", () => {
    expect(v("https://x.pt/cancelar/segredo123")).toBe(
      "https://x.pt/cancelar/[token]",
    );
    expect(v("https://x.pt/cancelar/ok")).toBe("https://x.pt/cancelar/ok");
  });

  it("não conta o painel nem o login", () => {
    expect(v("https://x.pt/admin")).toBeNull();
    expect(v("https://x.pt/admin/clientes/1")).toBeNull();
    expect(v("https://x.pt/auth/confirmar?token_hash=x")).toBeNull();
    expect(v("https://x.pt/abrir")).toBeNull();
    expect(v("https://x.pt/administracao")).toBe("https://x.pt/administracao");
  });
});
