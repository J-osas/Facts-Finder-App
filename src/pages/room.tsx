import { useCallback, useEffect, useState } from "react"
import { useLocation, useNavigate, useParams } from "react-router-dom"
import { Faxi } from "@/components/faxi"
import { GameButton } from "@/components/game-button"
import { PlayerAvatar } from "@/components/player-avatar"
import { Overline } from "@/components/shell"
import { useRequireAccount } from "@/hooks/use-require-account"
import {
  beginRoomRound,
  closesIn,
  getRoom,
  isOpen,
  normalizeCode,
  pathTitle,
  roomLink,
  seconds,
  type RoomPlayer,
  type RoomView,
} from "@/lib/rooms"
import { usePlayer } from "@/store/player"
import { cn } from "cn"

const REFRESH_MS = 10_000

export function Room() {
  const navigate = useNavigate()
  const { code: rawCode = "" } = useParams()
  const code = normalizeCode(rawCode)
  const { ready, userId } = useRequireAccount()
  const startRoomRound = usePlayer((state) => state.startRoomRound)
  const [view, setView] = useState<RoomView | null>(null)
  const [error, setError] = useState<string | null>(null)
  const location = useLocation()
  // The game screen passes a message here after saving a score.
  const [notice, setNotice] = useState<string | null>(
    () => (location.state as { notice?: string } | null)?.notice ?? null
  )
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const result = await getRoom(code)
    if (result.data) {
      setView(result.data)
      setError(null)
      return
    }
    // Not in the room yet: the join page adds them, then brings them back.
    if ("notMember" in result) {
      navigate(`/join/${code}`, { replace: true })
      return
    }
    setError(result.error)
  }, [code, navigate])

  useEffect(() => {
    if (!ready) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load()
    const timer = window.setInterval(() => void load(), REFRESH_MS)
    const onFocus = () => void load()
    window.addEventListener("focus", onFocus)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener("focus", onFocus)
    }
  }, [load, ready])

  async function play() {
    if (!view || busy) return
    setBusy(true)
    setNotice(null)
    const problem = await beginRoomRound(view.room.id)
    if (problem) {
      setBusy(false)
      setNotice(problem)
      await load()
      return
    }
    startRoomRound(view.room)
    navigate("/round")
  }

  async function share() {
    const link = roomLink(code)
    const text = `Join my Facts-Finder room. Code ${code}.`
    if (navigator.share) {
      try {
        await navigator.share({ title: "Facts-Finder room", text, url: link })
        return
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return
      }
    }
    try {
      await navigator.clipboard.writeText(`${text} ${link}`)
      setNotice("Link copied. Paste it into your chat.")
    } catch {
      setNotice(`Send this link: ${link}`)
    }
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code)
      setNotice("Code copied.")
    } catch {
      setNotice(`The code is ${code}.`)
    }
  }

  if (!ready) return <main className="min-h-svh" />

  if (!view) {
    return (
      <main className="flex min-h-svh flex-col gap-4 px-5 pt-6">
        <button
          type="button"
          className="self-start text-sm font-semibold text-[var(--cyan-ink)]"
          onClick={() => navigate("/compete")}
        >
          Back
        </button>
        {error ? (
          <p role="alert" className="text-sm font-semibold text-wrong">
            {error}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">Opening room {code}…</p>
        )}
      </main>
    )
  }

  const { room, players } = view
  const me = players.find((player) => player.userId === userId)
  const open = isOpen(room.expiresAt)
  const finished = players.filter((player) => player.status === "finished")

  return (
    <main className="flex min-h-svh flex-col gap-4 px-5 pt-6 pb-8">
      <button
        type="button"
        className="self-start text-sm font-semibold text-[var(--cyan-ink)]"
        onClick={() => navigate("/compete")}
      >
        Back
      </button>

      <section className="rounded-2xl border-2 border-cyan bg-card p-4 text-center">
        <Overline>Room code</Overline>
        <p className="font-display mt-1 text-[40px] leading-none font-extrabold tracking-[0.18em]">
          {code}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          {pathTitle(room.path)} · {room.questionCount} questions · hosted by {room.hostName}
        </p>
        <p className="text-sm font-semibold">{closesIn(room.expiresAt)}</p>
        {open ? (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <GameButton className="h-12 text-base" onClick={() => void share()}>
              Share link
            </GameButton>
            <GameButton variant="ghost" className="text-base" onClick={() => void copyCode()}>
              Copy code
            </GameButton>
          </div>
        ) : null}
      </section>

      {notice ? (
        <p role="status" className="text-sm font-semibold">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm font-semibold text-wrong">
          {error}
        </p>
      ) : null}

      {me?.status === "waiting" && open ? (
        <div className="flex items-center gap-3">
          <Faxi pose="playing" alt="" className="h-16 w-16 shrink-0" />
          <GameButton className="h-[68px] min-w-0 flex-1 text-2xl" disabled={busy} onClick={() => void play()}>
            {busy ? "Getting ready…" : "Play now"}
          </GameButton>
        </div>
      ) : null}
      {me?.status === "waiting" && open ? (
        <p className="-mt-2 text-xs text-muted-foreground">
          One attempt per room. Everyone gets the same {room.questionCount} questions, and the
          speed of your answers counts.
        </p>
      ) : null}
      {me?.status === "playing" ? (
        <p className="rounded-2xl border border-border bg-card p-3 text-sm text-muted-foreground">
          You started this room but did not finish, and each room allows one attempt.
        </p>
      ) : null}
      {me?.status === "waiting" && !open ? (
        <p className="rounded-2xl border border-border bg-card p-3 text-sm text-muted-foreground">
          This room has closed. You can still see how everyone did.
        </p>
      ) : null}
      {me?.status === "finished" ? (
        <div className="flex items-center gap-3 rounded-2xl bg-[var(--faxi-tile)] p-3 text-ink">
          <Faxi pose={me.position === 1 ? "celebrating" : "cheerful"} alt="" className="h-16 w-16 shrink-0" />
          <p className="text-[15px] leading-snug font-semibold">
            {me.position === 1
              ? finished.length > 1
                ? "You are in first place."
                : "You are first so far. Send the link and wait for challengers."
              : `You are in place ${me.position} of ${finished.length} so far.`}
          </p>
        </div>
      ) : null}

      <section>
        <Overline>Leaderboard</Overline>
        <ul className="mt-2 flex flex-col gap-2">
          {players.map((player) => (
            <Row
              key={player.userId}
              player={player}
              isMe={player.userId === userId}
              total={room.questionCount}
            />
          ))}
        </ul>
        <p className="mt-2 text-xs text-muted-foreground">
          Ranked by points, then by total time. It refreshes while you are here.
        </p>
      </section>
    </main>
  )
}

function Row({ player, isMe, total }: { player: RoomPlayer; isMe: boolean; total: number }) {
  const done = player.status === "finished"
  return (
    <li
      className={cn(
        "flex items-center gap-3 rounded-2xl border bg-card px-3 py-2",
        isMe ? "border-cyan" : "border-border"
      )}
    >
      <span
        className={cn(
          "font-display grid size-8 shrink-0 place-items-center rounded-full text-sm font-extrabold",
          done && player.position === 1 ? "bg-lime text-ink" : "text-muted-foreground"
        )}
        aria-label={done ? `Place ${player.position}` : "Not finished"}
      >
        {done ? player.position : "–"}
      </span>
      <PlayerAvatar avatar={player.avatar} className="h-10 w-10 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">
          {player.firstName}
          {isMe ? " (you)" : ""}
          {player.isHost ? " · host" : ""}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {done
            ? `${player.correct} of ${total} right · ${seconds(player.totalTimeMs)}`
            : player.status === "playing"
              ? "Started, not finished"
              : player.invited
                ? "Challenged, has not played yet"
                : "Has not played yet"}
        </p>
      </div>
      {done ? (
        <p className="font-display text-lg font-extrabold text-[#6E9E1C] dark:text-lime">
          {player.points}
        </p>
      ) : null}
    </li>
  )
}
