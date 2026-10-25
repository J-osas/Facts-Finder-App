import { create } from "zustand"
import { persist } from "zustand/middleware"
import {
  DAILY_COUNT,
  LEVEL_COUNT,
  MISTAKE_LIMIT,
  QUESTIONS_PER_LEVEL,
  QUESTION_SECONDS,
  XP_BAND,
  pickQuestions,
  todayKey,
  yesterdayKey,
  type PathId,
  type Question,
} from "@/data/questions"
import { normalizeAvatar, type AvatarChoice } from "@/lib/avatar"
import { submitRoomScore, type RoomInfo } from "@/lib/rooms"
import { accountsOffline, supabase } from "@/lib/supabase"
import { usernameBase, usernameCandidate } from "@/lib/username"

export type PathProgress = {
  completed: number[]
  attempts: number
}

export type MissedFact = {
  text: string
  correct: string
  explanation: string
}

export type RoundResult = {
  path: PathId
  level: number
  mode: "level" | "daily"
  correct: number
  total: number
  mistakes: number
  points: number
  xpEarned: number
  passed: boolean
  bestStreak: number
  missed: MissedFact[]
  leveledUp: boolean
}

export type Profile = {
  xp: number
  streak: number
  lastPlayedDate: string | null
  dailyClearedOn: string | null
  paths: Record<PathId, PathProgress>
  badge: string
  feedbackPrompted: boolean
}

export type RoundAnswer = {
  questionId: string
  chosenIndex: number | null
  correct: boolean
  points: number
  // How long the player took on this question, in milliseconds.
  timeMs: number
}

export type RoomRef = { id: string; code: string; hostName: string }

export type RoundState = {
  path: PathId
  level: number
  mode: "level" | "daily" | "room"
  // Set only in a room round. Room rounds use the room's questions, have no
  // mistake limit, and send their score to the room leaderboard.
  room: RoomRef | null
  questions: Question[]
  index: number
  mistakes: number
  points: number
  correct: number
  streak: number
  bestStreak: number
  answers: RoundAnswer[]
  phase: "question" | "feedback"
  chosenIndex: number | null
  timedOut: boolean
  questionStartedAt: number
}

export type Account = {
  id: string
  email: string
  firstName: string
  lastName: string
  username: string
  usernameChangedAt: string | null
  avatar: AvatarChoice
  isAdmin: boolean
}

type SignupInput = {
  firstName: string
  lastName: string
  email: string
  password: string
}

type PlayerState = {
  authReady: boolean
  userId: string | null
  account: Account | null
  profile: Profile
  // A guest plays without an account. Their progress stays in this browser,
  // in guestProfile, until they sign up and it moves into the new account.
  guest: boolean
  guestProfile: Profile | null
  lastResult: RoundResult | null
  round: RoundState | null
  playAsGuest: () => void
  signUp: (input: SignupInput) => Promise<string | null>
  logIn: (email: string, password: string) => Promise<string | null>
  signOut: () => Promise<void>
  changeUsername: (username: string) => Promise<string | null>
  saveAvatar: (avatar: AvatarChoice) => Promise<string | null>
  markFeedbackPrompted: () => void
  startRound: (path: PathId, level: number, mode?: "level" | "daily") => void
  startRoomRound: (room: RoomInfo) => void
  answerQuestion: (chosenIndex: number | null, secondsLeft: number) => void
  continueRound: () => "next" | "results" | "room"
  // Leave a room round early. The score so far is saved and the attempt ends.
  abandonRoomRound: () => Promise<string | null>
  clearRound: () => void
}

// The last room score being saved. The gameplay screen waits on this before
// opening the room, so the leaderboard already has the new score.
let pendingRoomSave: Promise<string | null> = Promise.resolve(null)

export function roomSaveResult() {
  return pendingRoomSave
}

type ProfileRow = {
  id: string
  first_name: string
  last_name: string
  username: string
  username_changed_at: string | null
  avatar: unknown
  is_admin?: boolean | null
}

type ProgressRow = {
  xp: number
  streak: number
  last_played_date: string | null
  daily_cleared_on: string | null
  paths: Partial<Record<PathId, Partial<PathProgress>>> | null
  badge: string
  feedback_prompted: boolean
}

