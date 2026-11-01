import { sair } from "@/app/sair/actions";
import { BotaoEnviar } from "@/components/botao-enviar";

export function BotaoSair() {
  return (
    <form action={sair}>
      <BotaoEnviar className="inline-flex min-h-11 items-center px-1 text-[15px] font-semibold text-primary underline-offset-4 hover:underline">
        Sair
      </BotaoEnviar>
    </form>
  );
}
