import { describe, expect, it } from "vitest";

import { gerarIcs, linkGoogleCalendar } from "../calendario";
import {
  emailAvisoEstudio,
  emailCancelamento,
  emailConfirmacao,
  emailLembrete,
} from "./modelos";

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
      "Para cancelar, contacte o estúdio ou ligue para 912 345 678",
    );
  });

  it("escapa HTML vindo de dados", () => {
    const e = emailConfirmacao({ ...d, servico: "<script>alert(1)</script>" });
    expect(e.html).not.toContain("<script>alert");
    expect(e.html).toContain("&lt;script&gt;");
  });

  it("lembrete e cancelamento", () => {
    expect(emailLembrete(d).assunto).toBe(
      "Lembrete: sexta, 13 de novembro, 10:00",
    );
    const c = emailCancelamento(d);
    expect(c.assunto).toBe("Marcação cancelada");
    expect(c.html).toContain("https://exemplo.pt/marcar");
  });

  it("aviso à Catarina leva nome e telemóvel", () => {
    const a = emailAvisoEstudio(d, "nova", {
      nome: "Ana",
      telefone: "+351912345678",
    });
    expect(a.assunto).toBe("Nova marcação: sexta, 13 de novembro, 10:00");
    expect(a.texto).toContain("Cliente: Ana");
    expect(a.texto).toContain("Telemóvel: +351912345678");
  });
});
