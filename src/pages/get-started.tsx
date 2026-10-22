import { useEffect, useState, type ReactNode } from "react"
import { useNavigate } from "react-router-dom"
import { motion, useReducedMotion } from "framer-motion"
import { Faxi } from "@/components/faxi"
import { GameButton } from "@/components/game-button"
import { Overline } from "@/components/shell"

const GREETING =
  "Hi, I am Faxi. Welcome to Facts-Finder, where you learn something new every day."

const points = [
  { title: "Quick quizzes", body: "Ten questions. Three misses. A fact you can keep." },
  { title: "Levels and XP", body: "Climb a path, or follow history and science on their own." },
  { title: "Play with friends", body: "Host a room, share the link, and see who tops the leaderboard." },
]

const rise = {
  duration: 0.4,
  ease: "easeOut" as const,
}

export function GetStarted() {
  const navigate = useNavigate()
  const reduce = useReducedMotion()
  const [count, setCount] = useState(0)
  const [typing, setTyping] = useState(false)

  useEffect(() => {
    if (reduce !== false) return
    const start = window.setTimeout(() => setTyping(true), 450)
    return () => window.clearTimeout(start)
  }, [reduce])

  useEffect(() => {
    if (!typing || count >= GREETING.length) return
    const tick = window.setTimeout(() => setCount((value) => value + 1), 28)
    return () => window.clearTimeout(tick)
  }, [count, typing])

  const typed = reduce ? GREETING : GREETING.slice(0, count)
  const showRest = reduce === true || (typing && count >= GREETING.length)
  const stillTyping = reduce === false && count < GREETING.length

  return (
    <main className="flex min-h-svh flex-col px-5 pt-8 pb-8">
      <div className="flex items-end gap-3">
        <motion.div
          initial={reduce ? false : { opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={reduce ? { duration: 0 } : { duration: 0.45, ease: "easeOut" }}
        >
          <Faxi pose="welcome" alt="Faxi waving" className="h-28 w-28" />
        </motion.div>
        <h1
          aria-label={GREETING}
          className="font-display relative text-[22px] leading-tight font-extrabold"
        >
          <span className="invisible" aria-hidden="true">
            {GREETING}
          </span>
          <span className="absolute inset-0">
            {typed}
            {stillTyping ? (
              <span
                className="ml-0.5 inline-block h-[1em] w-0.5 translate-y-0.5 animate-pulse bg-foreground align-middle"
                aria-hidden="true"
              />
            ) : null}
          </span>
        </h1>
      </div>

      <Rise show={showRest} reduce={reduce} delay={0} className="mt-6">
        <Overline>How the game works</Overline>
      </Rise>

      <ul className="mt-3 flex flex-col gap-3">
        {points.map((point, index) => (
          <Rise
            key={point.title}
            as="li"
            show={showRest}
            reduce={reduce}
            delay={0.4 + index * 0.38}
            className="rounded-2xl border border-border bg-card p-4"
          >
            <p className="font-display text-lg font-extrabold">{point.title}</p>
            <p className="mt-1 text-[15px] leading-snug text-muted-foreground">
              {point.body}
            </p>
          </Rise>
        ))}
      </ul>

      <Rise
        show={showRest}
        reduce={reduce}
        delay={0.4 + points.length * 0.38}
        className="mt-auto flex flex-col gap-3 pt-8"
      >
        <GameButton onClick={() => navigate("/auth?mode=signup")}>Get started</GameButton>
        <GameButton variant="ghost" onClick={() => navigate("/auth?mode=login")}>
          I already have an account
        </GameButton>
        <button
          type="button"
          className="text-sm font-semibold text-[var(--cyan-ink)]"
          onClick={() => navigate("/feedback")}
        >
          Send feedback
        </button>
      </Rise>
    </main>
  )
}

function Rise({
  as = "div",
  show,
  reduce,
  delay,
  className,
  children,
}: {
  as?: "div" | "li"
  show: boolean
  reduce: boolean | null
  delay: number
  className?: string
  children: ReactNode
}) {
  const Tag = as === "li" ? motion.li : motion.div
  const hidden = { opacity: 0, y: 12 }
  const visible = reduce === true || show
  return (
    <Tag
      className={className}
      initial={false}
      animate={visible ? { opacity: 1, y: 0 } : hidden}
      transition={reduce ? { duration: 0 } : { ...rise, delay: visible ? delay : 0 }}
      style={{ pointerEvents: visible ? "auto" : "none" }}
    >
      {children}
    </Tag>
  )
}
