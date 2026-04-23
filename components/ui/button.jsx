import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[16px] border border-transparent text-sm font-semibold tracking-[-0.01em] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-[linear-gradient(135deg,rgba(103,232,249,0.82),rgba(56,189,248,0.92)_42%,rgba(37,99,235,0.92))] text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.38),0_22px_38px_-26px_rgba(37,99,235,0.72)] hover:-translate-y-0.5 hover:brightness-105",
        destructive:
          "bg-[linear-gradient(180deg,rgba(248,113,113,0.98),rgba(153,27,27,0.94))] text-destructive-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_18px_34px_-24px_rgba(127,29,29,0.72)] hover:-translate-y-0.5 hover:brightness-105",
        outline:
          "border-sky-300/20 bg-[linear-gradient(180deg,rgba(15,23,42,0.74),rgba(15,23,42,0.5))] text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_20px_34px_-28px_rgba(2,6,23,0.82)] hover:-translate-y-0.5 hover:border-sky-400/40 hover:bg-accent/80",
        secondary:
          "border-border/70 bg-secondary/86 text-secondary-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_18px_32px_-28px_rgba(2,6,23,0.8)] hover:-translate-y-0.5 hover:bg-secondary",
        ghost: "text-muted-foreground hover:bg-accent/70 hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-[12px] px-3 text-xs",
        lg: "h-11 rounded-[18px] px-7 text-base",
        icon: "h-10 w-10 rounded-[16px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"
  return (
    (<Comp
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props} />)
  );
})
Button.displayName = "Button"

export { Button, buttonVariants }
