import { useCallback, useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Faxi } from "@/components/faxi"
import { GameButton } from "@/components/game-button"
import { PlayerAvatar } from "@/components/player-avatar"
import { Overline } from "@/components/shell"
import { SignUpPrompt } from "@/components/sign-up-prompt"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PATHS, type PathId } from "@/data/questions"
import { useRequireAccount } from "@/hooks/use-require-account"
import { loadFriends, loadRequests, type Friend } from "@/lib/friends"
import {
  closesIn,
  codeLooksComplete,
  createRoom,
  isOpen,
  loadMyRooms,
  normalizeCode,
  pathTitle,
  type RoomSummary,
} from "@/lib/rooms"
import { playerLevel } from "@/store/player"
import { cn } from "cn"

const smallButton =
  "min-h-11 rounded-full border border-border px-4 text-sm font-bold disabled:opacity-40"

export function Compete() {
  const navigate = useNavigate()
  const { ready, guest } = useRequireAccount({ guestPrompt: true })
  const [path, setPath] = useState<PathId>("general")
  const [count, setCount] = useState<5 | 10>(10)
  const [code, setCode] = useState("")
  const [rooms, setRooms] = useState<RoomSummary[]>([])
  const [friends, setFriends] = useState<Friend[]>([])
  const [incoming, setIncoming] = useState(0)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    const [roomResult, friendResult, requestResult] = await Promise.all([
      loadMyRooms(),
      loadFriends(),
      loadRequests(),
    ])
    if (roomResult.data) setRooms(roomResult.data)
    if (friendResult.data) setFriends(friendResult.data)
    if (requestResult.data) {
      setIncoming(requestResult.data.filter((item) => item.direction === "incoming").length)
    }
    setError(roomResult.error ?? friendResult.error ?? requestResult.error)
  }, [])

  useEffect(() => {
    if (!ready) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh()
    const onFocus = () => void refresh()
    window.addEventListener("focus", onFocus)
    return () => window.removeEventListener("focus", onFocus)
  }, [ready, refresh])

  async function create(invite: Friend | null) {
    if (busy) return
    setBusy(invite ? invite.id : "create")
    setError(null)
    const result = await createRoom(invite ? "general" : path, invite ? 10 : count, invite?.id ?? null)
    setBusy(null)
    if (!result.data) {
      setError(result.error)
      return
    }
    navigate(`/room/${result.data.code}`)
  }

  function join() {
    setError(null)
    if (!codeLooksComplete(code)) {
      setError("A room code has 6 letters and numbers.")
      return
    }
    navigate(`/join/${normalizeCode(code)}`)
  }

  if (guest) {
    return (
      <SignUpPrompt
        title="Sign up to play with friends"
        body="Rooms, friends and the leaderboard need an account. Your progress so far comes with you."
        returnTo="/compete"
      />
    )
  }

  if (!ready) return <main className="min-h-svh" />

  return (
    <main className="flex flex-col gap-4 px-5 pt-6 pb-6">
      <div className="flex items-center gap-3">
        <Faxi pose="playing" alt="" className="h-16 w-16 shrink-0" />
        <div>
          <Overline>Together</Overline>
          <h1 className="font-display text-[28px] font-extrabold">Compete</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Same questions for everyone. Play when you like.
          </p>
        </div>
      </div>

      {error ? (
        <p role="alert" className="text-sm font-semibold text-wrong">
          {error}
        </p>
      ) : null}

      <Card className="gap-3 rounded-2xl border-2 border-cyan bg-card p-4 ring-0">
        <p className="font-display text-xl font-extrabold">Host a room</p>
        <div role="group" aria-label="Topic" className="grid grid-cols-3 gap-2">
          {PATHS.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={path === item.id}
              onClick={() => setPath(item.id)}
              className={cn(
                "min-h-11 rounded-xl border-2 px-1 text-sm font-extrabold",
                path === item.id
                  ? "border-transparent bg-lime text-ink"
                  : "border-border text-muted-foreground"
              )}
            >
              {item.id === "general" ? "General" : item.title}
            </button>
          ))}
        </div>
        <div role="group" aria-label="Length" className="grid grid-cols-2 gap-2">
          {([5, 10] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={count === value}
              onClick={() => setCount(value)}
              className={cn(
                "min-h-11 rounded-xl border-2 text-sm font-extrabold",
                count === value
                  ? "border-transparent bg-lime text-ink"
                  : "border-border text-muted-foreground"
              )}
            >
              {value === 5 ? "Quick · 5 questions" : "Full · 10 questions"}
            </button>
          ))}
        </div>
        <GameButton disabled={busy !== null} onClick={() => void create(null)}>
          {busy === "create" ? "Making your room…" : "Create room"}
        </GameButton>
        <p className="text-xs text-muted-foreground">
          You get a code and a link to send. The room closes after 48 hours.
        </p>
      </Card>

      <Card className="gap-3 rounded-2xl border border-border bg-card p-4 ring-0">
        <p className="font-display text-xl font-extrabold">Join with a code</p>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="room-code">Room code</Label>
          <Input
            id="room-code"
            value={code}
            maxLength={9}
            autoCapitalize="characters"
            autoCorrect="off"
            onChange={(event) => setCode(normalizeCode(event.target.value))}
            onKeyDown={(event) => {
              if (event.key === "Enter") join()
            }}
            placeholder="6 characters"
            className="h-[52px] rounded-[14px] border-2 bg-card px-3 text-base tracking-[0.2em] uppercase"
          />
        </div>
        <GameButton variant="ghost" onClick={join}>
          Join
        </GameButton>
      </Card>

      <section>
        <Overline>Your rooms</Overline>
        {rooms.length === 0 ? (
          <p className="mt-2 rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
            No rooms yet. Host one, or join with a code from a friend.
          </p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {rooms.map((room) => (
              <li key={room.code}>
                <button
                  type="button"
                  onClick={() => navigate(`/room/${room.code}`)}
                  className="flex w-full items-center justify-between gap-3 rounded-2xl border border-border bg-card px-3 py-3 text-left"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">
                      {room.invitedByName && !room.started
                        ? `Challenge from ${room.invitedByName}`
                        : `${room.hostName}'s room`}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {pathTitle(room.path)} · {room.questionCount} questions · {room.playerCount}{" "}
                      {room.playerCount === 1 ? "player" : "players"}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {room.code} · {closesIn(room.expiresAt)}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "shrink-0 rounded-full border px-3 py-1 text-xs font-extrabold",
                      !room.finished && isOpen(room.expiresAt)
                        ? "border-cyan text-cyan"
                        : "border-border text-muted-foreground"
                    )}
                  >
                    {room.finished
                      ? `${room.myPoints ?? 0} pts`
                      : !isOpen(room.expiresAt)
                        ? "Closed"
                        : room.started
                          ? "Left early"
                          : "Your turn"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between">
          <Overline>Friends</Overline>
          <button type="button" className={smallButton} onClick={() => navigate("/friends")}>
            {incoming > 0 ? `Add and manage · ${incoming} new` : "Add and manage"}
          </button>
        </div>
        {friends.length === 0 ? (
          <p className="mt-2 rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
            Add a friend by username to challenge them to a room.
          </p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {friends.map((friend) => (
              <li
                key={friend.id}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card px-3 py-2"
              >
                <PlayerAvatar avatar={friend.avatar} className="h-10 w-10 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{friend.firstName}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    @{friend.username} · Level {playerLevel(friend.xp)}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busy !== null}
                  className={smallButton}
                  onClick={() => void create(friend)}
                >
                  {busy === friend.id ? "Making room…" : "Challenge"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-center text-xs text-muted-foreground">
        Live duels, where you both answer at the same moment, come later.
      </p>
    </main>
  )
}
