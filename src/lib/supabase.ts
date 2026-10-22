import { createClient } from "@supabase/supabase-js"

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabaseConfigured = Boolean(url && anonKey)

export const supabase = supabaseConfigured ? createClient(url, anonKey) : null

export const accountsOffline =
  "Accounts are not connected yet. Add the Supabase URL and public key, then try again."
