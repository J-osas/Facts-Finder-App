import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { motion, useReducedMotion } from "framer-motion"
import { Faxi } from "@/components/faxi"
import { Progress } from "@/components/ui/progress"
import { useHydrated } from "@/hooks/use-hydrated"
import { usePlayer } from "@/store/player"

// How long the splash stays, and how long the bar takes to fill.
const SPLASH_MS = 4000

export function Splash() {
  const navigate = useNavigate()
  const canPlay = usePlayer((state) => state.account !== null || state.guest)
  const authReady = usePlayer((state) => state.authReady)
  const hydrated = useHydrated()
  const reduce = useReducedMotion()
  const [progress, setProgress] = useState(0)
  const [finished, setFinished] = useState(false)

  // The bar fills from empty to full over SPLASH_MS.
  useEffect(() => {
    const start = performance.now()
    let frame = 0
    const tick = (now: number) => {
      const done = Math.min(1, (now - start) / SPLASH_MS)
      setProgress(done * 100)
      if (done < 1) {
        frame = requestAnimationFrame(tick)
      } else {
        setFinished(true)
      }
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [])

  // Leave once the bar is full and the saved session has been checked.
  useEffect(() => {
    if (!finished || !hydrated || !authReady) return
    navigate(canPlay ? "/home" : "/start", { replace: true })
  }, [authReady, canPlay, finished, hydrated, navigate])

  return (
    <main className="flex min-h-svh flex-col items-center justify-between px-6 py-16 text-center">
      <div />
      <motion.div
        className="flex flex-col items-center"
        initial={reduce ? false : { opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Faxi
          pose="welcome"
          alt="Faxi waving hello"
          className="h-52 w-52"
        />
        <h1 className="font-display mt-4 text-[44px] leading-none font-extrabold">
          Facts<span className="text-cyan">-</span>Finder
        </h1>
        <p className="mt-3 text-muted-foreground">Small facts. Big adventures.</p>
      </motion.div>
      <div className="w-full">
        <Progress
          value={progress}
          aria-label="Loading"
          className="h-2.5 bg-border [&>div]:bg-lime"
        />
        <p className="mt-3 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Faxi pose="running" alt="" className="h-8 w-8" />
          Loading your adventure…
        </p>
      </div>
    </main>
  )
}
