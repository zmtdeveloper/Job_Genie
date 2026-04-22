import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-white/10 bg-primary/16 text-primary-foreground shadow hover:bg-primary/24",
        secondary:
          "border-border/70 bg-secondary/80 text-secondary-foreground hover:bg-secondary",
        destructive:
          "border-red-300/20 bg-destructive/20 text-red-100 shadow hover:bg-destructive/30",
        outline: "border-border/70 bg-background/45 text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}) {
  const Comp = asChild ? Slot : "div";

  return <Comp className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants }
