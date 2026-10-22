import { useEffect } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { rememberNext } from "@/lib/next"
import { usePlayer } from "@/store/player"

// For pages that need an account. Signed-out visitors are sent to Get started,
// and after they sign up or log in they come back to this same page.
export function useRequireAccount() {
  const navigate = useNavigate()
  const location = useLocation()
  const ready = usePlayer((state) => state.authReady)
  const userId = usePlayer((state) => state.account?.id ?? null)
  const path = `${location.pathname}${location.search}`

  useEffect(() => {
    if (!ready || userId) return
    rememberNext(path)
    navigate("/start", { replace: true })
  }, [navigate, path, ready, userId])

  return { ready: ready && userId !== null, userId }
}
