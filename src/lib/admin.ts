import { accountsOffline, supabase } from "@/lib/supabase"

export type TranscriptStatus = "none" | "browser" | "pending" | "done" | "failed"

export type AdminPlayer = {
  id: string
  firstName: string
  lastName: string
  username: string
  email: string
  createdAt: string
  xp: number
  streak: number
  lastPlayedDate: string | null
  badge: string
  clears: number
}

export type AdminNote = {
  id: string
  createdAt: string
  rating: number
  body: string
  audioPath: string | null
  status: TranscriptStatus
  userId: string | null
  firstName: string | null
  username: string | null
  email: string | null
}

type PlayerRow = {
  id: string
  first_name: string
  last_name: string
  username: string
  email: string | null
  created_at: string
  xp: number | null
  streak: number | null
  last_played_date: string | null
  badge: string | null
  paths: Record<string, { completed?: unknown } | undefined> | null
}

type NoteRow = {
  id: string
  created_at: string
  rating: number
  body: string | null
  audio_path: string | null
  transcript_status: string | null
  user_id: string | null
  first_name: string | null
  username: string | null
  email: string | null
}

function countClears(paths: PlayerRow["paths"]) {
  if (!paths) return 0
  return Object.values(paths).reduce((total, path) => {
    const done = path?.completed
    return total + (Array.isArray(done) ? done.length : 0)
  }, 0)
}

function asStatus(value: string | null): TranscriptStatus {
  if (value === "browser" || value === "pending" || value === "done" || value === "failed") {
    return value
  }
  return "none"
}

export async function loadPlayers(): Promise<{ rows: AdminPlayer[]; error: string | null }> {
  if (!supabase) return { rows: [], error: accountsOffline }
  const { data, error } = await supabase.rpc("admin_players")
  if (error) {
    return { rows: [], error: "Players could not be loaded. Run supabase/schema.sql again." }
  }
  const rows = ((data ?? []) as PlayerRow[]).map((row) => ({
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    username: row.username,
    email: row.email ?? "",
    createdAt: row.created_at,
    xp: row.xp ?? 0,
    streak: row.streak ?? 0,
    lastPlayedDate: row.last_played_date,
    badge: row.badge ?? "",
    clears: countClears(row.paths),
  }))
  return { rows, error: null }
}

export async function loadNotes(): Promise<{ rows: AdminNote[]; error: string | null }> {
  if (!supabase) return { rows: [], error: accountsOffline }
  const { data, error } = await supabase.rpc("admin_feedback")
  if (error) {
    return { rows: [], error: "Feedback could not be loaded. Run supabase/schema.sql again." }
  }
  const rows = ((data ?? []) as NoteRow[]).map((row) => ({
    id: row.id,
    createdAt: row.created_at,
    rating: row.rating,
    body: row.body ?? "",
    audioPath: row.audio_path,
    status: asStatus(row.transcript_status),
    userId: row.user_id,
    firstName: row.first_name,
    username: row.username,
    email: row.email,
  }))
  return { rows, error: null }
}

// A short-lived link so the admin can play a private voice file.
export async function signedAudioUrl(path: string) {
  if (!supabase) return null
  const { data, error } = await supabase.storage.from("feedback-audio").createSignedUrl(path, 600)
  if (error || !data) return null
  return data.signedUrl
}

function cell(value: string | number) {
  const text = String(value).replace(/\r?\n/g, " ")
  return `"${text.replace(/"/g, '""')}"`
}

export function notesToCsv(notes: AdminNote[]) {
  const header = ["date", "rating", "name", "username", "email", "voice_file", "text_source", "text"]
  const lines = notes.map((note) =>
    [
      note.createdAt,
      note.rating,
      note.firstName ?? "Anonymous",
      note.username ?? "",
      note.email ?? "",
      note.audioPath ? "yes" : "no",
      note.status,
      note.body,
    ]
      .map(cell)
      .join(",")
  )
  return [header.map(cell).join(","), ...lines].join("\r\n")
}

export function downloadText(filename: string, text: string, type = "text/csv") {
  const url = URL.createObjectURL(new Blob([text], { type: `${type};charset=utf-8` }))
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