function emptyPath(): PathProgress {
  return { completed: [], attempts: 0 }
}

export function emptyProfile(): Profile {
  return {
    xp: 0,
    streak: 0,
    lastPlayedDate: null,
    dailyClearedOn: null,
    paths: {
      general: emptyPath(),
      history: emptyPath(),
      science: emptyPath(),
    },
    badge: "Curious mind",
    feedbackPrompted: false,
  }
}

export function currentLevel(progress: PathProgress) {
  for (let level = 1; level <= LEVEL_COUNT; level += 1) {
    if (!progress.completed.includes(level)) return level
  }
  return LEVEL_COUNT
}

export function playerLevel(xp: number) {
  return Math.floor(xp / XP_BAND) + 1
}

function countClears(paths: Record<PathId, PathProgress>) {
  return Object.values(paths).reduce((sum, path) => sum + path.completed.length, 0)
}

// Playing again today keeps the streak, playing the day after adds one, and a
// longer gap starts again at one.
function streakAfterPlay(profile: Profile) {
  if (profile.lastPlayedDate === todayKey()) return profile.streak
  if (profile.lastPlayedDate === yesterdayKey()) return profile.streak + 1
  return 1
}

function badgeFor(xp: number, clears: number) {
  if (xp >= XP_BAND) return "Scholar"
  if (clears > 0) return "Pathfinder"
  return "Curious mind"
}

function laterDate(a: string | null, b: string | null) {
  if (!a) return b
  if (!b) return a
  return a > b ? a : b
}

// Keeps the best of both when a guest signs up or logs in: every level either
// one cleared, and the higher XP and streak.
function mergeProfiles(account: Profile, guest: Profile): Profile {
  const paths = { ...account.paths }
  for (const id of Object.keys(paths) as PathId[]) {
    const mine = account.paths[id]
    const theirs = guest.paths[id] ?? emptyPath()
    paths[id] = {
      completed: Array.from(new Set([...mine.completed, ...theirs.completed])).sort(
        (x, y) => x - y
      ),
      attempts: Math.max(mine.attempts, theirs.attempts),
    }
  }
  const xp = Math.max(account.xp, guest.xp)
  return {
    xp,
    streak: Math.max(account.streak, guest.streak),
    lastPlayedDate: laterDate(account.lastPlayedDate, guest.lastPlayedDate),
    dailyClearedOn: laterDate(account.dailyClearedOn, guest.dailyClearedOn),
    paths,
    badge: badgeFor(xp, countClears(paths)),
    feedbackPrompted: account.feedbackPrompted || guest.feedbackPrompted,
  }
}

function readGuestProfile(value: unknown): Profile | null {
  if (!value || typeof value !== "object") return null
  const row = value as Partial<Profile>
  const base = emptyProfile()
  return {
    xp: typeof row.xp === "number" ? row.xp : 0,
    streak: typeof row.streak === "number" ? row.streak : 0,
    lastPlayedDate: typeof row.lastPlayedDate === "string" ? row.lastPlayedDate : null,
    dailyClearedOn: typeof row.dailyClearedOn === "string" ? row.dailyClearedOn : null,
    paths: {
      general: normalizePath(row.paths?.general),
      history: normalizePath(row.paths?.history),
      science: normalizePath(row.paths?.science),
    },
    badge: typeof row.badge === "string" && row.badge ? row.badge : base.badge,
    feedbackPrompted: Boolean(row.feedbackPrompted),
  }
}

function emailKey(email: string) {
  return email.trim().toLowerCase()
}

function normalizePath(value: Partial<PathProgress> | undefined): PathProgress {
  const completed = Array.isArray(value?.completed)
    ? value.completed.filter((level) => typeof level === "number")
    : []
  const attempts = typeof value?.attempts === "number" ? value.attempts : 0
  return { completed, attempts }
}

