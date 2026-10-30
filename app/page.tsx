import Image from "next/image";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-1 flex-col items-center justify-center gap-8 px-5 py-12 text-center">
      <Image
        src="/logo-cn-384.png"
        alt="Logótipo Catarina Neves Nails Studio: unha cor de ameixa com o monograma CN"
        width={192}
        height={192}
        priority
        className="size-48 rounded-xl shadow-card"
      />
      <div className="flex flex-col items-center gap-3">
        <h1 className="font-display text-[40px] leading-[44px] font-semibold text-foreground">
          Catarina Neves
          <span className="block text-[26px] leading-[30px] text-primary">
            Nails Studio
          </span>
        </h1>
        <p className="text-lg leading-7 text-muted-foreground">
          As marcações online chegam em breve.
        </p>
      </div>
    </main>
  );
}
