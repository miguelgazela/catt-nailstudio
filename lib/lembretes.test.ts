import { describe, expect, it } from "vitest";

import { elegiveisParaLembrete } from "./lembretes";

const agora = new Date("2026-11-12T10:00:00Z");
const h = (n: number) => new Date(agora.getTime() + n * 3600_000).toISOString();

describe("elegiveisParaLembrete", () => {
  it("lembra marcações dentro de 48 h feitas com antecedência", () => {
    const l = [{ id: "a", starts_at: h(47), created_at: h(-72) }];
    expect(elegiveisParaLembrete(l, agora)).toHaveLength(1);
  });
  it("ignora marcações a mais de 48 h ou a menos de 1 h", () => {
    const l = [
      { id: "longe", starts_at: h(49), created_at: h(-100) },
      { id: "perto", starts_at: h(0.5), created_at: h(-72) },
    ];
    expect(elegiveisParaLembrete(l, agora)).toHaveLength(0);
  });
  it("ignora quem marcou há pouco para amanhã (já recebeu a confirmação)", () => {
    const l = [{ id: "a", starts_at: h(40), created_at: h(-2) }];
    expect(elegiveisParaLembrete(l, agora)).toHaveLength(0);
  });
});
