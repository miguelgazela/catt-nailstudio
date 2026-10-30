import Image from "next/image";

import { cn } from "@/lib/utils";

// Imagem original do Higgsfield (recorte redimensionado). Nunca recolorir, esticar ou rodar.
export function Logo({
  size = 36,
  className,
  alt = "",
  priority,
}: {
  size?: number;
  className?: string;
  alt?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src="/logo-cn-384.png"
      alt={alt}
      width={size}
      height={size}
      priority={priority}
      className={cn("block shrink-0 rounded-[10px]", className)}
      style={{ width: size, height: size }}
    />
  );
}
