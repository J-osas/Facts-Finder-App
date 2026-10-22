import type { ComponentProps } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "cn"

export function GameButton({
  variant = "primary",
  className,
  ...props
}: Omit<ComponentProps<typeof Button>, "variant"> & {
  variant?: "primary" | "ghost"
}) {
  return (
    <Button
      className={cn(
        "font-display h-14 w-full rounded-2xl text-lg font-extrabold tracking-tight",
        variant === "primary" &&
          "game-press bg-lime text-ink hover:bg-lime border-transparent",
        variant === "ghost" &&
          "h-12 border-2 border-border bg-transparent text-foreground shadow-none hover:bg-card",
        className
      )}
      {...props}
    />
  )
}
