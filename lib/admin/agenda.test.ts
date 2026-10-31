import { describe, expect, it } from "vitest";

import { horasDoHorario, linhasDoDia, type Marcacao } from "./agenda";
import { lisboaParaIso, segundaDe } from "./tempo";

const horario = [
  { weekday: 1, start_time: "09:00:00", end_time: "12:00:00" },
  { weekday: 1, start_time: "14:30:00", end_time: "18:30:00" },
  { weekday: 6, start_time: "09:00:00", end_time: "13:00:00" },
];

const marc = (
  dia: string,
  hora: string,
  status: Marcacao["status"] = "confirmed",
): Marcacao => ({
  id: `${dia}${hora}`,
  starts_at: lisboaParaIso(dia, hora),
  status,
  origin: "admin",
  note: null,
  price_cents: 2500,
  client: { id: "c", name: "Ana", phone: null },
  service: { name: "Gel" },
});

describe("agenda", () => {
  it("fatias de 60 min a contar do início do período", () => {
    expect(horasDoHorario("2026-11-02", horario)).toEqual([
      "09:00",
      "10:00",
      "11:00",
      "14:30",
      "15:30",
      "16:30",
      "17:30",
    ]);
    expect(horasDoHorario("2026-11-07", horario)).toEqual([
      "09:00",
      "10:00",
      "11:00",
      "12:00",
    ]);
    expect(horasDoHorario("2026-11-08", horario)).toEqual([]);
  });

  it("marcação ocupa a hora; canceladas não contam; fora do horário aparece", () => {
    const l = linhasDoDia(
      "2026-11-02",
      horario,
      [
        marc("2026-11-02", "10:00"),
        marc("2026-11-02", "09:00", "cancelled"),
        marc("2026-11-02", "13:00"),
      ],
      [],
    );
    expect(l.map((x) => `${x.hora}:${x.tipo}`)).toContain("10:00:marcacao");
    expect(l.map((x) => `${x.hora}:${x.tipo}`)).toContain("09:00:livre");
    expect(l.map((x) => `${x.hora}:${x.tipo}`)).toContain("13:00:marcacao");
  });

  it("marcação às 10:30 tira as horas 10:00 e 11:00 da lista de livres", () => {
    const l = linhasDoDia(
      "2026-11-02",
      horario,
      [marc("2026-11-02", "10:30")],
      [],
    );
    expect(l.find((x) => x.hora === "10:00")).toBeUndefined();
    expect(l.find((x) => x.hora === "11:00")).toBeUndefined();
  });

  it("bloqueio marca a hora", () => {
    const folga = {
      id: "f",
      starts_at: lisboaParaIso("2026-11-02", "09:00"),
      ends_at: lisboaParaIso("2026-11-02", "11:00"),
      reason: "Dentista",
    };
    const l = linhasDoDia("2026-11-02", horario, [], [folga]);
    expect(l.filter((x) => x.tipo === "folga").map((x) => x.hora)).toEqual([
      "09:00",
      "10:00",
    ]);
  });

  it("hora de Lisboa vira UTC com horário de verão e de inverno", () => {
    expect(lisboaParaIso("2026-07-01", "10:00")).toBe(
      "2026-07-01T09:00:00.000Z",
    );
    expect(lisboaParaIso("2026-11-02", "10:00")).toBe(
      "2026-11-02T10:00:00.000Z",
    );
  });

  it("segunda da semana", () => {
    expect(segundaDe("2026-11-08")).toBe("2026-11-02");
    expect(segundaDe("2026-11-02")).toBe("2026-11-02");
  });
});
