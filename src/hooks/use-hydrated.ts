import { usePlayer } from "@/store/player"

export function useHydrated() {
  return usePlayer((state) => state.authReady)
}
