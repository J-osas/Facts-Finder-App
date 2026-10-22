import { Compass, House, Map, Swords, UserRound } from "lucide-react"
import { NavLink } from "react-router-dom"
import { cn } from "cn"

const items = [
  { to: "/home", label: "Home", icon: House },
  { to: "/play", label: "Play", icon: Map },
  { to: "/compete", label: "Compete", icon: Swords },
  { to: "/discover", label: "Discover", icon: Compass },
  { to: "/profile", label: "Profile", icon: UserRound },
]

export function BottomNav() {
  return (
    <nav
      aria-label="Main"
      className="sticky bottom-0 z-20 border-t border-border bg-[var(--surface-deep)] pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="grid grid-cols-5">
        {items.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold",
                  isActive ? "text-cyan" : "text-muted-foreground"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon
                    aria-hidden="true"
                    className={cn("size-5", isActive && "scale-110")}
                  />
                  {item.label}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
