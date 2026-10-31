"use client";

import { LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";

import { AvisoErro, Campo, botaoPrimario, botaoSecundario, classeInput } from "@/components/admin/campos";

import { type EstadoServico, guardarServico } from "../actions";

type Servico = {
  id: string;
  name: string;
  description: string;
  price_cents: number;
  photo_url: string | null;
  active: boolean;
};

/** Reduz a foto no telemóvel (máx. 1200 px, JPEG) para não enviar 5 MB nem guardar pixéis a mais. */
async function reduzir(f: File): Promise<File> {
  if (!f.type.startsWith("image/") || f.size < 1) return f;
  try {
    const img = await createImageBitmap(f);
    const escala = Math.min(1, 1200 / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * escala);
    c.height = Math.round(img.height * escala);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", 0.82));
    return blob ? new File([blob], "foto.jpg", { type: "image/jpeg" }) : f;
  } catch {
    return f;
  }
}

export function FormServico({ servico }: { servico: Servico | null }) {
  const [e, acao, pendente] = useActionState(
    async (anterior: EstadoServico, dados: FormData) => {
      const foto = dados.get("foto");
      if (foto instanceof File && foto.size > 0) dados.set("foto", await reduzir(foto));
      return guardarServico(anterior, dados);
    },
    {} as EstadoServico,
  );
  const euros = servico ? String(servico.price_cents / 100).replace(".", ",") : "";
  return (
    <form action={acao} noValidate className="flex flex-col gap-[18px]">
      <input type="hidden" name="id" value={servico?.id ?? ""} />
      {e.erro ? <AvisoErro>{e.erro}</AvisoErro> : null}
      <Campo id="nome" rotulo="Nome" defaultValue={servico?.name} maxLength={100} erro={e.campos?.nome} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="descricao" className="text-sm font-semibold">Descrição</label>
        <textarea id="descricao" name="descricao" rows={3} maxLength={500} defaultValue={servico?.description} className={`${classeInput} py-3`} />
        {e.campos?.descricao ? <p className="text-[13px] text-danger">{e.campos.descricao}</p> : null}
      </div>
      <Campo id="preco" rotulo="Preço (€)" inputMode="decimal" defaultValue={euros} erro={e.campos?.preco} ajuda="Exemplo: 25 ou 25,50. Duração fixa: 1 hora." />
      <div className="flex flex-col gap-2">
        <label htmlFor="foto" className="text-sm font-semibold">Foto</label>
        {servico?.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={servico.photo_url} alt="Foto atual do serviço" className="h-40 w-full rounded-lg object-cover" />
        ) : null}
        <input id="foto" name="foto" type="file" accept="image/jpeg,image/png,image/webp" className="min-h-12 text-base" />
        {e.campos?.foto ? <p className="text-[13px] text-danger">{e.campos.foto}</p> : null}
        {servico?.photo_url ? (
          <label className="flex min-h-11 items-center gap-3 text-base">
            <input type="checkbox" name="tirar_foto" className="size-5 accent-[var(--primary)]" /> Tirar a foto
          </label>
        ) : null}
      </div>
      <label className="flex min-h-11 items-center gap-3 text-base">
        <input type="checkbox" name="ativo" defaultChecked={servico?.active ?? true} className="size-5 accent-[var(--primary)]" />
        Visível para as clientes
      </label>
      <button type="submit" disabled={pendente} className={botaoPrimario}>
        {pendente ? <LoaderCircle aria-hidden className="size-5 animate-spin" /> : null}
        Guardar
      </button>
      <Link href="/admin/servicos" className={botaoSecundario}>Voltar</Link>
    </form>
  );
}
