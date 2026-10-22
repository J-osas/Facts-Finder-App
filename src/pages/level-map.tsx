import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { motion, useReducedMotion } from "framer-motion"
import { Check } from "lucide-react"
import { Faxi } from "@/components/faxi"
import { Overline } from "@/components/shell"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LEVEL_COUNT, PATHS, type PathId } from "@/data/questions"
import { useHydrated } from "@/hooks/use-hydrated"
import { currentLevel, usePlayer, useSession } from "@/store/player"
import { cn } from "cn"

type PathSegment = {
  x1: number
  y1: number
  x2: number
  y2: number
  walked: boolean
}

export function LevelMap() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const requested = params.get("path")
  const path: PathId =
    requested === "history" || requested === "science" ? requested : "general"
  const { profile, email } = useSession()
  const hydrated = useHydrated()
  const startRound = usePlayer((state) => state.startRound)
  const reduce = useReducedMotion()
  const current = currentLevel(profile.paths[path])
  const currentRef = useRef<HTMLButtonElement | null>(null)
  const mapRef = useRef<HTMLDivElement | null>(null)
  const nodeRefs = useRef<Array<HTMLButtonElement | null>>([])
  const [segments, setSegments] = useState<PathSegment[]>([])
  const notice = params.get("locked")
  const completed = profile.paths[path].completed

  useLayoutEffect(() => {
    const map = mapRef.current
    if (!map) return

    function place() {
      const box = map?.getBoundingClientRect()
      if (!box) return
      const points = []
      for (let level = LEVEL_COUNT; level >= 1; level -= 1) {
        const node = nodeRefs.current[level]
        if (!node) continue
        const rect = node.getBoundingClientRect()
        points.push({
          level,
          x: rect.left + rect.width / 2 - box.left,
          y: rect.top + rect.height / 2 - box.top,
        })
      }
      const next: PathSegment[] = []
      for (let index = 0; index < points.length - 1; index += 1) {
        const above = points[index]
        const below = points[index + 1]
        if (!above || !below) continue
        next.push({
          x1: above.x,
          y1: above.y,
          x2: below.x,
          y2: below.y,
          walked: completed.includes(below.level),
        })
      }
      setSegments(next)
    }

    place()
    const observer = new ResizeObserver(place)
    observer.observe(map)
    return () => observer.disconnect()
  }, [completed, current, path])

  useEffect(() => {
    if (hydrated && !email) navigate("/start", { replace: true })
  }, [email, hydrated, navigate])

  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: "center" })
  }, [path, current])

  if (!hydrated || !email) return <main className="min-h-svh" />

  function openLevel(level: number) {
    const progress = profile.paths[path]
    const unlocked = progress.completed.includes(level) || level === current
    if (!unlocked) {
      setParams({ path, locked: String(current) })
      return
    }
    startRound(path, level)
    navigate("/round")
  }

  const info = PATHS.find((item) => item.id === path)

  return (
    <main className="flex flex-col px-5 pt-6">
      <Tabs
        value={path}
        onValueChange={(value) => setParams({ path: value })}
      >
        <TabsList className="grid h-11 w-full grid-cols-3 rounded-2xl bg-card p-1">
          {PATHS.map((item) => (
            <TabsTrigger
              key={item.id}
              value={item.id}
              className="rounded-xl text-xs font-bold data-active:bg-cyan data-active:text-ink"
            >
              {item.id === "general" ? "General" : item.title}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <h1 className="font-display mt-4 text-[26px] font-extrabold">{info?.title}</h1>
      <p className="text-sm text-muted-foreground">
        Level {current} of {LEVEL_COUNT}
      </p>
      <div
        ref={mapRef}
        className="relative mx-auto mt-6 flex w-full max-w-xs flex-col gap-10"
      >
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          {segments.map((segment) => (
            <line
              key={`${segment.x1}-${segment.y1}-${segment.x2}-${segment.y2}`}
              x1={segment.x1}
              y1={segment.y1}
              x2={segment.x2}
              y2={segment.y2}
              strokeWidth={segment.walked ? 8 : 6}
              strokeLinecap="round"
              strokeDasharray={segment.walked ? "0.1 16" : undefined}
              className={segment.walked ? "stroke-lime" : "stroke-[#6d8cb3]"}
            />
          ))}
        </svg>
        {Array.from({ length: LEVEL_COUNT }, (_, index) => LEVEL_COUNT - index).map(
          (level) => {
            const done = profile.paths[path].completed.includes(level)
            const isCurrent = level === current && !done
            const locked = !done && !isCurrent
            const bonus = level === 6
            return (
              <div
                key={level}
                className={cn(
                  "relative z-10 flex items-center",
                  level % 2 === 0 ? "justify-end pr-2" : "justify-start pl-2"
                )}
              >
                <motion.button
                  ref={(node) => {
                    nodeRefs.current[level] = node
                    if (isCurrent) currentRef.current = node
                  }}
                  type="button"
                  onClick={() => openLevel(level)}
                  whileTap={locked && !reduce ? { x: [0, -6, 6, -4, 0] } : undefined}
                  className={cn(
                    "relative grid place-items-center rounded-full border-2 font-display font-extrabold",
                    isCurrent
                      ? "size-[84px] border-cyan bg-cyan text-2xl text-ink ring-4 ring-background ring-offset-2 ring-offset-cyan"
                      : "size-14 text-lg",
                    done && "border-lime bg-lime text-ink",
                    locked && "border-border bg-card text-muted-foreground",
                    bonus && locked && "border-dashed border-foreground"
                  )}
                  aria-label={
                    locked
                      ? `Level ${level} locked`
                      : done
                        ? `Replay level ${level}`
                        : `Play level ${level}`
                  }
                >
                  {done ? <Check aria-hidden="true" /> : level}
                  {isCurrent ? (
                    <Faxi
                      pose="guiding"
                      alt=""
                      className="absolute -top-8 -right-10 h-14 w-14"
                    />
                  ) : null}
                </motion.button>
              </div>
            )
          }
        )}
      </div>
      {notice ? (
        <p role="status" className="mt-3 text-center text-sm font-semibold">
          Finish level {notice} to unlock this one.
        </p>
      ) : null}
      <div className="mt-4 rounded-2xl border border-border bg-card p-4">
        <Overline>
          Level {current}
          {current === 6 ? " · Bonus" : ""}
        </Overline>
        <p className="font-display mt-1 text-lg font-extrabold">
          10 questions · 3 lives
        </p>
        <p className="mt-1 text-sm text-muted-foreground">{info?.blurb}</p>
      </div>
    </main>
  )
}
