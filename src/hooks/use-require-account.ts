import { useEffect } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { rememberNext } from "@/lib/next"
import { usePlayer } from "@/store/player"

// For pages that need an account. Signed-out visitors are sent to Get started,
// and after they sign up or log in they come back to this same page.
//
// With guestPrompt, a guest stays on the page instead, and the page shows its
// own "Sign up to play with friends" message (guest comes back true).
export function useRequireAccount(options: { guestPrompt?: boolean } = {}) {
  const navigate = useNavigate()
  const location = useLocation()
  const ready = usePlayer((state) => state.authReady)
  const userId = usePlayer((state) => state.account?.id ?? null)
  const isGuest = usePlayer((state) => state.guest)
  const guest = isGuest && userId === null
  const stay = guest && Boolean(options.guestPrompt)
  const path = `${location.pathname}${location.search}`

  useEffect(() => {
    if (!ready || userId || stay) return
    rememberNext(path)
    navigate("/start", { replace: true })
  }, [navigate, path, ready, stay, userId])

  return { ready: ready && userId !== null, userId, guest: ready && stay }
}
