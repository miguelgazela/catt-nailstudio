import { exigirAdmin } from "@/lib/auth";
import { hojeEmLisboa } from "@/lib/datas";
import { getServicosAtivos } from "@/lib/admin/dados";
import { HORA_RE, diaValido } from "@/lib/admin/tempo";
import { supabaseSessao } from "@/lib/supabase/sessao";

import { FormNova } from "./form-nova";

export default async function Nova({ searchParams }: PageProps<"/admin/nova">) {
  const q = await searchParams;
  const um = (k: string) =>
    typeof q[k] === "string" ? (q[k] as string) : undefined;
  await exigirAdmin("/admin/nova");
  const dia = diaValido(um("dia")) ? um("dia")! : hojeEmLisboa();
  const hora = um("hora") && HORA_RE.test(um("hora")!) ? um("hora") : undefined;
  const servicos = await getServicosAtivos();
  let cliente: { id: string; name: string } | undefined;
  if (um("cliente")) {
    const sb = await supabaseSessao();
    const { data } = await sb
      .from("clients")
      .select("id, name")
      .eq("id", um("cliente")!)
      .is("anonymized_at", null)
      .maybeSingle();
    if (data) cliente = data;
  }
  return (
    <main className="mx-auto flex max-w-xl flex-col gap-5">
      <h1 className="font-display text-[32px] leading-9 font-semibold">
        Nova marcação
      </h1>
      <FormNova servicos={servicos} dia={dia} hora={hora} cliente={cliente} />
    </main>
  );
}
