import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { motion, useReducedMotion } from "framer-motion"
import { X } from "lucide-react"
import { AnswerOption, type AnswerState } from "@/components/answer-option"
import { Faxi } from "@/components/faxi"
import { GameButton } from "@/components/game-button"
import { Overline } from "@/components/shell"
import { Progress } from "@/components/ui/progress"
import { MISTAKE_LIMIT, QUESTION_SECONDS } from "@/data/questions"
import { roomSaveResult, usePlayer } from "@/store/player"
import { cn } from "cn"

const praise = ["Nice one!", "Spot on!", "That's the one."]
const comfort = [
  "Not quite, and a fair guess!",
  "Close. This one is worth keeping.",
  "Good try. Here's the missing piece.",
]

export function Gameplay() {
  const navigate = useNavigate()
  const round = usePlayer((state) => state.round)
  const answerQuestion = usePlayer((state) => state.answerQuestion)
  const continueRound = usePlayer((state) => state.continueRound)
  const abandonRoomRound = usePlayer((state) => state.abandonRoomRound)
  const reduce = useReducedMotion()
  const [now, setNow] = useState(() => Date.now())
  const [saving, setSaving] = useState(false)
  const finished = useRef(false)

  // Opens the room once the score is saved. A save that failed is reported
  // there, so the player knows the leaderboard is missing their score.
  async function openRoom(code: string, save: Promise<string | null>) {
    setSaving(true)
    const problem = await save
    navigate(`/room/${code}`, {
      replace: true,
      state: {
        notice: problem ? `Your score could not be saved. ${problem}` : "Your score is saved.",
      },
    })
  }

  function leave() {
    if (!round || round.mode !== "room" || !round.room) {
      navigate("/play")
      return
    }
    const ok = window.confirm(
      "Leave this room round? Your score so far is saved, and you cannot play this room again."
    )
    if (!ok) return
    finished.current = true
    void openRoom(round.room.code, abandonRoomRound())
  }

  useEffect(() => {
    if (!round && !finished.current) navigate("/play", { replace: true })
  }, [navigate, round])

  useEffect(() => {
    if (!round || round.phase !== "question") return
    const timer = window.setInterval(() => setNow(Date.now()), 200)
    return () => window.clearInterval(timer)
  }, [round])

  useEffect(() => {
    if (!round || round.phase !== "question") return
    const left = QUESTION_SECONDS - (Date.now() - round.questionStartedAt) / 1000
    if (left > 0) return
    answerQuestion(null, 0)
  }, [answerQuestion, now, round])

  if (!round) {
    return saving ? (
      <main className="flex min-h-svh flex-col items-center justify-center gap-4 px-6 text-center">
        <Faxi pose="running" alt="" className="h-28 w-28" />
        <p className="font-display text-2xl font-extrabold">Saving your score…</p>
      </main>
    ) : null
  }

  const inRoom = round.mode === "room"
  const question = round.questions[round.index]
  const secondsLeft = Math.max(
    0,
    QUESTION_SECONDS - (now - round.questionStartedAt) / 1000
  )
  const lowTime = round.phase === "question" && secondsLeft <= 5
  const mistakesLeft = Math.max(0, MISTAKE_LIMIT - round.mistakes)
  const correct = round.chosenIndex === question.correctIndex && !round.timedOut
  const heading = correct
    ? praise[round.index % praise.length]
    : round.timedOut
      ? "Time's up. Here's the fact."
      : comfort[round.index % comfort.length]

  function stateFor(index: number): AnswerState {
    if (round?.phase === "question") return "default"
    if (index === question.correctIndex) return "correct"
    if (index === round?.chosenIndex) return "wrong"
    return "dimmed"
  }

  return (
    <main className="flex min-h-svh flex-col px-5 pt-5 pb-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Leave round"
          className="grid size-11 place-items-center rounded-full border border-border"
          onClick={leave}
        >
          <X aria-hidden="true" />
        </button>
        <div className="flex-1">
          <Overline>
            Question {round.index + 1} of {round.questions.length}
          </Overline>
          <Progress
            value={(round.index / round.questions.length) * 100}
            className="mt-1 h-2.5 bg-border"
          />
        </div>
        <p
          className={cn(
            "rounded-full border px-3 py-1 text-sm font-extrabold tabular-nums",
            lowTime ? "border-wrong text-wrong" : "border-cyan text-cyan"
          )}
          aria-live="polite"
        >
          {Math.min(QUESTION_SECONDS, Math.ceil(secondsLeft))}s
        </p>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm font-bold">
        <p>
          {inRoom
            ? `Room ${round.room?.code ?? ""}`
            : `Mistakes left: ${mistakesLeft} of ${MISTAKE_LIMIT}`}
        </p>
        <p className="text-lime">{round.points} pts</p>
      </div>

      <motion.section
        key={question.id + round.phase}
        initial={reduce ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="mt-4 rounded-2xl border border-border bg-card p-4"
      >
        <Overline>{question.label}</Overline>
        <h1
          className={cn(
            "font-display mt-2 font-extrabold",
            round.phase === "feedback" ? "text-lg" : "text-[26px] leading-tight"
          )}
        >
          {question.text}
        </h1>
      </motion.section>

      <div className="mt-4 flex flex-col gap-2.5">
        {question.options.map((option, index) => (
          <motion.div
            key={option}
            initial={reduce || round.phase === "feedback" ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: reduce ? 0 : index * 0.06 }}
          >
            <AnswerOption
              index={index}
              label={option}
              state={stateFor(index)}
              disabled={round.phase === "feedback"}
              onSelect={() => answerQuestion(index, secondsLeft)}
            />
          </motion.div>
        ))}
      </div>

      {round.phase === "question" ? (
        <div className="mt-auto flex items-center gap-3 pt-5">
          <Faxi
            pose={round.index === 0 ? "encouraging" : "thinking"}
            alt=""
            className="h-16 w-16"
          />
          <p className="rounded-2xl bg-ivory px-3 py-2 text-[15px] font-semibold text-ink">
            {round.index === 0 ? "You've got this." : "Take your time."}
          </p>
        </div>
      ) : (
        <section className="mt-4 rounded-2xl bg-ivory p-4 text-ink">
          <div className="flex items-center gap-3">
            <Faxi
              pose={
                correct
                  ? round.streak >= 3
                    ? "excited"
                    : "cheerful"
                  : !inRoom && round.mistakes >= MISTAKE_LIMIT
                    ? "supportive"
                    : "encouraging"
              }
              alt=""
              className="h-16 w-16"
            />
            <h2 className="font-display text-xl font-extrabold">{heading}</h2>
          </div>
          <div className="mt-3 flex items-start gap-3">
            <Faxi pose="explaining" alt="" className="h-12 w-12 shrink-0" />
            <p className="text-[15px] leading-relaxed">{question.explanation}</p>
          </div>
          {correct ? (
            <p className="mt-2 text-sm font-extrabold text-[#3f6212]">
              +{round.answers.at(-1)?.points ?? 0} pts
            </p>
          ) : null}
          <GameButton
            className="mt-4"
            onClick={() => {
              const code = round.room?.code
              const next = continueRound()
              if (next === "results") {
                finished.current = true
                navigate("/results", { replace: true })
              } else if (next === "room" && code) {
                finished.current = true
                void openRoom(code, roomSaveResult())
              }
            }}
          >
            Continue
          </GameButton>
        </section>
      )}
    </main>
  )
}
