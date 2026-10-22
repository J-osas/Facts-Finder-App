export const portraits = [
  "fox",
  "owl",
  "bear",
  "cat",
  "panda",
  "lion",
  "rabbit",
  "penguin",
] as const

export const avatarColors = {
  cyan: "#00C2FF",
  lime: "#A3E635",
  coral: "#FF8F70",
  gold: "#F5C451",
  violet: "#7C6BF2",
  ivory: "#F7F6EE",
} as const

export type PortraitId = (typeof portraits)[number]
export type AvatarColor = keyof typeof avatarColors

export type AvatarChoice = {
  portrait: PortraitId
  color: AvatarColor
}

export const defaultAvatar: AvatarChoice = { portrait: "fox", color: "cyan" }

export function normalizeAvatar(value: unknown): AvatarChoice {
  if (!value || typeof value !== "object") return defaultAvatar
  const record = value as { portrait?: unknown; color?: unknown }
  const portrait = portraits.find((item) => item === record.portrait) ?? defaultAvatar.portrait
  const color =
    (Object.keys(avatarColors) as AvatarColor[]).find((item) => item === record.color) ??
    defaultAvatar.color
  return { portrait, color }
}