function mapProgress(row: ProgressRow | null): Profile {
  const base = emptyProfile()
  if (!row) return base
  return {
    xp: row.xp ?? 0,
    streak: row.streak ?? 0,
    lastPlayedDate: row.last_played_date,
    dailyClearedOn: row.daily_cleared_on,
    paths: {
      general: normalizePath(row.paths?.general),
      history: normalizePath(row.paths?.history),
      science: normalizePath(row.paths?.science),
    },
    badge: row.badge || base.badge,
    feedbackPrompted: Boolean(row.feedback_prompted),
  }
}

function mapAccount(row: ProfileRow, email: string): Account {
  return {
    id: row.id,
    email,
    firstName: row.first_name,
    lastName: row.last_name,
    username: row.username,
    usernameChangedAt: row.username_changed_at,
    avatar: normalizeAvatar(row.avatar),
    isAdmin: Boolean(row.is_admin),
  }
}

async function usernameIsTaken(candidate: string) {
  if (!supabase) return true
  const { data, error } = await supabase.rpc("username_taken", { candidate })
  if (error) throw error
  return Boolean(data)
}

async function chooseUsername(firstName: string, lastName: string) {
  const base = usernameBase(firstName, lastName)
  for (let attempt = 1; attempt <= 40; attempt += 1) {
    const candidate = usernameCandidate(base, attempt)
    if (!(await usernameIsTaken(candidate))) return candidate
  }
  return null
}

async function loadAccount(userId: string, email: string) {
  if (!supabase) return accountsOffline
  const profileResult = await supabase
    .from("profiles")
    .select("id, first_name, last_name, username, username_changed_at, avatar, is_admin")
    .eq("id", userId)
    .maybeSingle()
  if (profileResult.error || !profileResult.data) {
    return "We could not open that account. Try again."
  }
  const progressResult = await supabase
    .from("progress")
    .select("xp, streak, last_played_date, daily_cleared_on, paths, badge, feedback_prompted")
    .eq("user_id", userId)
    .maybeSingle()
  usePlayer.setState({
    userId,
    account: mapAccount(profileResult.data as ProfileRow, email),
    profile: mapProgress((progressResult.data as ProgressRow | null) ?? null),
  })
  return null
}

async function pushProgress(userId: string, profile: Profile) {
  if (!supabase) return
  await supabase
    .from("progress")
    .update({
      xp: profile.xp,
      streak: profile.streak,
      last_played_date: profile.lastPlayedDate,
      daily_cleared_on: profile.dailyClearedOn,
      paths: profile.paths,
      badge: profile.badge,
      feedback_prompted: profile.feedbackPrompted,
    })
    .eq("user_id", userId)
}

// Saves progress where it belongs: the account's row for a signed-in player,
// this browser for a guest.
function saveProfile(profile: Profile) {
  const { userId, guest } = usePlayer.getState()
  if (userId) void pushProgress(userId, profile)
  else if (guest) usePlayer.setState({ guestProfile: profile })
}

// Runs once an account is open. A guest's progress is merged into it, then the
// guest copy is dropped.
function adoptGuestProgress() {
  const { guestProfile, profile, userId } = usePlayer.getState()
  if (!guestProfile || !userId) return
  const merged = mergeProfiles(profile, guestProfile)
  usePlayer.setState({ profile: merged, guest: false, guestProfile: null })
  void pushProgress(userId, merged)
}

async function openAccount(userId: string, email: string) {
  const failed = await loadAccount(userId, email)
  if (failed) return failed
  adoptGuestProgress()
  return null
}

function authError(message: string) {
  const text = message.toLowerCase()
  if (text.includes("confirm")) {
    return "Confirm the email first, or turn off Confirm email in Supabase."
  }
  if (text.includes("already")) {
    return "That email is already in use. Try logging in."
  }
  if (text.includes("username") || text.includes("unique") || text.includes("duplicate")) {
    return "That name was just taken. Try Create account again."
  }
  return "Those details could not be saved. Try again."
}

