import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Faxi } from "@/components/faxi"
import { GameButton } from "@/components/game-button"
import { PlayerAvatar } from "@/components/player-avatar"
import { Overline } from "@/components/shell"
import { useTheme } from "@/components/theme-provider"
import { Input } from "@/components/ui/input"
import { useHydrated } from "@/hooks/use-hydrated"
import { defaultAvatar } from "@/lib/avatar"
import {
  formatUnlockDate,
  usernameChangeAllowed,
  usernameProblem,
  usernameUnlocksAt,
} from "@/lib/username"
import { usePlayer, useSession, playerLevel } from "@/store/player"
import { cn } from "cn"

const themes = [
  { id: "system", label: "Device" },
  { id: "dark", label: "Dark" },
  { id: "light", label: "Light" },
] as const

export function Profile() {
  const navigate = useNavigate()
  const { theme, setTheme } = useTheme()
  const { account, profile, email } = useSession()
  const changeUsername = usePlayer((state) => state.changeUsername)
  const hydrated = useHydrated()
  const [username, setUsername] = useState("")
  const [usernameError, setUsernameError] = useState<string | null>(null)
  const [usernameBusy, setUsernameBusy] = useState(false)
  const unlocks = usernameUnlocksAt(account?.usernameChangedAt ?? null)
  const canChange = usernameChangeAllowed(account?.usernameChangedAt ?? null)
  const clears = Object.values(profile.paths).reduce(
    (sum, path) => sum + path.completed.length,
    0
  )

  useEffect(() => {
    if (hydrated && !email) navigate("/start", { replace: true })
  }, [email, hydrated, navigate])

  async function saveUsername() {
    const next = username.trim().toLowerCase()
    const problem = usernameProblem(next)
    if (problem) {
      setUsernameError(problem)
      return
    }
    if (next === account?.username) {
      setUsernameError("That's already your username.")
      return
    }
    setUsernameBusy(true)
    setUsernameError(null)
    const failed = await changeUsername(next)
    setUsernameBusy(false)
    if (failed) {
      setUsernameError(failed)
      return
    }
    setUsername("")
  }

  if (!hydrated || !email) return <main className="min-h-svh" />

  return (
    <main className="flex flex-col gap-4 px-5 pt-6">
      <div className="flex items-center gap-3">
        <PlayerAvatar avatar={account?.avatar ?? defaultAvatar} className="h-16 w-16 shrink-0" />
        <div className="min-w-0">
          <Overline>You</Overline>
          <h1 className="font-display truncate text-[28px] font-extrabold">
            {account?.firstName ?? "Explorer"}
          </h1>
          <p className="truncate text-sm font-semibold">@{account?.username}</p>
          <p className="truncate text-sm text-muted-foreground">{account?.email}</p>
        </div>
      </div>
      <dl className="grid grid-cols-3 gap-2">
        <Stat label="Level" value={String(playerLevel(profile.xp))} />
        <Stat label="XP" value={String(profile.xp)} />
        <Stat label="Clears" value={String(clears)} />
      </dl>
      <section className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
        <Faxi pose="achievement" alt="" className="h-16 w-16 shrink-0" />
        <div>
          <Overline>Latest badge</Overline>
          <p className="font-display text-lg font-extrabold">{profile.badge}</p>
        </div>
      </section>
      <section className="rounded-2xl border border-border bg-card p-4">
        <Overline>Username</Overline>
        {canChange ? (
          <>
            <p className="mt-2 text-sm text-muted-foreground">
              You can change your username now. The next change waits three months.
            </p>
            <Input
              value={username}
              onChange={(event) => setUsername(event.target.value.toLowerCase())}
              aria-label="Username"
              placeholder="Username"
              autoComplete="username"
              className="mt-3 h-[52px] rounded-[14px] border-2 bg-background px-3 text-base"
            />
            {usernameError ? (
              <p role="alert" className="mt-2 text-sm font-semibold text-wrong">
                {usernameError}
              </p>
            ) : null}
            <GameButton
              type="button"
              className="mt-3"
              disabled={usernameBusy}
              onClick={() => void saveUsername()}
            >
              {usernameBusy ? "Saving…" : "Save username"}
            </GameButton>
          </>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            You can change your username again on {unlocks ? formatUnlockDate(unlocks) : "a later date"}.
          </p>
        )}
      </section>
      <GameButton variant="ghost" onClick={() => navigate("/avatar")}>
        Create avatar
      </GameButton>
      <section>
        <Overline>Appearance</Overline>
        <div className="mt-2 grid grid-cols-3 gap-2 rounded-2xl bg-card p-1" role="group" aria-label="Colour mode">
          {themes.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={theme === item.id}
              onClick={() => setTheme(item.id)}
              className={cn(
                "min-h-11 rounded-xl text-sm font-extrabold",
                theme === item.id ? "bg-lime text-ink" : "text-muted-foreground"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Dark matches the game artboards. Light keeps the same lime and cyan jobs on an ivory page.
        </p>
      </section>
      <section className="rounded-2xl border border-border bg-card p-4">
        <Overline>On this device</Overline>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          The colour mode stays on this phone. Your account, progress, and feedback are saved with your email.
        </p>
      </section>
      {account?.isAdmin ? (
        <GameButton variant="ghost" onClick={() => navigate("/admin")}>
          Open admin
        </GameButton>
      ) : null}
      <GameButton variant="ghost" onClick={() => navigate("/feedback")}>
        Send feedback
      </GameButton>
      <GameButton variant="ghost" onClick={() => navigate("/sign-out")}>
        Sign out
      </GameButton>
    </main>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <dt className="text-[11px] font-bold tracking-[0.08em] text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="font-display text-xl font-extrabold">{value}</dd>
    </div>
  )
}
