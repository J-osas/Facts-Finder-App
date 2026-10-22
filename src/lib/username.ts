export function usernameBase(firstName: string, lastName: string) {
  const clean = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "")
  let base = clean(firstName)
  if (base.length < 3) base = `${base}${clean(lastName)}`
  if (base.length < 3) base = `${base}player`
  return base.slice(0, 16)
}

export function usernameCandidate(base: string, attempt: number) {
  if (attempt <= 1) return base.slice(0, 16)
  const suffix = String(attempt)
  return `${base.slice(0, Math.max(1, 16 - suffix.length))}${suffix}`
}

export function usernameProblem(value: string) {
  if (!/^[a-z0-9]{3,16}$/.test(value)) {
    return "Use 3 to 16 letters or numbers, with no spaces."
  }
  return null
}

export function usernameUnlocksAt(changedAt: string | null) {
  if (!changedAt) return null
  const date = new Date(changedAt)
  if (Number.isNaN(date.getTime())) return null
  const next = new Date(date)
  next.setMonth(next.getMonth() + 3)
  return next
}

export function usernameChangeAllowed(changedAt: string | null, now = new Date()) {
  const unlocks = usernameUnlocksAt(changedAt)
  return !unlocks || now >= unlocks
}

export function formatUnlockDate(date: Date) {
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}
