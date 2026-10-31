"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { DIA_RE, HORA_RE, lisboaParaIso } from "@/lib/admin/tempo";
import { exigirAdmin } from "@/lib/auth";
import { somarDias } from "@/lib/datas";
import { supabaseSessao } from "@/lib/supabase/sessao";

const minutos = (h: string) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5));
const volta = (q: string) => redirect(`/admin/horario?${q}`);

export async function adicionarPeriodo(dados: FormData) {
  await exigirAdmin("/admin/horario");
  const p = z
    .object({
      weekday: z.coerce.number().int().min(1).max(7),
      inicio: z.string().regex(HORA_RE),
      fim: z.string().regex(HORA_RE),
    })
    .safeParse(Object.fromEntries(dados.entries()));
  if (!p.success) volta("erro=periodo");
  const { weekday, inicio, fim } = p.data!;
  if (minutos(fim) < minutos(inicio) + 60) volta("erro=curto");
  const sb = await supabaseSessao();
  const { data: dia } = await sb.from("weekly_hours").select("start_time, end_time").eq("weekday", weekday);
  const choca = (dia ?? []).some(
    (x) => minutos(x.start_time) < minutos(fim) && minutos(x.end_time) > minutos(inicio),
  );
  if (choca) volta("erro=sobrepoe");
  const { error } = await sb.from("weekly_hours").insert({ weekday, start_time: inicio, end_time: fim });
  if (error) volta("erro=periodo");
  revalidatePath("/admin", "layout");
  volta("feito=periodo");
}

export async function removerPeriodo(dados: FormData) {
  await exigirAdmin("/admin/horario");
  const id = z.string().uuid().safeParse(dados.get("id"));
  if (!id.success) volta("erro=periodo");
  const sb = await supabaseSessao();
  await sb.from("weekly_hours").delete().eq("id", id.data!);
  revalidatePath("/admin", "layout");
  volta("feito=periodo-removido");
}

export async function adicionarBloqueio(dados: FormData) {
  await exigirAdmin("/admin/horario");
  const tipo = dados.get("tipo") === "horas" ? "horas" : "dias";
  const motivo = String(dados.get("motivo") ?? "").trim().slice(0, 100) || null;
  let ini: string;
  let fim: string;
  if (tipo === "dias") {
    const de = String(dados.get("de") ?? "");
    const ate = String(dados.get("ate") ?? "") || de;
    if (!DIA_RE.test(de) || !DIA_RE.test(ate) || ate < de) volta("erro=datas");
    ini = lisboaParaIso(de, "00:00");
    fim = lisboaParaIso(somarDias(ate, 1), "00:00");
  } else {
    const dia = String(dados.get("dia") ?? "");
    const h1 = String(dados.get("hora_de") ?? "");
    const h2 = String(dados.get("hora_ate") ?? "");
    if (!DIA_RE.test(dia) || !HORA_RE.test(h1) || !HORA_RE.test(h2) || h2 <= h1) volta("erro=datas");
    ini = lisboaParaIso(dia, h1);
    fim = lisboaParaIso(dia, h2);
  }
  const sb = await supabaseSessao();
  const { error } = await sb.from("time_off").insert({ starts_at: ini, ends_at: fim, reason: motivo });
  if (error) volta("erro=datas");
  // Aviso (não bloqueia): já há marcações confirmadas nesse período.
  const { count } = await sb
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .eq("status", "confirmed")
    .lt("starts_at", fim)
    .gt("ends_at", ini);
  revalidatePath("/admin", "layout");
  volta(count ? `feito=bloqueio&afetadas=${count}` : "feito=bloqueio");
}

export async function removerBloqueio(dados: FormData) {
  await exigirAdmin("/admin/horario");
  const id = z.string().uuid().safeParse(dados.get("id"));
  if (!id.success) volta("erro=datas");
  const sb = await supabaseSessao();
  await sb.from("time_off").delete().eq("id", id.data!);
  revalidatePath("/admin", "layout");
  volta("feito=bloqueio-removido");
}
