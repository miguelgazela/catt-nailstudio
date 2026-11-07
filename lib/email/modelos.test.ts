import { describe, expect, it } from "vitest";

import { gerarIcs, linkGoogleCalendar } from "../calendario";
import { emailConfirmacao, emailEntrada, emailLembrete } from "./modelos";

// 13 nov 2026, 10:00 em Lisboa (inverno, UTC+0)
const d = {
  id: "11111111-1111-1111-1111-111111111111",
  servico: "Manicure gel",
  inicio: new Date("2026-11-13T10:00:00Z"),
  precoCents: 2500,
  morada: "Rua das Flores 1\n1000-001 Lisboa",
  telefone: "912 345 678",
  siteUrl: "https://exemplo.pt",
  tokenCancelar: "abc123",
};

describe("calendário", () => {
  it("gera .ics em UTC com 1 hora, fim de linha CRLF e escapes", () => {
    const ics = gerarIcs({
      id: d.id,
      inicio: d.inicio,
      titulo: "Gel, com cor; ok",
      local: "Rua A\nLisboa",
      agora: new Date("2026-10-31T08:00:00Z"),
    });
    expect(ics).toContain("DTSTART:20261113T100000Z\r\n");
    expect(ics).toContain("DTEND:20261113T110000Z\r\n");
    expect(ics).toContain("SUMMARY:Gel\\, com cor\; ok");
    expect(ics).toContain("LOCATION:Rua A\\nLisboa");
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
  });

  it("no verão a hora de Lisboa é UTC+1: 10:00 locais = 09:00Z", () => {
    const ics = gerarIcs({
      id: d.id,
      inicio: new Date("2027-07-02T09:00:00Z"),
      titulo: "x",
    });
    expect(ics).toContain("DTSTART:20270702T090000Z");
  });

  it("dobra linhas longas a 75 bytes", () => {
    const ics = gerarIcs({
      id: d.id,
      inicio: d.inicio,
      titulo: "x".repeat(200),
    });
    for (const linha of ics.split("\r\n")) {
      expect(new TextEncoder().encode(linha).length).toBeLessThanOrEqual(75);
    }
  });

  it("link do Google Calendar", () => {
    const u = new URL(
      linkGoogleCalendar({ id: d.id, inicio: d.inicio, titulo: "Gel" }),
    );
    expect(u.hostname).toBe("calendar.google.com");
    expect(u.searchParams.get("dates")).toBe(
      "20261113T100000Z/20261113T110000Z",
    );
  });
});

describe("emails", () => {
  it("confirmação: dados, link de cancelar e anexo .ics", () => {
    const e = emailConfirmacao(d);
    expect(e.assunto).toBe("Marcação confirmada: sexta, 13 de novembro, 10:00");
    expect(e.html).toContain("Manicure gel");
    expect(e.html).toContain("10:00 às 11:00");
    expect(e.html).toContain("25 €, paga no estúdio");
    expect(e.html).toContain("https://exemplo.pt/cancelar/abc123");
    expect(e.texto).toContain("https://exemplo.pt/cancelar/abc123");
    expect(e.anexos?.[0].nome).toBe("marcacao.ics");
  });

  it("confirmação sem token: sem link de cancelar, manda contactar o estúdio", () => {
    const e = emailConfirmacao({ ...d, tokenCancelar: null });
    expect(e.html).not.toContain("/cancelar/");
    expect(e.texto).toContain(
      "Para cancelar, contacta o estúdio ou liga para 912 345 678",
    );
  });

  it("confirmação com conta: aponta para /conta em vez de mandar contactar", () => {
    const e = emailConfirmacao({ ...d, tokenCancelar: null, comConta: true });
    expect(e.html).not.toContain("/cancelar/");
    expect(e.html).toContain("https://exemplo.pt/conta");
    expect(e.html).toContain("Ver ou cancelar na minha conta");
    expect(e.texto).toContain("A minha conta: https://exemplo.pt/conta");
    expect(e.texto).toContain("Podes cancelar até 24 h antes, na tua conta.");
  });

  it("lembrete com conta indica a conta", () => {
    const e = emailLembrete({ ...d, tokenCancelar: null, comConta: true });
    expect(e.texto).toContain("na tua conta (https://exemplo.pt/conta)");
    expect(emailLembrete(d).texto).toContain(
      "pelo link do email de confirmação",
    );
  });

  it("entrada: link e código (para a app instalada)", () => {
    const e = emailEntrada({
      link: "https://exemplo.pt/auth/confirmar?x",
      siteUrl: "https://exemplo.pt",
      codigo: "482913",
    });
    expect(e.html).toContain("482913");
    expect(e.html).toContain("Código: 482913");
    expect(e.texto).toContain("Ou escreve este código na app: 482913");
  });

  it("escapa HTML vindo de dados", () => {
    const e = emailConfirmacao({ ...d, servico: "<script>alert(1)</script>" });
    expect(e.html).not.toContain("<script>alert");
    expect(e.html).toContain("&lt;script&gt;");
  });

  it("lembrete", () => {
    expect(emailLembrete(d).assunto).toBe(
      "Lembrete: sexta, 13 de novembro, 10:00",
    );
  });
});
