// Esqueleto do painel. Com este ficheiro o Next guarda o ecrã de espera de antemão, por isso
// trocar de tab é imediato e os dados aparecem quando o Supabase responde.
export default function ACarregar() {
  return (
    <div
      role="status"
      aria-label="A carregar"
      className="flex flex-col gap-4 motion-safe:animate-pulse"
    >
      <div className="h-9 w-40 rounded-md bg-secondary" />
      <div className="h-5 w-56 rounded-md bg-secondary" />
      <div className="mt-2 flex flex-col gap-2.5">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-lg bg-secondary" />
        ))}
      </div>
    </div>
  );
}
