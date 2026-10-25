import { useNavigate } from "react-router-dom"
import { Faxi } from "@/components/faxi"
import { GameButton } from "@/components/game-button"
import { rememberNext } from "@/lib/next"

// Shown to a guest on a screen that needs an account. After they sign up or
// log in they come back to returnTo, and the progress they made is kept.
export function SignUpPrompt({
  title,
  body,
  returnTo,
}: {
  title: string
  body: string
  returnTo: string
}) {
  const navigate = useNavigate()

  function go(mode: "signup" | "login") {
    rememberNext(returnTo)
    navigate(`/auth?mode=${mode}`)
  }

  return (
    <main className="flex min-h-svh flex-col items-center px-6 pt-10 pb-8 text-center">
      <Faxi pose="encouraging" alt="" className="h-28 w-28" />
      <h1 className="font-display mt-4 text-[28px] leading-tight font-extrabold">{title}</h1>
      <p className="mt-3 max-w-xs text-[15px] leading-relaxed text-muted-foreground">{body}</p>
      <div className="mt-auto flex w-full flex-col gap-3 pt-8">
        <GameButton onClick={() => go("signup")}>Create account</GameButton>
        <GameButton variant="ghost" onClick={() => go("login")}>
          I already have an account
        </GameButton>
      </div>
    </main>
  )
}
