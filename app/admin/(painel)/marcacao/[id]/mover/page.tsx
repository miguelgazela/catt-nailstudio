import { notFound } from "next/navigation";

import { getMarcacao } from "@/lib/admin/dados";
import { exigirAdmin } from "@/lib/auth";
import { diaPorExtenso, emLisboa } from "@/lib/datas";

import { FormMover } from "./form-mover";

export default async function Mover({
  params,
}: PageProps<"/admin/marcacao/[id]/mover">) {
  const { id } = await params;
  await exigirAdmin(`/admin/marcacao/${id}/mover`);
  const m = await getMarcacao(id);
  if (!m || m.status !== "confirmed") notFound();
  const { dia, hora } = emLisboa(m.starts_at);
  return (
    <main className="mx-auto flex max-w-xl flex-col gap-5">
      <h1 className="font-display text-[32px] leading-9 font-semibold">
        Mover marcação
      </h1>
      <p className="text-base text-muted-foreground">
        {m.client?.name} · {m.service?.name} · agora{" "}
        {diaPorExtenso(dia).toLowerCase()}, {hora}.
      </p>
      <FormMover id={id} dia={dia} hora={hora} />
    </main>
  );
}
