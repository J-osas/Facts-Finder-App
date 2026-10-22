// Turns a stored voice note into text and saves it on the feedback row.
//
// Deploy:
//   supabase functions deploy transcribe-feedback
//   supabase secrets set OPENAI_API_KEY=sk-...
//
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase to every
// edge function. They stay on the server and are never sent to the app.
//
// It only works on a row that has a voice file, has no text yet, and is
// waiting or failed. Rows are found by a random id, so it cannot be used to
// transcribe anything else.

import { createClient } from "npm:@supabase/supabase-js@2"

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function reply(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  })
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors })
  if (request.method !== "POST") return reply({ error: "Use POST." }, 405)

  let feedbackId = ""
  try {
    const payload = (await request.json()) as { feedbackId?: unknown }
    feedbackId = typeof payload.feedbackId === "string" ? payload.feedbackId : ""
  } catch {
    return reply({ error: "Send JSON with a feedbackId." }, 400)
  }
  if (!uuid.test(feedbackId)) return reply({ error: "That id is not valid." }, 400)

  const apiKey = Deno.env.get("OPENAI_API_KEY")
  if (!apiKey) {
    // Leave the row waiting so it can be retried once the key is set.
    return reply({ error: "Transcription is not set up yet." }, 503)
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  )

  const found = await supabase
    .from("feedback")
    .select("id, body, audio_path, transcript_status")
    .eq("id", feedbackId)
    .maybeSingle()

  const row = found.data
  if (found.error || !row || !row.audio_path) return reply({ error: "No voice note found." }, 404)
  if (row.body && row.body.trim().length > 0) return reply({ status: "already has text" })
  if (row.transcript_status !== "pending" && row.transcript_status !== "failed") {
    return reply({ status: "nothing to do" })
  }

  const fail = async (message: string) => {
    await supabase.from("feedback").update({ transcript_status: "failed" }).eq("id", row.id)
    return reply({ error: message }, 502)
  }

  const audio = await supabase.storage.from("feedback-audio").download(row.audio_path)
  if (audio.error || !audio.data) return fail("The voice file could not be read.")

  const filename = row.audio_path.endsWith(".m4a") ? "note.m4a" : "note.webm"
  const form = new FormData()
  form.append("file", audio.data, filename)
  form.append("model", Deno.env.get("TRANSCRIBE_MODEL") ?? "gpt-4o-mini-transcribe")

  let text = ""
  try {
    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    })
    if (!response.ok) return fail("The transcription service refused the file.")
    const result = (await response.json()) as { text?: string }
    text = (result.text ?? "").trim()
  } catch {
    return fail("The transcription service could not be reached.")
  }

  const saved = await supabase
    .from("feedback")
    .update({ body: text || null, transcript_status: "done" })
    .eq("id", row.id)
  if (saved.error) return fail("The transcript could not be saved.")

  return reply({ status: "done", characters: text.length })
})
