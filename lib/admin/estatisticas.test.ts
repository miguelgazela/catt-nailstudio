import { describe, expect, it } from "vitest";

import { type LinhaMarcacao, calcular, percentagem } from "./estatisticas";

const agora = new Date("2026-11-01T12:00:00Z");
const desde = new Date("2026-10-02T12:00:00Z");

const m = (o: Partial<LinhaMarcacao>): LinhaMarcacao => ({
  client_id: "a",
  status: "done",
  origin: "online",
  price_cents: 2000,
  starts_at: "2026-10-20T10:00:00Z",
  created_at: "2026-10-10T10:00:00Z",
  cancelled_at: null,
  cancelled_by: null,
  service: { name: "Gel" },
  ...o,
});

describe("estatísticas", () => {
  const linhas = [
    m({}),
    m({ client_id: "b", origin: "admin", service: { name: "Manicure" } }),
    // antiga: a cliente "a" já tinha vindo antes do período
    m({
      starts_at: "2026-09-01T10:00:00Z",
      created_at: "2026-08-20T10:00:00Z",
    }),
    // futura, feita no período
    m({ status: "confirmed", starts_at: "2026-11-10T10:00:00Z" }),
    m({
      client_id: "c",
      status: "cancelled",
      cancelled_by: "client",
      cancelled_at: "2026-10-15T10:00:00Z",
    }),
    m({ client_id: "d", status: "no_show", origin: "admin" }),
  ];
  const e = calcular(linhas, desde, agora);

  it("conta marcações feitas e de onde vieram", () => {
    expect(e.feitas).toBe(5);
    expect(e.online).toBe(3);
    expect(e.painel).toBe(2);
  });

  it("atendidas e faturado só contam o que já passou", () => {
    expect(e.atendidas).toBe(2);
    expect(e.faturado).toBe(4000);
    expect(e.naAgenda).toBe(1);
  });

  it("clientes que voltaram", () => {
    expect(e.clientesAtendidas).toBe(2);
    expect(e.regressaram).toBe(1);
  });

  it("cancelamentos, faltas e serviços", () => {
    expect(e.canceladasCliente).toBe(1);
    expect(e.canceladasPainel).toBe(0);
    expect(e.faltas).toBe(1);
    expect(e.servicos).toEqual([
      { nome: "Gel", n: 3 },
      { nome: "Manicure", n: 1 },
    ]);
  });

  it("percentagem sem dividir por zero", () => {
    expect(percentagem(1, 3)).toBe("33%");
    expect(percentagem(0, 0)).toBe("0%");
  });
});
