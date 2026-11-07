import { ExternalLink } from "lucide-react";

/**
 * Mini mapa ilustrativo da morada. Não carrega mapas de terceiros (sem chaves, sem
 * cookies, sem mexer na CSP): ao tocar, abre a morada no Google Maps (ou na app de
 * mapas do telemóvel).
 */
export function MiniMapa({ morada }: { morada: string }) {
  const linha = morada.replace(/\s*\n\s*/g, ", ");
  const href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(linha)}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Abrir no mapa: ${linha}`}
      className="group relative block h-40 overflow-hidden rounded-lg border border-border bg-blush no-underline"
    >
      <svg
        aria-hidden
        viewBox="0 0 400 160"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 size-full"
      >
        <rect width="400" height="160" fill="var(--blush)" />
        <g fill="var(--secondary)">
          <rect x="18" y="14" width="88" height="48" rx="8" />
          <rect x="126" y="14" width="96" height="48" rx="8" />
          <rect x="242" y="14" width="64" height="48" rx="8" />
          <rect x="326" y="14" width="62" height="48" rx="8" />
          <rect x="18" y="86" width="88" height="60" rx="8" />
          <rect x="242" y="86" width="64" height="60" rx="8" />
          <rect x="326" y="86" width="62" height="60" rx="8" />
        </g>
        <g stroke="var(--card)" strokeLinecap="round" fill="none">
          <path d="M0 74h400" strokeWidth="14" />
          <path d="M116 0v160" strokeWidth="10" />
          <path d="M232 0v160" strokeWidth="10" />
          <path d="M316 0v160" strokeWidth="8" />
        </g>
        <rect
          x="126"
          y="86"
          width="96"
          height="60"
          rx="8"
          fill="var(--nude)"
          opacity=".55"
        />
      </svg>
      <span
        aria-hidden
        className="absolute top-[44%] left-[43%] flex -translate-x-1/2 -translate-y-full flex-col items-center"
      >
        <span className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-card ring-2 ring-card">
          <svg
            viewBox="0 0 24 24"
            className="size-[18px] fill-none stroke-current stroke-2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
            <circle cx="12" cy="10" r="3" />
          </svg>
        </span>
        <span className="-mt-1 size-2 rotate-45 bg-primary" />
      </span>
      <span className="absolute right-3 bottom-3 inline-flex min-h-9 items-center gap-1.5 rounded-full bg-card px-3.5 text-[13px] font-bold text-primary shadow-card group-hover:bg-accent">
        Abrir no mapa
        <ExternalLink aria-hidden className="size-3.5" />
      </span>
    </a>
  );
}
