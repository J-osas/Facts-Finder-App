import { normalizeAvatar, type AvatarChoice } from "@/lib/avatar"
import { accountsOffline, supabase } from "@/lib/supabase"

export type Relation = "none" | "friend" | "sent" | "received"

export type Friend = {
  id: string
  username: string
  firstName: string
  avatar: AvatarChoice
  xp: number
}

export type FoundPlayer = {
  id: string
  username: string
  firstName: string
  avatar: AvatarChoice
  relation: Relation
}

export type FriendRequest = {
  requestId: string
  id: string
  username: string
  firstName: string
  avatar: AvatarChoice
  direction: "incoming" | "outgoing"
}

type Result<T> = { data: T; error: null } | { data: null; error: string }

// Turns the short codes raised by the database into sentences for the player.
export function friendError(message: string | undefined) {
  const text = (message ?? "").toLowerCase()
  if (text.includes("not_signed_in")) return "Log in to use friends."
  if (text.includes("self_request")) return "That is your own username."
  if (text.includes("player_not_found")) return "That player could not be found."
  return "That did not work. Try again."
}

function offline<T>(): Result<T> {
  return { data: null, error: accountsOffline }
}

export async function findPlayer(username: string): Promise<Result<FoundPlayer | null>> {
  if (!supabase) return offline()
  const clean = username.trim().replace(/^@/, "").toLowerCase()
  if (!clean) return { data: null, error: "Type a username." }
  const { data, error } = await supabase.rpc("find_player", { p_username: clean })
  if (error) return { data: null, error: friendError(error.message) }
  const row = (data as Array<Record<string, unknown>> | null)?.[0]
  if (!row) return { data: null, error: null }
  return {
    data: {
      id: String(row.id),
      username: String(row.username),
      firstName: String(row.first_name),
      avatar: normalizeAvatar(row.avatar),
      relation: row.relation as Relation,
    },
    error: null,
  }
}

export async function sendFriendRequest(target: string): Promise<Result<"sent" | "accepted" | "already">> {
  if (!supabase) return offline()
  const { data, error } = await supabase.rpc("send_friend_request", { p_target: target })
  if (error) return { data: null, error: friendError(error.message) }
  return { data: data as "sent" | "accepted" | "already", error: null }
}

export async function respondToRequest(requestId: string, accept: boolean): Promise<string | null> {
  if (!supabase) return accountsOffline
  const { error } = await supabase.rpc("respond_friend_request", {
    p_request: requestId,
    p_accept: accept,
  })
  return error ? friendError(error.message) : null
}

export async function removeFriend(other: string): Promise<string | null> {
  if (!supabase) return accountsOffline
  const { error } = await supabase.rpc("remove_friend", { p_other: other })
  return error ? friendError(error.message) : null
}

export async function loadFriends(): Promise<Result<Friend[]>> {
  if (!supabase) return offline()
  const { data, error } = await supabase.rpc("my_friends")
  if (error) {
    return { data: null, error: "Friends could not be loaded. Run supabase/schema.sql again." }
  }
  const rows = ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    id: String(row.id),
    username: String(row.username),
    firstName: String(row.first_name),
    avatar: normalizeAvatar(row.avatar),
    xp: typeof row.xp === "number" ? row.xp : 0,
  }))
  return { data: rows, error: null }
}

export async function loadRequests(): Promise<Result<FriendRequest[]>> {
  if (!supabase) return offline()
  const { data, error } = await supabase.rpc("my_friend_requests")
  if (error) {
    return { data: null, error: "Requests could not be loaded. Run supabase/schema.sql again." }
  }
  const rows = ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    requestId: String(row.request_id),
    id: String(row.id),
    username: String(row.username),
    firstName: String(row.first_name),
    avatar: normalizeAvatar(row.avatar),
    direction: row.direction === "incoming" ? ("incoming" as const) : ("outgoing" as const),
  }))
  return { data: rows, error: null }
}
