import { Check, X } from "lucide-react"
import { cn } from "cn"

export type AnswerState = "default" | "selected" | "correct" | "wrong" | "dimmed"

const letters = ["A", "B", "C", "D"]

export function AnswerOption({
  index,
  label,
  state,
  disabled,
  onSelect,
}: {
  index: number
  label: string
  state: AnswerState
  disabled?: boolean
  onSelect: () => void
}) {
  const status =
    state === "correct" ? "Correct" : state === "wrong" ? "Your answer" : null

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "flex min-h-[58px] w-full items-center gap-3 rounded-[14px] border-2 px-3 text-left transition-colors",
        state === "default" && "border-border bg-card",
        state === "selected" && "border-cyan bg-card",
        state === "correct" && "border-lime bg-[var(--right-bg)]",
        state === "wrong" && "border-wrong bg-[var(--wrong-bg)]",
        state === "dimmed" && "border-border bg-card opacity-55"
      )}
    >
      <span
        className={cn(
          "grid size-8 shrink-0 place-items-center rounded-full text-sm font-extrabold",
          state === "correct" && "bg-lime text-ink",
          state === "wrong" && "bg-wrong text-ink",
          state === "selected" && "bg-cyan text-ink",
          (state === "default" || state === "dimmed") &&
            "bg-muted text-foreground"
        )}
        aria-hidden="true"
      >
        {state === "correct" ? (
          <Check className="size-4" />
        ) : state === "wrong" ? (
          <X className="size-4" />
        ) : (
          letters[index]
        )}
      </span>
      <span className="flex-1 text-[15px] leading-snug font-semibold">{label}</span>
      {status ? (
        <span className="text-xs font-bold tracking-wide uppercase">{status}</span>
      ) : null}
    </button>
  )
}
