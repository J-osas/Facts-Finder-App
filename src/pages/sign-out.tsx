import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Faxi } from "@/components/faxi"
import { GameButton } from "@/components/game-button"
import { useHydrated } from "@/hooks/use-hydrated"
import { usePlayer } from "@/store/player"

export function SignOutScreen() {
  const navigate = useNavigate()
  const hydrated = useHydrated()
  const email = usePlayer((state) => state.account?.email ?? null)
  const signOut = usePlayer((state) => state.signOut)

  useEffect(() => {
    if (hydrated && !email) navigate("/auth?mode=login", { replace: true })
  }, [email, hydrated, navigate])

  if (!hydrated || !email) return <main className="min-h-svh" />

  return (
    <main className="flex min-h-svh flex-col px-5 pt-16 pb-8">
      <div className="flex flex-col items-center text-center">
        <Faxi pose="supportive" alt="Faxi waving gently" className="h-40 w-40" />
        <h1 className="font-display mt-6 text-[32px] leading-tight font-extrabold">
          Are you sure you want to log out?
        </h1>
        <p className="mt-3 max-w-xs text-[15px] leading-relaxed text-muted-foreground">
          Your progress stays with this account. Log back in with the same email.
        </p>
      </div>
      <div className="mt-auto flex flex-col gap-3 pt-8">
        <GameButton
          onClick={() => {
            void signOut().then(() => navigate("/auth?mode=login", { replace: true }))
          }}
        >
          Log out
        </GameButton>
        <GameButton variant="ghost" onClick={() => navigate("/profile")}>
          Stay
        </GameButton>
      </div>
    </main>
  )
}
