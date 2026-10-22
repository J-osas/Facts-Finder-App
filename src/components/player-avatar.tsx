import { avatarColors, type AvatarChoice, type PortraitId } from "@/lib/avatar"

const ink = "#0B1B38"
const face = "#F7F6EE"

export function PlayerAvatar({
  avatar,
  className,
}: {
  avatar: AvatarChoice
  className?: string
}) {
  const color = avatarColors[avatar.color]
  return (
    <svg
      viewBox="0 0 80 80"
      className={className}
      aria-hidden="true"
      data-portrait={avatar.portrait}
      data-color={avatar.color}
    >
      <circle cx="40" cy="40" r="40" fill={color} />
      <circle cx="40" cy="46" r="24" fill={face} />
      {features(avatar.portrait, color)}
    </svg>
  )
}

function features(portrait: PortraitId, color: string) {
  if (portrait === "fox") {
    return (
      <>
        <path d="M16 28 28 14l8 16" fill={color} stroke={ink} strokeWidth="2" />
        <path d="M64 28 52 14l-8 16" fill={color} stroke={ink} strokeWidth="2" />
        <ellipse cx="40" cy="50" rx="8" ry="6" fill={color} />
        <circle cx="32" cy="44" r="2.2" fill={ink} />
        <circle cx="48" cy="44" r="2.2" fill={ink} />
      </>
    )
  }
  if (portrait === "owl") {
    return (
      <>
        <circle cx="30" cy="42" r="8" fill={face} stroke={ink} strokeWidth="2" />
        <circle cx="50" cy="42" r="8" fill={face} stroke={ink} strokeWidth="2" />
        <circle cx="30" cy="42" r="3" fill={ink} />
        <circle cx="50" cy="42" r="3" fill={ink} />
        <path d="M36 52h8l-4 6z" fill={color} />
      </>
    )
  }
  if (portrait === "bear") {
    return (
      <>
        <circle cx="22" cy="24" r="8" fill={color} stroke={ink} strokeWidth="2" />
        <circle cx="58" cy="24" r="8" fill={color} stroke={ink} strokeWidth="2" />
        <ellipse cx="40" cy="52" rx="9" ry="7" fill={color} />
        <circle cx="32" cy="44" r="2.2" fill={ink} />
        <circle cx="48" cy="44" r="2.2" fill={ink} />
      </>
    )
  }
  if (portrait === "cat") {
    return (
      <>
        <path d="M24 34 30 16l10 14" fill={color} stroke={ink} strokeWidth="2" />
        <path d="M56 34 50 16 40 30" fill={color} stroke={ink} strokeWidth="2" />
        <circle cx="32" cy="44" r="2.2" fill={ink} />
        <circle cx="48" cy="44" r="2.2" fill={ink} />
        <path d="M40 48v6M34 52h12" stroke={ink} strokeWidth="2" strokeLinecap="round" />
        <path d="M22 50h10M48 50h10" stroke={ink} strokeWidth="1.6" strokeLinecap="round" />
      </>
    )
  }
  if (portrait === "panda") {
    return (
      <>
        <circle cx="22" cy="22" r="7" fill={ink} />
        <circle cx="58" cy="22" r="7" fill={ink} />
        <ellipse cx="30" cy="44" rx="7" ry="8" fill={ink} />
        <ellipse cx="50" cy="44" rx="7" ry="8" fill={ink} />
        <circle cx="31" cy="45" r="2" fill={face} />
        <circle cx="49" cy="45" r="2" fill={face} />
        <ellipse cx="40" cy="54" rx="4" ry="3" fill={ink} />
      </>
    )
  }
  if (portrait === "lion") {
    return (
      <>
        <circle cx="24" cy="28" r="7" fill={color} />
        <circle cx="40" cy="22" r="7" fill={color} />
        <circle cx="56" cy="28" r="7" fill={color} />
        <circle cx="62" cy="42" r="7" fill={color} />
        <circle cx="18" cy="42" r="7" fill={color} />
        <circle cx="40" cy="48" r="16" fill={face} />
        <circle cx="34" cy="46" r="2" fill={ink} />
        <circle cx="46" cy="46" r="2" fill={ink} />
        <ellipse cx="40" cy="53" rx="5" ry="3.5" fill={color} />
      </>
    )
  }
  if (portrait === "rabbit") {
    return (
      <>
        <ellipse cx="30" cy="18" rx="6" ry="14" fill={color} stroke={ink} strokeWidth="2" />
        <ellipse cx="50" cy="18" rx="6" ry="14" fill={color} stroke={ink} strokeWidth="2" />
        <circle cx="32" cy="44" r="2.2" fill={ink} />
        <circle cx="48" cy="44" r="2.2" fill={ink} />
        <path d="M36 52h8l-4 4z" fill={color} />
      </>
    )
  }
  return (
    <>
      <ellipse cx="40" cy="58" rx="16" ry="12" fill={color} />
      <ellipse cx="40" cy="34" rx="14" ry="12" fill={ink} />
      <ellipse cx="40" cy="40" rx="10" ry="8" fill={face} />
      <circle cx="34" cy="32" r="2" fill={face} />
      <circle cx="46" cy="32" r="2" fill={face} />
    </>
  )
}
