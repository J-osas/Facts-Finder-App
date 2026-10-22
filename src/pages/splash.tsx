import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { motion, useReducedMotion } from "framer-motion"
import { Faxi } from "@/components/faxi"
import { Progress } from "@/components/ui/progress"
import { useHydrated } from "@/hooks/use-hydrated"
import { usePlayer } from "@/store/player"

export function Splash() {
  const navigate = useNavigate()
  const sessionEmail = usePlayer((state) => state.account?.email ?? null)
  const hydrated = useHydrated()
  const reduce = useReducedMotion()

  useEffect(() => {
    if (!hydrated) return
    const timer = window.setTimeout(() => {
      navigate(sessionEmail ? "/home" : "/start", { replace: true })
    }, 1400)
    return () => window.clearTimeout(timer)
  }, [hydrated, navigate, sessionEmail])

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
        <Progress value={70} className="h-2.5 bg-border" />
        <p className="mt-3 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Faxi pose="running" alt="" className="h-8 w-8" />
          Loading your adventure…
        </p>
      </div>
    </main>
  )
}
