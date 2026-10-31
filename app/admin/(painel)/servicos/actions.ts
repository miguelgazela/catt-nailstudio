"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { exigirAdmin } from "@/lib/auth";
import { supabaseSessao } from "@/lib/supabase/sessao";

export type EstadoServico = { erro?: string; campos?: Record<string, string> };

const UUID = z.string().uuid();
const MAX_FOTO = 1_500_000;

/** "25", "25,50" ou "25.5" em euros -> cêntimos. */
function precoParaCentimos(txt: string): number | null {
  const t = txt.trim().replace("€", "").replace(/\s/g, "").replace(",", ".");
  if (!/^\d{1,5}(\.\d{1,2})?$/.test(t)) return null;
  return Math.round(Number(t) * 100);
}

function tipoDaImagem(b: Uint8Array): "jpg" | "png" | "webp" | null {
  if (b[0] === 0xff && b[1] === 0xd8) return "jpg";
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47)
    return "png";
  if (b[0] === 0x52 && b[1] === 0x49 && b[8] === 0x57 && b[9] === 0x45)
    return "webp";
  return null;
}

const MIME = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
} as const;

export async function guardarServico(
  _a: EstadoServico,
  dados: FormData,
): Promise<EstadoServico> {
  await exigirAdmin("/admin/servicos");
  const idBruto = String(dados.get("id") ?? "");
  const novo = idBruto === "";
  if (!novo && !UUID.safeParse(idBruto).success)
    return { erro: "Serviço inválido." };

  const nome = String(dados.get("nome") ?? "").trim();
  const descricao = String(dados.get("descricao") ?? "").trim();
  const preco = precoParaCentimos(String(dados.get("preco") ?? ""));
  const campos: Record<string, string> = {};
  if (!nome) campos.nome = "Escreva o nome do serviço.";
  else if (nome.length > 100) campos.nome = "O nome é demasiado longo.";
  if (preco === null) campos.preco = "Preço inválido. Exemplo: 25 ou 25,50.";
  if (descricao.length > 500)
    campos.descricao = "A descrição é demasiado longa.";
  if (Object.keys(campos).length)
    return { erro: "Veja os campos assinalados.", campos };

  const sb = await supabaseSessao();
  let id = idBruto;
  const ativo = dados.get("ativo") === "on";

  if (novo) {
    const { data: ult } = await sb
      .from("services")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    const { data, error } = await sb
      .from("services")
      .insert({
        name: nome,
        description: descricao,
        price_cents: preco!,
        active: ativo,
        sort_order: (ult?.sort_order ?? 0) + 1,
      })
      .select("id")
      .single();
    if (error || !data) return { erro: "Não foi possível guardar o serviço." };
    id = data.id;
  } else {
    const { error } = await sb
      .from("services")
      .update({
        name: nome,
        description: descricao,
        price_cents: preco!,
        active: ativo,
      })
      .eq("id", id);
    if (error) return { erro: "Não foi possível guardar o serviço." };
  }

  // Foto: já vem reduzida do telemóvel; confirmamos tipo e tamanho aqui.
  const foto = dados.get("foto");
  const tirar = dados.get("tirar_foto") === "on";
  const { data: atual } = await sb
    .from("services")
    .select("photo_url")
    .eq("id", id)
    .single();
  const antiga = atual?.photo_url ?? null;
  let nova: string | null | undefined;
  if (foto instanceof File && foto.size > 0) {
    if (foto.size > MAX_FOTO)
      return {
        erro: "A foto é demasiado grande (máximo 1,5 MB).",
        campos: { foto: "Foto demasiado grande." },
      };
    const bytes = new Uint8Array(await foto.arrayBuffer());
    const tipo = tipoDaImagem(bytes);
    if (!tipo)
      return {
        erro: "A foto tem de ser JPG, PNG ou WebP.",
        campos: { foto: "Formato não suportado." },
      };
    const caminho = `${id}-${Date.now()}.${tipo}`;
    const { error } = await sb.storage.from("servicos").upload(caminho, bytes, {
      contentType: MIME[tipo],
      cacheControl: "31536000",
    });
    if (error) return { erro: "Não foi possível guardar a foto." };
    nova = sb.storage.from("servicos").getPublicUrl(caminho).data.publicUrl;
  } else if (tirar) {
    nova = null;
  }
  if (nova !== undefined) {
    await sb.from("services").update({ photo_url: nova }).eq("id", id);
    const ficheiro = antiga?.split("/servicos/")[1];
    if (ficheiro) await sb.storage.from("servicos").remove([ficheiro]);
  }

  revalidatePath("/", "layout");
  redirect(`/admin/servicos?feito=${novo ? "criado" : "guardado"}`);
}

export async function mudarAtivo(dados: FormData) {
  await exigirAdmin("/admin/servicos");
  const id = UUID.safeParse(dados.get("id"));
  if (!id.success) redirect("/admin/servicos");
  const ativo = dados.get("ativo") === "1";
  const sb = await supabaseSessao();
  await sb.from("services").update({ active: ativo }).eq("id", id.data!);
  revalidatePath("/", "layout");
  redirect(`/admin/servicos?feito=${ativo ? "ativado" : "desativado"}`);
}

/** Troca de lugar com o vizinho e volta a numerar a lista toda, sem buracos nem repetidos. */
export async function moverServico(dados: FormData) {
  await exigirAdmin("/admin/servicos");
  const id = UUID.safeParse(dados.get("id"));
  const dir = dados.get("dir") === "cima" ? -1 : 1;
  if (!id.success) redirect("/admin/servicos");
  const sb = await supabaseSessao();
  const { data } = await sb
    .from("services")
    .select("id, sort_order")
    .order("sort_order")
    .order("created_at");
  const lista = data ?? [];
  const i = lista.findIndex((s) => s.id === id.data);
  const j = i + dir;
  if (i >= 0 && j >= 0 && j < lista.length) {
    [lista[i], lista[j]] = [lista[j], lista[i]];
    await Promise.all(
      lista.map((s, n) =>
        s.sort_order === n + 1
          ? null
          : sb
              .from("services")
              .update({ sort_order: n + 1 })
              .eq("id", s.id),
      ),
    );
  }
  revalidatePath("/", "layout");
  redirect("/admin/servicos");
}
