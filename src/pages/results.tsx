import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useReducedMotion } from "framer-motion"
import { Faxi } from "@/components/faxi"
import { FeedbackForm } from "@/components/feedback-form"
import { GameButton } from "@/components/game-button"
import { Overline } from "@/components/shell"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { LEVEL_COUNT, XP_BAND } from "@/data/questions"
import { currentLevel, playerLevel, usePlayer, useSession } from "@/store/player"

export function Results() {
  const navigate = useNavigate()
  const result = usePlayer((state) => state.lastResult)
  const startRound = usePlayer((state) => state.startRound)
  const { profile, guest } = useSession()
  const markFeedbackPrompted = usePlayer((state) => state.markFeedbackPrompted)
  const reduce = useReducedMotion()
  const [showReview, setShowReview] = useState(false)
  const [dismissedPrompt, setDismissedPrompt] = useState(false)
  const clears = Object.values(profile.paths).reduce(
    (sum, path) => sum + path.completed.length,
    0
  )
  const askForFeedback = !profile.feedbackPrompted && clears >= 2 && !dismissedPrompt
  const score = useCountUp(result?.correct ?? 0, reduce)
  const into = profile.xp % XP_BAND

  useEffect(() => {
    if (!result) navigate("/home", { replace: true })
  }, [navigate, result])

  if (!result) return null

  const nextLevel =
    result.mode === "level" ? Math.min(LEVEL_COUNT, result.level + 1) : result.level

  function closePrompt() {
    setDismissedPrompt(true)
    markFeedbackPrompted()
  }

  return (
    <main className="flex min-h-svh flex-col px-5 pt-8 pb-8">
      {askForFeedback ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55">
          <div className="max-h-[92dvh] w-full max-w-[430px] overflow-y-auto rounded-t-3xl bg-background px-5 pt-5 pb-6">
            <div className="mb-4 flex items-center gap-3">
              <Faxi pose="encouraging" alt="" className="h-14 w-14" />
              <div>
                <h2 className="font-display text-xl font-extrabold">How is Facts-Finder so far?</h2>
                <p className="text-sm text-muted-foreground">The game is still being built.</p>
              </div>
            </div>
            <FeedbackForm compact onSent={closePrompt} />
            <button
              type="button"
              className="mt-3 w-full text-sm font-semibold text-[var(--cyan-ink)]"
              onClick={closePrompt}
            >
              Not now
            </button>
          </div>
        </div>
      ) : null}
      <div className="flex flex-col items-center text-center">
        <Faxi
          pose={
            result.leveledUp ? "levelup" : result.passed ? "celebrating" : "supportive"
          }
          alt={
            result.leveledUp
              ? "Faxi with a level-up trophy"
              : result.passed
                ? "Faxi celebrating"
                : "Faxi staying with you"
          }
          className="h-36 w-36"
        />
        <Overline>
          {result.mode === "daily"
            ? "Daily challenge"
            : result.passed
              ? `Level ${result.level} complete`
              : `Level ${result.level}`}
        </Overline>
        <p className="font-display mt-2 text-6xl font-extrabold">
          {score}
          <span className="text-3xl text-muted-foreground"> / {result.total}</span>
        </p>
        <p className="mt-2 max-w-xs text-[15px] font-semibold">
          {result.passed
            ? result.leveledUp
              ? "Level up. That run moved you forward."
              : "A clean run. Keep the facts that surprised you."
            : "So close. The missed facts are below whenever you want them."}
        </p>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <Card className="rounded-2xl border border-border bg-card p-3 ring-0">
          <Overline>Accuracy</Overline>
          <p className="font-display mt-1 text-2xl font-extrabold">
            {Math.round((result.correct / result.total) * 100)}%
          </p>
        </Card>
        <Card className="rounded-2xl border border-border bg-card p-3 ring-0">
          <Overline>XP earned</Overline>
          <p className="font-display mt-1 text-2xl font-extrabold text-[#6E9E1C] dark:text-lime">
            +{result.xpEarned}
          </p>
        </Card>
      </div>

      <Card className="mt-3 gap-2 rounded-2xl border border-border bg-card p-4 ring-0">
        <div className="flex justify-between text-sm font-bold">
          <span>Level {playerLevel(profile.xp)}</span>
          <span className="text-muted-foreground">
            {into} / {XP_BAND}
          </span>
        </div>
        <Progress value={(into / XP_BAND) * 100} className="h-2.5 bg-border" />
        {result.bestStreak > 1 ? (
          <p className="text-sm text-muted-foreground">
            {result.bestStreak} correct in a row
          </p>
        ) : null}
      </Card>

      {guest ? (
        <Card className="mt-3 gap-2 rounded-2xl border-2 border-cyan bg-card p-4 ring-0">
          <p className="font-display text-lg font-extrabold">Keep your progress</p>
          <p className="text-sm text-muted-foreground">
            You are playing as a guest, so your XP is only on this browser. Create an account to
            save it and play with friends.
          </p>
          <button
            type="button"
            className="mt-1 self-start rounded-full bg-cyan px-4 py-2 text-sm font-extrabold text-ink"
            onClick={() => navigate("/auth?mode=signup")}
          >
            Create account
          </button>
        </Card>
      ) : null}

      <div className="mt-auto flex flex-col gap-3 pt-6">
        {result.passed && result.mode === "level" && result.level < LEVEL_COUNT ? (
          <GameButton
            onClick={() => {
              startRound(result.path, nextLevel)
              navigate("/round")
            }}
          >
            Next level
          </GameButton>
        ) : null}
        {result.passed ? (
          <GameButton
            variant={result.level < LEVEL_COUNT && result.mode === "level" ? "ghost" : "primary"}
            onClick={() => {
              startRound(result.path, result.mode === "daily" ? currentLevel(profile.paths.general) : result.level, result.mode)
              navigate("/round")
            }}
          >
            Replay
          </GameButton>
        ) : (
          <GameButton
            onClick={() => {
              startRound(result.path, result.level, result.mode)
              navigate("/round")
            }}
          >
            Try again
          </GameButton>
        )}
        {!result.passed ? (
          <GameButton variant="ghost" onClick={() => setShowReview((value) => !value)}>
            Review facts
          </GameButton>
        ) : (
          <GameButton variant="ghost" onClick={() => navigate("/discover")}>
            Explore topics
          </GameButton>
        )}
      </div>
      {showReview ? (
        <div className="mt-4">
          <div className="mb-3 flex items-center gap-2">
            <Faxi pose="explaining" alt="" className="h-12 w-12" />
            <Overline>Worth keeping</Overline>
          </div>
        <ul className="flex flex-col gap-3">
          {result.missed.map((fact) => (
            <li key={fact.text} className="rounded-2xl border border-border bg-card p-3">
              <p className="font-semibold">{fact.text}</p>
              <p className="mt-1 text-sm font-bold text-[#3f6212] dark:text-lime">
                {fact.correct}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{fact.explanation}</p>
            </li>
          ))}
        </ul>
        </div>
      ) : null}
    </main>
  )
}

function useCountUp(target: number, reduce: boolean | null) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (reduce) return
    const start = performance.now()
    let frame = 0
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / 800)
      setValue(Math.round(target * (1 - (1 - progress) ** 3)))
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [reduce, target])
  return reduce ? target : value
}
