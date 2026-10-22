import type { ReactNode } from "react"
import { Outlet } from "react-router-dom"
import { BottomNav } from "@/components/bottom-nav"

export function PhoneFrame() {
  return (
    <div className="flex h-dvh justify-center bg-stage">
      <div className="h-dvh w-full max-w-[430px] overflow-y-auto bg-background shadow-[0_0_0_1px_var(--line)]">
        <Outlet />
      </div>
    </div>
  )
}

export function WithNav() {
  return (
    <div className="flex min-h-full flex-col">
      <div className="flex-1">
        <Outlet />
      </div>
      <BottomNav />
    </div>
  )
}

export function Overline({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs font-bold tracking-[0.08em] text-muted-foreground uppercase">
      {children}
    </p>
  )
}