export const usePlayer = create<PlayerState>()(
  persist(
    (set, get) => ({
      authReady: false,
      userId: null,
      account: null,
      profile: emptyProfile(),
      guest: false,
      guestProfile: null,
      lastResult: null,
      round: null,
      playAsGuest: () => {
        const profile = get().guestProfile ?? emptyProfile()
        set({ guest: true, guestProfile: profile, profile })
      },
      signUp: async ({ firstName, lastName, email, password }) => {
        if (!supabase) return accountsOffline
        let username: string | null
        try {
          username = await chooseUsername(firstName, lastName)
        } catch {
          return "The account database is missing the username check. Run supabase/schema.sql."
        }
        if (!username) return "We could not make a username. Try a different first name."
        const { data, error } = await supabase.auth.signUp({
          email: emailKey(email),
          password,
          options: {
            data: {
              first_name: firstName.trim(),
              last_name: lastName.trim(),
              username,
            },
          },
        })
        if (error) return authError(error.message)
        if (!data.session || !data.user) {
          return "Turn off Confirm email in Supabase so a new account can sign in immediately."
        }
        return openAccount(data.user.id, data.user.email ?? emailKey(email))
      },
      logIn: async (email, password) => {
        if (!supabase) return accountsOffline
        const { data, error } = await supabase.auth.signInWithPassword({
          email: emailKey(email),
          password,
        })
        if (error) {
          return error.message.toLowerCase().includes("confirm")
            ? "Confirm the email first, or turn off Confirm email in Supabase."
            : "Those details don't match. Check your email and password."
        }
        if (!data.user) return "Those details don't match. Check your email and password."
        return openAccount(data.user.id, data.user.email ?? emailKey(email))
      },
      signOut: async () => {
        if (supabase) await supabase.auth.signOut()
        set({
          userId: null,
          account: null,
          profile: emptyProfile(),
          guest: false,
          guestProfile: null,
          round: null,
        })
      },
      changeUsername: async (username) => {
        const userId = get().userId
        const account = get().account
        if (!supabase || !userId || !account) return accountsOffline
        const { data, error } = await supabase
          .from("profiles")
          .update({ username })
          .eq("id", userId)
          .select("username, username_changed_at")
          .single()
        if (error) {
          const text = `${error.message} ${error.code ?? ""}`.toLowerCase()
          if (text.includes("username_locked")) {
            return "You can change your username again in three months."
          }
          if (text.includes("23505") || text.includes("unique") || text.includes("duplicate")) {
            return "That username is already taken."
          }
          if (text.includes("username_invalid")) {
            return "Use 3 to 16 letters or numbers, with no spaces."
          }
          return "The username could not be saved. Try again."
        }
        const row = data as { username: string; username_changed_at: string | null }
        set({
          account: {
            ...account,
            username: row.username,
            usernameChangedAt: row.username_changed_at,
          },
        })
        return null
      },
      saveAvatar: async (avatar) => {
        const userId = get().userId
        const account = get().account
        if (!supabase || !userId || !account) return accountsOffline
        const { error } = await supabase.from("profiles").update({ avatar }).eq("id", userId)
        if (error) return "The avatar could not be saved. Try again."
        set({ account: { ...account, avatar } })
        return null
      },
      markFeedbackPrompted: () => {
        const profile = { ...get().profile, feedbackPrompted: true }
        set({ profile })
        saveProfile(profile)
      },
      startRound: (path, level, mode = "level") => {
        const userId = get().userId
        if (!userId && !get().guest) return
        // Guests have no id, so they share one seed prefix. Their attempt count
        // still changes the questions each time.
        const seedId = userId ?? "guest"
        const profile = get().profile
        const attempts =
          mode === "daily" ? profile.paths[path].attempts : profile.paths[path].attempts + 1
        const count = mode === "daily" ? DAILY_COUNT : QUESTIONS_PER_LEVEL
        const seed =
          mode === "daily"
            ? `${seedId}|daily|${todayKey()}`
            : `${seedId}|${path}|${level}|${attempts}`
        const nextProfile: Profile = {
          ...profile,
          paths: {
            ...profile.paths,
            [path]: { ...profile.paths[path], attempts },
          },
        }
        set({
          profile: nextProfile,
          round: {
            path,
            level,
            mode,
            room: null,
            questions: pickQuestions(path, seed, count),
            index: 0,
            mistakes: 0,
            points: 0,
            correct: 0,
            streak: 0,
            bestStreak: 0,
            answers: [],
            phase: "question",
            chosenIndex: null,
            timedOut: false,
            questionStartedAt: Date.now(),
          },
        })
        saveProfile(nextProfile)
      },
      startRoomRound: (room) => {
        const userId = get().userId
        if (!userId) return
        // The room's seed, not the player's, so everyone gets the same questions.
        set({
          round: {
            path: room.path,
            level: 0,
            mode: "room",
            room: { id: room.id, code: room.code, hostName: room.hostName },
            questions: pickQuestions(room.path, room.seed, room.questionCount),
            index: 0,
            mistakes: 0,
            points: 0,
            correct: 0,
            streak: 0,
            bestStreak: 0,
            answers: [],
            phase: "question",
            chosenIndex: null,
            timedOut: false,
            questionStartedAt: Date.now(),
          },
        })
      },
      answerQuestion: (chosenIndex, secondsLeft) => {
        const round = get().round
        if (!round || round.phase !== "question") return
        const question = round.questions[round.index]
        const correct = chosenIndex === question.correctIndex
        // Never more than the timer allows, whatever the screen clock says.
        const left = Math.min(QUESTION_SECONDS, Math.max(0, secondsLeft))
        const gained = correct ? 100 + Math.round(left) * 2 : 0
        const timeMs = Math.round((QUESTION_SECONDS - left) * 1000)
        const streak = correct ? round.streak + 1 : 0
        set({
          round: {
            ...round,
            phase: "feedback",
            chosenIndex,
            timedOut: chosenIndex === null,
            points: round.points + gained,
            correct: round.correct + (correct ? 1 : 0),
            mistakes: round.mistakes + (correct ? 0 : 1),
            streak,
            bestStreak: Math.max(round.bestStreak, streak),
            answers: [
              ...round.answers,
              {
                questionId: question.id,
                chosenIndex,
                correct,
                points: gained,
                timeMs,
              },
            ],
          },
        })
      },
      abandonRoomRound: async () => {
        const round = get().round
        set({ round: null })
        if (!round || round.mode !== "room" || !round.room) return null
        return submitRoomScore({
          roomId: round.room.id,
          correct: round.correct,
          points: round.points,
          totalTimeMs: round.answers.reduce((sum, answer) => sum + answer.timeMs, 0),
        })
      },
      continueRound: () => {
        const round = get().round
        const userId = get().userId
        if (!round || (!userId && !get().guest)) return "results"
        // Rooms have no mistake limit: everyone answers every question.
        const failed = round.mode !== "room" && round.mistakes >= MISTAKE_LIMIT
        const finished = round.index >= round.questions.length - 1
        if (!failed && !finished) {
          set({
            round: {
              ...round,
              index: round.index + 1,
              phase: "question",
              chosenIndex: null,
              timedOut: false,
              questionStartedAt: Date.now(),
            },
          })
          return "next"
        }

        const profile = get().profile

        if (round.mode === "room") {
          const room = round.room
          if (!room) {
            set({ round: null })
            return "results"
          }
          // Half of a level pass, like a replayed level. Nothing for a round
          // with no correct answers, so tapping through earns no XP.
          const xpEarned =
            round.correct === 0
              ? 0
              : Math.round((80 + round.correct * 12 + Math.round(round.points / 10)) / 2)
          const xp = profile.xp + xpEarned
          const nextProfile: Profile = {
            ...profile,
            xp,
            streak: streakAfterPlay(profile),
            lastPlayedDate: todayKey(),
            badge: badgeFor(xp, countClears(profile.paths)),
          }
          set({ profile: nextProfile, round: null })
          saveProfile(nextProfile)
          pendingRoomSave = submitRoomScore({
            roomId: room.id,
            correct: round.correct,
            points: round.points,
            totalTimeMs: round.answers.reduce((sum, answer) => sum + answer.timeMs, 0),
          })
          return "room"
        }

        const passed = !failed && finished
        const alreadyDone =
          round.mode === "level" && profile.paths[round.path].completed.includes(round.level)
        let xpEarned = passed
          ? 80 + round.correct * 12 + Math.round(round.points / 10)
          : round.correct * 8
        if (passed && alreadyDone) xpEarned = Math.round(xpEarned / 2)
        const dailyBonus =
          round.mode === "daily" && passed && profile.dailyClearedOn !== todayKey()
        if (dailyBonus) xpEarned += 120

        const streak = streakAfterPlay(profile)
        const beforeLevel = playerLevel(profile.xp)
        const xp = profile.xp + xpEarned
        const completed =
          passed && round.mode === "level"
            ? Array.from(new Set([...profile.paths[round.path].completed, round.level]))
            : profile.paths[round.path].completed
        const clears = Object.values({
          ...profile.paths,
          [round.path]: { ...profile.paths[round.path], completed },
        }).reduce((sum, path) => sum + path.completed.length, 0)
        const nextProfile: Profile = {
          ...profile,
          xp,
          streak,
          lastPlayedDate: todayKey(),
          dailyClearedOn: dailyBonus ? todayKey() : profile.dailyClearedOn,
          badge: badgeFor(xp, clears),
          paths: {
            ...profile.paths,
            [round.path]: { ...profile.paths[round.path], completed },
          },
        }
        const missed = round.answers
          .filter((answer) => !answer.correct)
          .map((answer) => {
            const question = round.questions.find((item) => item.id === answer.questionId)
            return {
              text: question?.text ?? "",
              correct: question ? question.options[question.correctIndex] : "",
              explanation: question?.explanation ?? "",
            }
          })
        set({
          profile: nextProfile,
          lastResult: {
            path: round.path,
            level: round.level,
            mode: round.mode,
            correct: round.correct,
            total: round.questions.length,
            mistakes: round.mistakes,
            points: round.points,
            xpEarned,
            passed,
            bestStreak: round.bestStreak,
            missed,
            leveledUp: playerLevel(xp) > beforeLevel,
          },
          round: null,
        })
        saveProfile(nextProfile)
        return "results"
      },
      clearRound: () => set({ round: null }),
    }),
    {
      name: "facts-finder-player",
      version: 2,
      partialize: (state) => ({
        lastResult: state.lastResult,
        guest: state.guest,
        guestProfile: state.guestProfile,
      }),
      migrate: (persisted) => persisted as Record<string, unknown>,
      // A guest comes back to the progress saved in this browser.
      merge: (persisted, current) => {
        const data = (persisted ?? {}) as {
          lastResult?: RoundResult | null
          guest?: boolean
          guestProfile?: unknown
        }
        const guestProfile = readGuestProfile(data.guestProfile)
        const guest = Boolean(data.guest) && guestProfile !== null
        return {
          ...current,
          lastResult: data.lastResult ?? null,
          guest,
          guestProfile,
          profile: guest && guestProfile ? guestProfile : current.profile,
        }
      },
    }
  )
)

