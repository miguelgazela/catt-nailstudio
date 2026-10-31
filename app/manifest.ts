import type { MetadataRoute } from "next";

// start_url "/abrir": a Catarina (sessão de admin) cai direto no painel e as clientes na página inicial.
// O mesmo manifest serve os dois públicos, e as notificações abrem logo /admin.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Catarina Neves Nails Studio",
    short_name: "Catarina Neves",
    description: "Marcações online para o estúdio de manicure da Catarina Neves.",
    lang: "pt-PT",
    dir: "ltr",
    start_url: "/abrir",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F7F1EC",
    theme_color: "#7A3B52",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
