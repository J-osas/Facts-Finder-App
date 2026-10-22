import { useState, type FormEvent } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { Faxi } from "@/components/faxi"
import { GameButton } from "@/components/game-button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { takeNext } from "@/lib/next"
import { usePlayer } from "@/store/player"

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const fieldClass = "h-[52px] rounded-[14px] border-2 bg-card px-3 text-base"

const authTabClass =
  "h-full! rounded-xl border-transparent! font-display font-extrabold shadow-none! ring-0! outline-none! transition-none! data-active:bg-lime! data-active:text-ink! dark:data-active:border-transparent! dark:data-active:bg-lime! dark:data-active:text-ink! focus-visible:border-transparent! focus-visible:ring-0! focus-visible:outline-none!"

export function AuthScreen() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const mode = params.get("mode") === "login" ? "login" : "signup"
  const signUp = usePlayer((state) => state.signUp)
  const logIn = usePlayer((state) => state.logIn)

  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  function switchMode(next: "signup" | "login") {
    setError(null)
    setParams({ mode: next })
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    if (mode === "signup" && (firstName.trim().length < 1 || lastName.trim().length < 1)) {
      setError("Add your first and last name.")
      return
    }
    if (!emailPattern.test(email.trim())) {
      setError("That email doesn't look right. Check for typos.")
      return
    }
    if (password.length < 8) {
      setError("Use at least 8 characters for your password.")
      return
    }
    setBusy(true)
    setError(null)
    const problem =
      mode === "signup"
        ? await signUp({ firstName, lastName, email, password })
        : await logIn(email, password)
    setBusy(false)
    if (problem) {
      setError(problem)
      return
    }
    navigate(takeNext() ?? "/home", { replace: true })
  }

  return (
    <main className="flex min-h-svh flex-col px-5 pt-8 pb-8">
      <div className="flex items-center gap-3">
        <Faxi pose="happy" alt="" className="h-16 w-16" />
        <div>
          <h1 className="font-display text-[28px] leading-tight font-extrabold">
            {mode === "signup" ? "Join the adventure" : "Welcome back"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {mode === "signup"
              ? "Your first name is what people see. A username is made for you."
              : "Pick up your path where you left it."}
          </p>
        </div>
      </div>

      <Tabs value={mode} onValueChange={(value) => switchMode(value as "signup" | "login")} className="mt-6">
        <TabsList className="grid h-12! w-full grid-cols-2 items-stretch! rounded-2xl bg-card p-1">
          <TabsTrigger value="signup" className={authTabClass}>
            Sign up
          </TabsTrigger>
          <TabsTrigger value="login" className={authTabClass}>
            Log in
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <form className="mt-4 flex flex-col gap-3" onSubmit={(event) => void submit(event)} noValidate>
        {mode === "signup" ? (
          <>
            <Input
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              autoComplete="given-name"
              aria-label="First name"
              placeholder="First name"
              className={fieldClass}
            />
            <Input
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              autoComplete="family-name"
              aria-label="Last name"
              placeholder="Last name"
              className={fieldClass}
            />
          </>
        ) : null}
        <Input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          aria-label="Email"
          placeholder="Email"
          className={fieldClass}
          aria-invalid={error?.includes("email") || undefined}
        />
        <Input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          aria-label="Password"
          placeholder="Password"
          className={fieldClass}
        />
        {error ? (
          <p role="alert" className="text-sm font-semibold text-wrong">
            {error}
          </p>
        ) : null}
        <GameButton type="submit" className="mt-2" disabled={busy}>
          {busy ? "One moment…" : mode === "signup" ? "Create account" : "Log in"}
        </GameButton>
      </form>
      <p className="mt-4 text-center text-xs leading-relaxed text-muted-foreground">
        Sign in uses your email and password. Progress stays with the account.
      </p>
    </main>
  )
}
