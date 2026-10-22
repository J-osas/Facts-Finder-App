import { useNavigate } from "react-router-dom"
import { Faxi } from "@/components/faxi"
import { FeedbackForm } from "@/components/feedback-form"

export function FeedbackScreen() {
  const navigate = useNavigate()

  return (
    <main className="flex min-h-svh flex-col px-5 pt-6 pb-8">
      <button
        type="button"
        className="self-start text-sm font-semibold text-[var(--cyan-ink)]"
        onClick={() => navigate(-1)}
      >
        Back
      </button>
      <div className="mt-4 flex items-center gap-3">
        <Faxi pose="encouraging" alt="" className="h-16 w-16" />
        <div>
          <h1 className="font-display text-2xl font-extrabold">Send feedback</h1>
          <p className="text-sm text-muted-foreground">The game is still being built.</p>
        </div>
      </div>
      <div className="mt-6">
        <FeedbackForm />
      </div>
      <p className="mt-4 text-center text-xs leading-relaxed text-muted-foreground">
        Your rating, note, and voice file are saved for the person building the game. If saving
        cannot finish, Send uses your phone’s share sheet.
      </p>
    </main>
  )
}
