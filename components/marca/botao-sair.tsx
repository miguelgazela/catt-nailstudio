import { sair } from "@/app/sair/actions";

export function BotaoSair() {
  return (
    <form action={sair}>
      <button
        type="submit"
        className="inline-flex min-h-11 items-center px-1 text-[15px] font-semibold text-primary underline-offset-4 hover:underline"
      >
        Sair
      </button>
    </form>
  );
}
