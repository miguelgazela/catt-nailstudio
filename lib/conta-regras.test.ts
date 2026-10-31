import { describe, expect, it } from "vitest";

import { type MarcacaoConta, podeCancelar, separar } from "./conta-regras";

const agora = new Date("2026-11-12T10:00:00Z");
const h = (n: number) => new Date(agora.getTime() + n * 3600_000).toISOString();
const m = (
  id: string,
  quando: number,
  estado: MarcacaoConta["estado"] = "confirmed",
): MarcacaoConta => ({
  id,
  inicio: h(quando),
  servico: "Gel",
  precoCents: 1500,
  estado,
});

describe("podeCancelar", () => {
  it("até 24 h antes sim, depois não", () => {
    expect(podeCancelar(m("a", 25), agora, 24)).toBe(true);
    expect(podeCancelar(m("a", 24), agora, 24)).toBe(true);
    expect(podeCancelar(m("a", 23), agora, 24)).toBe(false);
  });
  it("só marcações confirmadas", () => {
    expect(podeCancelar(m("a", 100, "cancelled"), agora, 24)).toBe(false);
    expect(podeCancelar(m("a", 100, "done"), agora, 24)).toBe(false);
  });
});

describe("separar", () => {
  it("ordena próximas por data e anteriores da mais recente", () => {
    const r = separar(
      [
        m("longe", 200),
        m("perto", 30),
        m("velha", -500, "done"),
        m("recente", -50, "no_show"),
        m("cancelada", 60, "cancelled"),
        m("passada-confirmada", -2),
      ],
      agora,
    );
    expect(r.proximas.map((x) => x.id)).toEqual(["perto", "longe"]);
    expect(r.anteriores.map((x) => x.id)).toEqual([
      "cancelada",
      "passada-confirmada",
      "recente",
      "velha",
    ]);
  });
});
