import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }) {
  return (
    <div
      className={cn("animate-pulse rounded-[18px] bg-white/8", className)}
      {...props}
    />
  );
}
