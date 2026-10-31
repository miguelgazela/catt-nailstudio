import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";

import { RegistarSw } from "@/components/pwa/registar-sw";

import "./globals.css";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const SPLASH_IOS = [
  { w: 1320, h: 2868, pw: 440, ph: 956, r: 3 },
  { w: 1206, h: 2622, pw: 402, ph: 874, r: 3 },
  { w: 1290, h: 2796, pw: 430, ph: 932, r: 3 },
  { w: 1179, h: 2556, pw: 393, ph: 852, r: 3 },
  { w: 1170, h: 2532, pw: 390, ph: 844, r: 3 },
  { w: 1125, h: 2436, pw: 375, ph: 812, r: 3 },
  { w: 828, h: 1792, pw: 414, ph: 896, r: 2 },
];

export const metadata: Metadata = {
  title: "Catarina Neves Nails Studio",
  description:
    "Marcações online para o estúdio de manicure da Catarina Neves. Em breve.",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  // "default": barra de estado opaca por cima da página, por isso o cabeçalho nunca fica por baixo dela.
  appleWebApp: {
    capable: true,
    title: "Catarina Neves",
    statusBarStyle: "default",
    startupImage: SPLASH_IOS.map(({ w, h, pw, ph, r }) => ({
      url: `/splash/${w}x${h}.png`,
      media: `(device-width: ${pw}px) and (device-height: ${ph}px) and (-webkit-device-pixel-ratio: ${r}) and (orientation: portrait)`,
    })),
  },
};

export const viewport: Viewport = {
  themeColor: "#7A3B52",
  colorScheme: "light",
  // Ocupa o ecrã todo no iPhone; as barras fixas usam env(safe-area-inset-*) para fugir aos cantos.
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-PT"
      className={`${cormorant.variable} ${manrope.variable} h-full`}
    >
      <body className="flex min-h-full flex-col">{children}
        <RegistarSw />
      </body>
    </html>
  );
}
