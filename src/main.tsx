import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "./index.css"
import App from "./App.tsx"
import { ThemeProvider } from "@/components/theme-provider.tsx"
import { bootPlayer } from "@/store/player"

bootPlayer()

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="system" storageKey="facts-finder-theme">
      <App />
    </ThemeProvider>
  </StrictMode>
)
