import { useCallback, useEffect, useState, type FormEvent } from "react"
import { useNavigate } from "react-router-dom"
import { Faxi } from "@/components/faxi"
import { GameButton } from "@/components/game-button"
import { PlayerAvatar } from "@/components/player-avatar"
import { Overline } from "@/components/shell"
import { SignUpPrompt } from "@/components/sign-up-prompt"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRequireAccount } from "@/hooks/use-require-account"
import {
  findPlayer,
  loadFriends,
  loadRequests,
  removeFriend,
  respondToRequest,
  sendFriendRequest,
  type FoundPlayer,
  type Friend,
  type FriendRequest,
} from "@/lib/friends"
import { playerLevel } from "@/store/player"

const smallButton =
  "min-h-11 rounded-full border border-border px-4 text-sm font-bold disabled:opacity-40"

export function Friends() {
  const navigate = useNavigate()
  const { ready, guest } = useRequireAccount({ guestPrompt: true })
  const [friends, setFriends] = useState<Friend[]>([])
  const [requests, setRequests] = useState<FriendRequest[]>([])
  const [query, setQuery] = useState("")
  const [found, setFound] = useState<FoundPlayer | null>(null)
  const [searched, setSearched] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    const [friendResult, requestResult] = await Promise.all([loadFriends(), loadRequests()])
    if (friendResult.data) setFriends(friendResult.data)
    if (requestResult.data) setRequests(requestResult.data)
    setError(friendResult.error ?? requestResult.error)
  }, [])

  useEffect(() => {
    if (!ready) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh()
  }, [ready, refresh])

  async function search(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setMessage(null)
    setError(null)
    setFound(null)
    const result = await findPlayer(query)
    setBusy(false)
    setSearched(true)
    if (result.error) {
      setError(result.error)
      return
    }
    setFound(result.data)
  }

  async function add(player: FoundPlayer) {
    setBusy(true)
    setError(null)
    const result = await sendFriendRequest(player.id)
    setBusy(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setMessage(
      result.data === "accepted"
        ? `You and ${player.firstName} are now friends.`
        : result.data === "already"
          ? `You are already friends with ${player.firstName}.`
          : `Request sent to ${player.firstName}.`
    )
    setFound(null)
    setQuery("")
    setSearched(false)
    await refresh()
  }

  async function answer(request: FriendRequest, accept: boolean) {
    setBusy(true)
    setError(null)
    const problem = await respondToRequest(request.requestId, accept)
    setBusy(false)
    if (problem) setError(problem)
    else setMessage(accept ? `You and ${request.firstName} are now friends.` : "Request declined.")
    await refresh()
  }

  async function drop(id: string, name: string, label: string) {
    if (!window.confirm(label)) return
    setBusy(true)
    setError(null)
    const problem = await removeFriend(id)
    setBusy(false)
    if (problem) setError(problem)
    else setMessage(`${name} was removed.`)
    await refresh()
  }

  if (guest) {
    return (
      <SignUpPrompt
        title="Sign up to add friends"
        body="Friends need an account so they can find you by username. Your progress so far comes with you."
        returnTo="/friends"
      />
    )
  }

  if (!ready) return <main className="min-h-svh" />

  const incoming = requests.filter((request) => request.direction === "incoming")
  const outgoing = requests.filter((request) => request.direction === "outgoing")

  return (
    <main className="flex min-h-svh flex-col gap-4 px-5 pt-6 pb-10">
      <button
        type="button"
        className="self-start text-sm font-semibold text-[var(--cyan-ink)]"
        onClick={() => navigate("/compete")}
      >
        Back
      </button>
      <div className="flex items-center gap-3">
        <Faxi pose="happy" alt="" className="h-16 w-16 shrink-0" />
        <div>
          <Overline>Together</Overline>
          <h1 className="font-display text-[28px] font-extrabold">Friends</h1>
        </div>
      </div>

      <section className="rounded-2xl border border-border bg-card p-4">
        <form onSubmit={(event) => void search(event)} className="flex flex-col gap-2">
          <Label htmlFor="friend-username">Add a friend by username</Label>
          <Input
            id="friend-username"
            value={query}
            onChange={(event) => setQuery(event.target.value.toLowerCase())}
            autoCapitalize="none"
            autoCorrect="off"
            placeholder="Their username"
            className="h-[52px] rounded-[14px] border-2 bg-background px-3 text-base"
          />
          <p className="text-xs text-muted-foreground">
            They find theirs on their Profile, under their name.
          </p>
          <GameButton type="submit" disabled={busy || query.trim().length === 0}>
            Find player
          </GameButton>
        </form>

        {found ? (
          <div className="mt-3 flex items-center gap-3 rounded-2xl border border-border bg-background p-3">
            <PlayerAvatar avatar={found.avatar} className="h-12 w-12 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{found.firstName}</p>
              <p className="truncate text-sm text-muted-foreground">@{found.username}</p>
            </div>
            {found.relation === "friend" ? (
              <span className="text-sm font-bold text-muted-foreground">Friends</span>
            ) : found.relation === "sent" ? (
              <span className="text-sm font-bold text-muted-foreground">Request sent</span>
            ) : (
              <button
                type="button"
                disabled={busy}
                className={smallButton}
                onClick={() => void add(found)}
              >
                {found.relation === "received" ? "Accept" : "Add friend"}
              </button>
            )}
          </div>
        ) : searched && !error ? (
          <p className="mt-3 text-sm text-muted-foreground">
            No player with that username. Check the spelling with them.
          </p>
        ) : null}
      </section>

      {error ? (
        <p role="alert" className="text-sm font-semibold text-wrong">
          {error}
        </p>
      ) : null}
      {message ? (
        <p role="status" className="text-sm font-semibold">
          {message}
        </p>
      ) : null}

      {incoming.length > 0 ? (
        <section>
          <Overline>Wants to be your friend</Overline>
          <ul className="mt-2 flex flex-col gap-2">
            {incoming.map((request) => (
              <li
                key={request.requestId}
                className="flex items-center gap-3 rounded-2xl border border-cyan bg-card px-3 py-2"
              >
                <PlayerAvatar avatar={request.avatar} className="h-10 w-10 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{request.firstName}</p>
                  <p className="truncate text-xs text-muted-foreground">@{request.username}</p>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  className={smallButton}
                  onClick={() => void answer(request, false)}
                >
                  Decline
                </button>
                <button
                  type="button"
                  disabled={busy}
                  className={`${smallButton} border-transparent bg-lime text-ink`}
                  onClick={() => void answer(request, true)}
                >
                  Accept
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {outgoing.length > 0 ? (
        <section>
          <Overline>Waiting for an answer</Overline>
          <ul className="mt-2 flex flex-col gap-2">
            {outgoing.map((request) => (
              <li
                key={request.requestId}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card px-3 py-2"
              >
                <PlayerAvatar avatar={request.avatar} className="h-10 w-10 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{request.firstName}</p>
                  <p className="truncate text-xs text-muted-foreground">@{request.username}</p>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  className={smallButton}
                  onClick={() => void drop(request.id, request.firstName, "Cancel this request?")}
                >
                  Cancel
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <Overline>Your friends</Overline>
        {friends.length === 0 ? (
          <p className="mt-2 rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
            No friends yet. Add someone by username, or send them a room link from Compete.
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
                  disabled={busy}
                  className={smallButton}
                  onClick={() =>
                    void drop(friend.id, friend.firstName, `Remove ${friend.firstName} from your friends?`)
                  }
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
