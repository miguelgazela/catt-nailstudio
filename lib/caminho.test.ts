import { describe, expect, it } from "vitest";

import { caminhoSeguro } from "./caminho";

describe("caminhoSeguro", () => {
  it("aceita caminhos internos", () => {
    expect(caminhoSeguro("/conta")).toBe("/conta");
    expect(caminhoSeguro("/admin/agenda?dia=2026-11-02")).toBe(
      "/admin/agenda?dia=2026-11-02",
    );
  });
  it("recusa sítios de fora e truques", () => {
    for (const mau of [
      "https://mau.pt",
      "//mau.pt",
      "/\\mau.pt",
      "mau.pt",
      "/a\r\nSet-Cookie: x",
      "",
      null,
      undefined,
    ]) {
      expect(caminhoSeguro(mau as string | null | undefined)).toBe("/conta");
    }
  });
  it("usa o valor por omissão pedido", () => {
    expect(caminhoSeguro("//x", "/admin")).toBe("/admin");
  });
});
