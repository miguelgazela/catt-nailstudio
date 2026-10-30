import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-transparent text-base font-bold whitespace-nowrap transition-colors duration-200 outline-none select-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary-pressed active:bg-primary-pressed",
        outline:
          "border-input bg-card text-foreground hover:bg-accent active:bg-accent",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-accent active:bg-accent",
        ghost: "text-foreground hover:bg-accent active:bg-accent",
        destructive: "bg-danger-surface text-danger hover:bg-danger-surface/70",
        link: "min-h-11 text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-12 px-6",
        sm: "h-11 px-5 text-sm",
        lg: "h-14 px-8 text-lg",
        icon: "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
