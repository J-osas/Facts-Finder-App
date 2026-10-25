import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { GameButton } from "@/components/game-button"
import { PlayerAvatar } from "@/components/player-avatar"
import { SignUpPrompt } from "@/components/sign-up-prompt"
import { useHydrated } from "@/hooks/use-hydrated"
import {
  avatarColors,
  portraits,
  type AvatarChoice,
  type AvatarColor,
  type PortraitId,
} from "@/lib/avatar"
import { usePlayer, useSession } from "@/store/player"
import { cn } from "cn"

const portraitLabels: Record<PortraitId, string> = {
  fox: "Fox",
  owl: "Owl",
  bear: "Bear",
  cat: "Cat",
  panda: "Panda",
  lion: "Lion",
  rabbit: "Rabbit",
  penguin: "Penguin",
}

export function AvatarScreen() {
  const navigate = useNavigate()
  const hydrated = useHydrated()
  const { account, canPlay, guest } = useSession()
  const saveAvatar = usePlayer((state) => state.saveAvatar)
  const [choice, setChoice] = useState<AvatarChoice | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const avatar = choice ?? account?.avatar

  useEffect(() => {
    if (hydrated && !canPlay) navigate("/start", { replace: true })
  }, [canPlay, hydrated, navigate])

  if (hydrated && guest) {
    return (
      <SignUpPrompt
        title="Sign up to make an avatar"
        body="Your avatar belongs to your account. Your progress so far comes with you."
        returnTo="/avatar"
      />
    )
  }

  if (!hydrated || !account || !avatar) return <main className="min-h-svh" />

  function pickPortrait(portrait: PortraitId) {
    setChoice({ portrait, color: avatar?.color ?? "cyan" })
  }

  function pickColor(color: AvatarColor) {
    setChoice({ portrait: avatar?.portrait ?? "fox", color })
  }

  async function save() {
    if (!choice || busy) return
    setBusy(true)
    setError(null)
    const problem = await saveAvatar(choice)
    setBusy(false)
    if (problem) {
      setError(problem)
      return
    }
    navigate("/profile")
  }

  return (
    <main className="flex min-h-svh flex-col px-5 pt-6 pb-8">
      <button
        type="button"
        className="self-start text-sm font-semibold text-[var(--cyan-ink)]"
        onClick={() => navigate("/profile")}
      >
        Back
      </button>
      <h1 className="font-display mt-4 text-[28px] font-extrabold">Create avatar</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Pick a portrait and a colour. This picture is yours. Faxi stays the guide.
      </p>
      <div className="mt-6 flex justify-center">
        <PlayerAvatar avatar={avatar} className="h-36 w-36" />
      </div>
      <div className="mt-6 grid grid-cols-4 gap-2" role="listbox" aria-label="Portrait">
        {portraits.map((portrait) => (
          <button
            key={portrait}
            type="button"
            aria-label={portraitLabels[portrait]}
            aria-selected={avatar.portrait === portrait}
            onClick={() => pickPortrait(portrait)}
            className={cn(
              "rounded-2xl border-2 bg-card p-1",
              avatar.portrait === portrait ? "border-lime" : "border-transparent"
            )}
          >
            <PlayerAvatar avatar={{ portrait, color: avatar.color }} className="h-full w-full" />
          </button>
        ))}
      </div>
      <div className="mt-4 flex justify-between gap-2" role="listbox" aria-label="Colour">
        {(Object.keys(avatarColors) as AvatarColor[]).map((color) => (
          <button
            key={color}
            type="button"
            aria-label={color}
            aria-selected={avatar.color === color}
            onClick={() => pickColor(color)}
            className={cn(
              "h-11 flex-1 rounded-full border-2",
              avatar.color === color ? "border-foreground" : "border-transparent"
            )}
            style={{ background: avatarColors[color] }}
          />
        ))}
      </div>
      {error ? (
        <p role="alert" className="mt-3 text-sm font-semibold text-wrong">
          {error}
        </p>
      ) : null}
      <GameButton type="button" className="mt-auto" disabled={busy || !choice} onClick={() => void save()}>
        {busy ? "Saving…" : "Save avatar"}
      </GameButton>
    </main>
  )
}
