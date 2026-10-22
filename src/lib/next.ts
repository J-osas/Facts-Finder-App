// Remembers where a signed-out person was heading (a room link, for example),
// so sign-up or login can send them there instead of always to Home.
// It lives in sessionStorage, so it belongs to this tab and goes away with it.

const KEY = "facts-finder-next"

// Only paths inside this site. Anything else could send someone elsewhere.
function safePath(value: string | null) {
  if (!value) return null
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return null
  return value
}

export function rememberNext(path: string) {
  try {
    const safe = safePath(path)
    if (safe) sessionStorage.setItem(KEY, safe)
  } catch {
    /* Private browsing can block storage. The person lands on Home instead. */
  }
}

export function takeNext() {
  try {
    const value = safePath(sessionStorage.getItem(KEY))
    sessionStorage.removeItem(KEY)
    return value
  } catch {
    return null
  }
}
