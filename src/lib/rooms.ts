import type { PathId } from "@/data/questions"
import { normalizeAvatar, type AvatarChoice } from "@/lib/avatar"
import { accountsOffline, supabase } from "@/lib/supabase"

export type RoomInfo = {
  id: string
  code: string
  path: PathId
  questionCount: number
  seed: string
  expiresAt: string
  hostId: string
  hostName: string
}

export type RoomPlayer = {
  userId: string
  username: string
  firstName: string
  avatar: AvatarChoice
  status: "waiting" | "playing" | "finished"
  position: number | null
  correct: number | null
  points: number | null
  totalTimeMs: number | null
  isHost: boolean
  invited: boolean
}

export type RoomView = { room: RoomInfo; players: RoomPlayer[] }

export type RoomSummary = {
  code: string
  path: PathId
  questionCount: number
  expiresAt: string
  hostName: string
  playerCount: number
  finished: boolean
  started: boolean
  invitedByName: string | null
  myPoints: number | null
}

type Result<T> = { data: T; error: null } | { data: null; error: string }

const CODE_LENGTH = 6

// Turns the short codes raised by the database into sentences for the player.
export function roomError(message: string | undefined) {
  const text = (message ?? "").toLowerCase()
  if (text.includes("not_signed_in")) return "Log in to use rooms."
  if (text.includes("room_not_found")) return "No room has that code. Check it with the host."
  if (text.includes("room_expired")) return "That room has closed."
  if (text.includes("room_full")) return "That room is full."
  if (text.includes("not_member")) return "You are not in that room yet."
  if (text.includes("already_played")) return "You already played this room. Each room allows one attempt."
  if (text.includes("already_finished")) return "Your score for this room is already saved."
  if (text.includes("too_many_rooms")) return "You have 10 open rooms. Wait for one to close."
  if (text.includes("not_friends")) return "You can only challenge friends."
  if (text.includes("too_late") || text.includes("not_started")) {
    return "That round took too long to finish, so the score could not be saved."
  }
  if (text.includes("bad_score")) return "That score could not be saved."
  return "That did not work. Try again."
}

function offline<T>(): Result<T> {
  return { data: null, error: accountsOffline }
}

// Upper case, no spaces, and only the characters a code can contain.
export function normalizeCode(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, CODE_LENGTH)
}

export function codeLooksComplete(value: string) {
  return normalizeCode(value).length === CODE_LENGTH
}

export function roomLink(code: string) {
  return `${window.location.origin}/join/${code}`
}

export function pathTitle(path: PathId) {
  return path === "history" ? "History" : path === "science" ? "Science" : "General knowledge"
}

function mapRoom(raw: Record<string, unknown>): RoomInfo {
  return {
    id: String(raw.id),
    code: String(raw.code),
    path: raw.path === "history" || raw.path === "science" ? raw.path : "general",
    questionCount: typeof raw.question_count === "number" ? raw.question_count : 10,
    seed: String(raw.seed),
    expiresAt: String(raw.expires_at),
    hostId: String(raw.host_id),
    hostName: String(raw.host_name ?? "Someone"),
  }
}

function mapPlayer(raw: Record<string, unknown>): RoomPlayer {
  const status = raw.status === "finished" || raw.status === "playing" ? raw.status : "waiting"
  const number = (value: unknown) => (typeof value === "number" ? value : null)
  return {
    userId: String(raw.user_id),
    username: String(raw.username),
    firstName: String(raw.first_name),
    avatar: normalizeAvatar(raw.avatar),
    status,
    position: number(raw.position),
    correct: number(raw.correct),
    points: number(raw.points),
    totalTimeMs: number(raw.total_time_ms),
    isHost: Boolean(raw.is_host),
    invited: Boolean(raw.invited),
  }
}

export async function createRoom(
  path: PathId,
  count: 5 | 10,
  invite: string | null = null
): Promise<Result<RoomInfo>> {
  if (!supabase) return offline()
  const { data, error } = await supabase.rpc("create_room", {
    p_path: path,
    p_count: count,
    p_invite: invite,
  })
  if (error) return { data: null, error: roomError(error.message) }
  return { data: mapRoom(data as Record<string, unknown>), error: null }
}

export async function joinRoom(code: string): Promise<Result<RoomInfo>> {
  if (!supabase) return offline()
  const { data, error } = await supabase.rpc("join_room", { p_code: normalizeCode(code) })
  if (error) return { data: null, error: roomError(error.message) }
  return { data: mapRoom(data as Record<string, unknown>), error: null }
}

export type RoomLookup = Result<RoomView> | { data: null; error: string; notMember: true }

export async function getRoom(code: string): Promise<RoomLookup> {
  if (!supabase) return offline()
  const { data, error } = await supabase.rpc("get_room", { p_code: normalizeCode(code) })
  if (error) {
    if (error.message.toLowerCase().includes("not_member")) {
      return { data: null, error: roomError(error.message), notMember: true }
    }
    return { data: null, error: roomError(error.message) }
  }
  const view = data as { room: Record<string, unknown>; players: Array<Record<string, unknown>> }
  return {
    data: { room: mapRoom(view.room), players: (view.players ?? []).map(mapPlayer) },
    error: null,
  }
}

export async function beginRoomRound(roomId: string): Promise<string | null> {
  if (!supabase) return accountsOffline
  const { error } = await supabase.rpc("begin_room_round", { p_room: roomId })
  return error ? roomError(error.message) : null
}

export async function submitRoomScore(input: {
  roomId: string
  correct: number
  points: number
  totalTimeMs: number
}): Promise<string | null> {
  if (!supabase) return accountsOffline
  const { error } = await supabase.rpc("submit_room_score", {
    p_room: input.roomId,
    p_correct: input.correct,
    p_points: input.points,
    p_time_ms: Math.max(0, Math.round(input.totalTimeMs)),
  })
  return error ? roomError(error.message) : null
}

export async function loadMyRooms(): Promise<Result<RoomSummary[]>> {
  if (!supabase) return offline()
  const { data, error } = await supabase.rpc("my_rooms")
  if (error) {
    return { data: null, error: "Rooms could not be loaded. Run supabase/schema.sql again." }
  }
  const rows = ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    code: String(row.code),
    path: row.path === "history" || row.path === "science" ? row.path : ("general" as PathId),
    questionCount: typeof row.question_count === "number" ? row.question_count : 10,
    expiresAt: String(row.expires_at),
    hostName: String(row.host_name ?? "Someone"),
    playerCount: typeof row.player_count === "number" ? row.player_count : 1,
    finished: Boolean(row.finished),
    started: Boolean(row.started),
    invitedByName: typeof row.invited_by_name === "string" ? row.invited_by_name : null,
    myPoints: typeof row.my_points === "number" ? row.my_points : null,
  }))
  return { data: rows, error: null }
}

// "Closes in 5 hours", "Closes in 2 days", or "Closed".
export function closesIn(expiresAt: string) {
  const left = new Date(expiresAt).getTime() - Date.now()
  if (left <= 0) return "Closed"
  const minutes = Math.ceil(left / 60000)
  if (minutes < 60) return `Closes in ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 48) return `Closes in ${hours} h`
  return `Closes in ${Math.floor(hours / 24)} days`
}

export function isOpen(expiresAt: string) {
  return new Date(expiresAt).getTime() > Date.now()
}

export function seconds(ms: number | null) {
  return ms === null ? "" : `${(ms / 1000).toFixed(1)}s`
}
