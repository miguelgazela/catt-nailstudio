import { notFound } from "next/navigation";

import { exigirAdmin } from "@/lib/auth";
import { supabaseSessao } from "@/lib/supabase/sessao";

import { FormServico } from "./form-servico";

export default async function EditarServico({
  params,
}: PageProps<"/admin/servicos/[id]">) {
  const { id } = await params;
  await exigirAdmin(`/admin/servicos/${id}`);
  let servico = null;
  if (id !== "novo") {
    if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
    const sb = await supabaseSessao();
    const { data } = await sb
      .from("services")
      .select("id, name, description, price_cents, photo_url, active")
      .eq("id", id)
      .maybeSingle();
    if (!data) notFound();
    servico = data;
  }
  return (
    <main className="mx-auto flex max-w-xl flex-col gap-5">
      <h1 className="font-display text-[32px] leading-9 font-semibold">
        {servico ? "Editar serviço" : "Novo serviço"}
      </h1>
      <FormServico servico={servico} />
    </main>
  );
}
