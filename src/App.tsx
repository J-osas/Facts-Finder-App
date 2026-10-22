import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import { PhoneFrame, WithNav } from "@/components/shell"
import { Admin } from "@/pages/admin"
import { AuthScreen } from "@/pages/auth"
import { AvatarScreen } from "@/pages/avatar"
import { Compete } from "@/pages/compete"
import { Discover } from "@/pages/discover"
import { FeedbackScreen } from "@/pages/feedback"
import { Gameplay } from "@/pages/gameplay"
import { Friends } from "@/pages/friends"
import { GetStarted } from "@/pages/get-started"
import { Home } from "@/pages/home"
import { Join } from "@/pages/join"
import { LevelMap } from "@/pages/level-map"
import { Profile } from "@/pages/profile"
import { Results } from "@/pages/results"
import { Room } from "@/pages/room"
import { SignOutScreen } from "@/pages/sign-out"
import { Splash } from "@/pages/splash"

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="admin" element={<Admin />} />
        <Route element={<PhoneFrame />}>
          <Route index element={<Splash />} />
          <Route path="start" element={<GetStarted />} />
          <Route path="auth" element={<AuthScreen />} />
          <Route path="sign-out" element={<SignOutScreen />} />
          <Route path="avatar" element={<AvatarScreen />} />
          <Route path="feedback" element={<FeedbackScreen />} />
          <Route path="friends" element={<Friends />} />
          <Route path="room/:code" element={<Room />} />
          <Route path="join/:code" element={<Join />} />
          <Route element={<WithNav />}>
            <Route path="home" element={<Home />} />
            <Route path="play" element={<LevelMap />} />
            <Route path="compete" element={<Compete />} />
            <Route path="discover" element={<Discover />} />
            <Route path="profile" element={<Profile />} />
          </Route>
          <Route path="round" element={<Gameplay />} />
          <Route path="results" element={<Results />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