function waitForPersist() {
  return new Promise<void>((resolve) => {
    if (usePlayer.persist.hasHydrated()) {
      resolve()
      return
    }
    const unsubscribe = usePlayer.persist.onFinishHydration(() => {
      unsubscribe()
      resolve()
    })
  })
}

let booted = false

export function bootPlayer() {
  if (booted) return
  booted = true
  void (async () => {
    await waitForPersist()
    try {
      if (!supabase) return
      const { data } = await supabase.auth.getSession()
      const user = data.session?.user
      if (user) await loadAccount(user.id, user.email ?? "")
      supabase.auth.onAuthStateChange((event) => {
        if (event === "SIGNED_OUT") {
          usePlayer.setState({
            userId: null,
            account: null,
            profile: emptyProfile(),
            round: null,
          })
        }
      })
    } finally {
      usePlayer.setState({ authReady: true })
    }
  })()
}

export function useSession() {
  const account = usePlayer((state) => state.account)
  const profile = usePlayer((state) => state.profile)
  const guestFlag = usePlayer((state) => state.guest)
  const guest = guestFlag && account === null
  return {
    email: account?.email ?? null,
    account,
    profile,
    userId: account?.id ?? null,
    guest,
    // A signed-in player or a guest can play. Everyone else goes to Get started.
    canPlay: account !== null || guest,
  }
}
