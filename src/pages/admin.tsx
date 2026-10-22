import { useCallback, useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { GameButton } from "@/components/game-button"
import { Overline } from "@/components/shell"
import {
  downloadText,
  loadNotes,
  loadPlayers,
  notesToCsv,
  signedAudioUrl,
  type AdminNote,
  type AdminPlayer,
} from "@/lib/admin"
import { requestTranscript } from "@/lib/feedback"
import { useHydrated } from "@/hooks/use-hydrated"
import { playerLevel, usePlayer } from "@/store/player"
import { cn } from "cn"

type View = "feedback" | "players"

const statusLabel: Record<AdminNote["status"], string> = {
  none: "Typed",
  browser: "Spoken, written by the phone",
  pending: "Waiting for a transcript",
  done: "Transcribed",
  failed: "Transcript failed",
}

function when(value: string) {
  return new Date(value).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function daysSince(date: string | null) {
  if (!date) return null
  const then = new Date(`${date}T00:00:00`).getTime()
  return Math.floor((Date.now() - then) / 86_400_000)
}

export function Admin() {
  const navigate = useNavigate()
  const hydrated = useHydrated()
  const account = usePlayer((state) => state.account)
  const [view, setView] = useState<View>("feedback")
  const [players, setPlayers] = useState<AdminPlayer[]>([])
  const [notes, setNotes] = useState<AdminNote[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [playing, setPlaying] = useState<{ id: string; url: string } | null>(null)
  const [audioError, setAudioError] = useState<string | null>(null)
  const [working, setWorking] = useState<string | null>(null)

  const isAdmin = Boolean(account?.isAdmin)

  const refresh = useCallback(async () => {
    setLoading(true)
    const [playerResult, noteResult] = await Promise.all([loadPlayers(), loadNotes()])
    setPlayers(playerResult.rows)
    setNotes(noteResult.rows)
    setError(playerResult.error ?? noteResult.error)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (hydrated && !account) navigate("/auth?mode=login", { replace: true })
  }, [account, hydrated, navigate])

  useEffect(() => {
    if (!hydrated || !isAdmin) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh()
  }, [hydrated, isAdmin, refresh])

  const stats = useMemo(() => {
    const rated = notes.filter((note) => note.rating > 0)
    const average = rated.length
      ? rated.reduce((total, note) => total + note.rating, 0) / rated.length
      : null
    const active = players.filter((player) => {
      const age = daysSince(player.lastPlayedDate)
      return age !== null && age <= 7
    }).length
    const clears = players.reduce((total, player) => total + player.clears, 0)
    return { average, active, clears }
  }, [notes, players])

  async function transcribe(note: AdminNote) {
    setAudioError(null)
    setWorking(note.id)
    const ok = await requestTranscript(note.id)
    if (!ok) {
      setAudioError(
        "The transcript could not be made. Check that the transcribe-feedback function is deployed and has its key."
      )
    }
    await refresh()
    setWorking(null)
  }

  async function play(note: AdminNote) {
    if (!note.audioPath) return
    setAudioError(null)
    if (playing?.id === note.id) {
      setPlaying(null)
      return
    }
    const url = await signedAudioUrl(note.audioPath)
    if (!url) {
      setAudioError("That voice file could not be opened.")
      return
    }
    setPlaying({ id: note.id, url })
  }

  if (!hydrated || !account) return <main className="min-h-svh bg-background" />

  if (!isAdmin) {
    return (
      <main className="mx-auto flex min-h-svh max-w-md flex-col justify-center gap-4 bg-background px-5">
        <h1 className="font-display text-2xl font-extrabold">This page is private</h1>
        <p className="text-sm text-muted-foreground">
          Only the person who runs Facts-Finder can open the admin screen.
        </p>
        <GameButton onClick={() => navigate("/home")}>Back to the game</GameButton>
      </main>
    )
  }

  return (
    <main className="min-h-svh bg-background px-4 pt-6 pb-16 text-foreground">
      <div className="mx-auto flex max-w-5xl flex-col gap-5">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <Overline>Admin</Overline>
            <h1 className="font-display text-[28px] font-extrabold">What people are saying</h1>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void refresh()}
              className="min-h-11 rounded-xl border-2 border-border px-4 text-sm font-extrabold"
            >
              {loading ? "Loading…" : "Refresh"}
            </button>
            <button
              type="button"
              onClick={() => navigate("/home")}
              className="min-h-11 rounded-xl border-2 border-border px-4 text-sm font-extrabold"
            >
              Back to game
            </button>
          </div>
        </header>

        {error ? (
          <p role="alert" className="rounded-xl border border-wrong p-3 text-sm font-semibold text-wrong">
            {error}
          </p>
        ) : null}

        <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Players" value={String(players.length)} />
          <Stat label="Played this week" value={String(stats.active)} />
          <Stat label="Levels cleared" value={String(stats.clears)} />
          <Stat
            label="Average rating"
            value={stats.average === null ? "No ratings" : `${stats.average.toFixed(1)} / 5`}
          />
        </dl>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="grid grid-cols-2 gap-1 rounded-2xl bg-card p-1" role="group" aria-label="View">
            {(["feedback", "players"] as const).map((item) => (
              <button
                key={item}
                type="button"
                aria-pressed={view === item}
                onClick={() => setView(item)}
                className={cn(
                  "min-h-11 rounded-xl px-5 text-sm font-extrabold capitalize",
                  view === item ? "bg-lime text-ink" : "text-muted-foreground"
                )}
              >
                {item === "feedback" ? `Feedback (${notes.length})` : `Players (${players.length})`}
              </button>
            ))}
          </div>
          {view === "feedback" ? (
            <button
              type="button"
              disabled={notes.length === 0}
              onClick={() => downloadText("facts-finder-feedback.csv", notesToCsv(notes))}
              className="min-h-11 rounded-xl border-2 border-border px-4 text-sm font-extrabold disabled:opacity-40"
            >
              Download as spreadsheet
            </button>
          ) : null}
        </div>

        {audioError ? (
          <p role="alert" className="text-sm font-semibold text-wrong">
            {audioError}
          </p>
        ) : null}

        {view === "feedback" ? (
          notes.length === 0 ? (
            <Empty>{loading ? "Loading notes…" : "No feedback yet. Send the link and wait for the first one."}</Empty>
          ) : (
            <ul className="flex flex-col gap-3">
              {notes.map((note) => (
                <li key={note.id} className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-display text-lg font-extrabold">
                      {note.firstName ?? "Anonymous"}
                      {note.username ? (
                        <span className="ml-2 text-sm font-semibold text-muted-foreground">
                          @{note.username}
                        </span>
                      ) : null}
                    </p>
                    <p className="text-sm font-semibold text-muted-foreground">{when(note.createdAt)}</p>
                  </div>
                  {note.email ? (
                    <p className="text-xs text-muted-foreground">{note.email}</p>
                  ) : null}
                  <p className="mt-2 text-sm font-extrabold">
                    Rating {note.rating} / 5
                    <span className="ml-3 text-xs font-semibold text-muted-foreground">
                      {note.audioPath && !note.body ? "Voice only" : statusLabel[note.status]}
                    </span>
                  </p>
                  {note.body ? (
                    <p className="mt-2 text-[15px] leading-relaxed whitespace-pre-wrap">{note.body}</p>
                  ) : (
                    <p className="mt-2 text-sm text-muted-foreground">No text with this note.</p>
                  )}
                  {note.audioPath ? (
                    <div className="mt-3 flex flex-col gap-2">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => void play(note)}
                          className="min-h-11 rounded-xl border-2 border-border px-4 text-sm font-extrabold"
                        >
                          {playing?.id === note.id ? "Hide voice note" : "Play voice note"}
                        </button>
                        {!note.body && (note.status === "pending" || note.status === "failed") ? (
                          <button
                            type="button"
                            disabled={working === note.id}
                            onClick={() => void transcribe(note)}
                            className="min-h-11 rounded-xl border-2 border-cyan px-4 text-sm font-extrabold disabled:opacity-40"
                          >
                            {working === note.id ? "Working…" : "Make transcript"}
                          </button>
                        ) : null}
                      </div>
                      {playing?.id === note.id ? (
                        <audio controls autoPlay src={playing.url} className="w-full" />
                      ) : null}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )
        ) : players.length === 0 ? (
          <Empty>{loading ? "Loading players…" : "Nobody has joined yet."}</Empty>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-card text-xs tracking-[0.08em] text-muted-foreground uppercase">
                <tr>
                  <th className="p-3 font-bold">Player</th>
                  <th className="p-3 font-bold">Joined</th>
                  <th className="p-3 font-bold">Level</th>
                  <th className="p-3 font-bold">XP</th>
                  <th className="p-3 font-bold">Cleared</th>
                  <th className="p-3 font-bold">Streak</th>
                  <th className="p-3 font-bold">Last played</th>
                </tr>
              </thead>
              <tbody>
                {players.map((player) => (
                  <tr key={player.id} className="border-t border-border">
                    <td className="p-3">
                      <p className="font-extrabold">
                        {player.firstName} {player.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        @{player.username} · {player.email}
                      </p>
                    </td>
                    <td className="p-3">{when(player.createdAt)}</td>
                    <td className="p-3">{playerLevel(player.xp)}</td>
                    <td className="p-3">{player.xp}</td>
                    <td className="p-3">{player.clears}</td>
                    <td className="p-3">{player.streak}</td>
                    <td className="p-3">{player.lastPlayedDate ?? "Not yet"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <dt className="text-[11px] font-bold tracking-[0.08em] text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="font-display text-2xl font-extrabold">{value}</dd>
    </div>
  )
}

function Empty({ children }: { children: string }) {
  return (
    <p className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
      {children}
    </p>
  )
}
