import { useEffect, useRef, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { Faxi } from "@/components/faxi"
import { GameButton } from "@/components/game-button"
import { useRequireAccount } from "@/hooks/use-require-account"
import { joinRoom, normalizeCode } from "@/lib/rooms"

// The page a shared link opens. Signed-out visitors are sent to sign up and
// come straight back here (see useRequireAccount), then join the room.
export function Join() {
  const navigate = useNavigate()
  const { code = "" } = useParams()
  const { ready } = useRequireAccount()
  const [error, setError] = useState<string | null>(null)
  const started = useRef(false)

  useEffect(() => {
    if (!ready || started.current) return
    started.current = true
    void (async () => {
      const result = await joinRoom(code)
      if (!result.data) {
        setError(result.error)
        return
      }
      navigate(`/room/${result.data.code}`, { replace: true })
    })()
  }, [code, navigate, ready])

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 px-6 text-center">
      <Faxi pose={error ? "supportive" : "running"} alt="" className="h-28 w-28" />
      {error ? (
        <>
          <h1 className="font-display text-2xl font-extrabold">Could not join {normalizeCode(code)}</h1>
          <p role="alert" className="text-sm text-muted-foreground">
            {error}
          </p>
          <GameButton onClick={() => navigate("/compete", { replace: true })}>
            Back to Compete
          </GameButton>
        </>
      ) : (
        <>
          <h1 className="font-display text-2xl font-extrabold">Joining the room…</h1>
          <p className="text-sm text-muted-foreground">Room {normalizeCode(code)}</p>
        </>
      )}
    </main>
  )
}
