import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Faxi } from "@/components/faxi"
import { GameButton } from "@/components/game-button"
import { Overline } from "@/components/shell"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { PATHS, XP_BAND, type PathId } from "@/data/questions"
import { useHydrated } from "@/hooks/use-hydrated"
import { PlayerAvatar } from "@/components/player-avatar"
import { defaultAvatar } from "@/lib/avatar"
import { currentLevel, playerLevel, usePlayer, useSession } from "@/store/player"
import { todayKey } from "@/data/questions"

export function Home() {
  const navigate = useNavigate()
  const { account, profile, canPlay } = useSession()
  const hydrated = useHydrated()
  const startRound = usePlayer((state) => state.startRound)
  const level = playerLevel(profile.xp)
  const into = profile.xp % XP_BAND
  const generalLevel = currentLevel(profile.paths.general)
  const pathComplete = profile.paths.general.completed.length >= 8
  const dailyDone = profile.dailyClearedOn === todayKey()

  function play(path: PathId, mapLevel: number, mode: "level" | "daily" = "level") {
    startRound(path, mapLevel, mode)
    navigate("/round")
  }

  useEffect(() => {
    if (hydrated && !canPlay) navigate("/start", { replace: true })
  }, [canPlay, hydrated, navigate])

  if (!hydrated || !canPlay) return <main className="min-h-svh" />

  return (
    <main className="flex flex-col gap-4 px-5 pt-6">
      <header className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <PlayerAvatar avatar={account?.avatar ?? defaultAvatar} className="h-12 w-12 shrink-0" />
          <div className="min-w-0">
            <Overline>Good to see you</Overline>
            <h1 className="font-display truncate text-[26px] font-extrabold">
              {account?.firstName ?? "Explorer"}
            </h1>
          </div>
        </div>
        <p className="rounded-full border border-border px-3 py-1 text-xs font-bold">
          {profile.streak > 0 ? `${profile.streak} day streak` : "Start a streak"}
        </p>
      </header>

      <Card className="gap-3 rounded-2xl border border-border bg-card p-4 ring-0">
        <div className="flex items-end justify-between">
          <p className="font-display text-xl font-extrabold">Level {level}</p>
          <p className="text-sm font-semibold text-muted-foreground">
            {into} / {XP_BAND} XP
          </p>
        </div>
        <Progress value={(into / XP_BAND) * 100} className="h-2.5 bg-border" />
        <p className="text-sm text-muted-foreground">
          {pathComplete
            ? "General path complete. Replay any level, or try a topic path."
            : `Next up on the general path: level ${generalLevel}.`}
        </p>
      </Card>

      <div className="flex items-center gap-3 rounded-2xl bg-[var(--faxi-tile)] p-3 text-ink">
        <Faxi pose="welcome" alt="Faxi ready to play" className="h-20 w-20" />
        <p className="text-[15px] leading-snug font-semibold">
          {pathComplete
            ? "You finished the first path. A new fact is still waiting."
            : "Ready when you are. Ten questions, three misses."}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Faxi pose="playing" alt="" className="h-16 w-16 shrink-0" />
        <GameButton
          className="h-[68px] min-w-0 flex-1 text-2xl"
          onClick={() => play("general", generalLevel)}
        >
          Play now
        </GameButton>
      </div>

      <Card className="gap-2 rounded-2xl border-2 border-cyan bg-card p-4 ring-0">
        <div className="flex items-center gap-3">
          <Faxi pose="excited" alt="" className="h-14 w-14 shrink-0" />
          <div>
            <Overline>Daily challenge</Overline>
            <p className="font-display text-xl font-extrabold">Five facts, one sitting</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          {dailyDone ? "Bonus already collected today." : "5 questions · +120 XP"}
        </p>
        <button
          type="button"
          className="mt-1 self-start rounded-full bg-cyan px-4 py-2 text-sm font-extrabold text-ink"
          onClick={() => play("general", generalLevel, "daily")}
        >
          {dailyDone ? "Play again" : "Start"}
        </button>
      </Card>

      <section>
        <Overline>Picked for you</Overline>
        <div className="mt-2 flex flex-wrap gap-2">
          {PATHS.map((path) => (
            <button
              key={path.id}
              type="button"
              className="min-h-11 rounded-full border border-border px-4 text-sm font-bold"
              onClick={() => navigate(`/play?path=${path.id}`)}
            >
              {path.title}
            </button>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 pb-2">
        <Card className="rounded-2xl border border-border bg-card p-3 ring-0">
          <Overline>Last played</Overline>
          <p className="font-display mt-1 text-lg font-extrabold">
            {profile.lastPlayedDate ? profile.lastPlayedDate : "Not yet"}
          </p>
        </Card>
        <Card className="rounded-2xl border border-border bg-card p-3 ring-0">
          <Overline>Latest badge</Overline>
          <p className="font-display mt-1 text-lg font-extrabold">{profile.badge}</p>
        </Card>
      </section>
    </main>
  )
}
