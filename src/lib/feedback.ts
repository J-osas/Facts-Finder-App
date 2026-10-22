import { supabase } from "@/lib/supabase"

export type TranscriptStatus = "none" | "browser" | "pending"

export async function saveFeedback(input: {
  userId: string | null
  rating: number
  body: string
  file: File | null
  transcriptStatus: TranscriptStatus
}) {
  if (!supabase) return false
  let audioPath: string | null = null
  if (input.file) {
    const ext = input.file.type.includes("mp4") ? "m4a" : "webm"
    audioPath = `${input.userId ?? "anon"}/${crypto.randomUUID()}.${ext}`
    const uploaded = await supabase.storage.from("feedback-audio").upload(audioPath, input.file, {
      contentType: input.file.type || "audio/webm",
      upsert: false,
    })
    if (uploaded.error) return false
  }
  // The id is made here so the server can be asked to transcribe this exact row.
  const id = crypto.randomUUID()
  const inserted = await supabase.from("feedback").insert({
    id,
    user_id: input.userId,
    rating: input.rating,
    body: input.body || null,
    audio_path: audioPath,
    transcript_status: audioPath && !input.body ? "pending" : input.transcriptStatus,
  })
  if (inserted.error) return false
  if (audioPath && !input.body) void requestTranscript(id)
  return true
}

// Asks the server to turn a stored voice note into text. A failure here never
// blocks the player: the note is already saved, and the admin can retry.
export async function requestTranscript(feedbackId: string) {
  if (!supabase) return false
  const { error } = await supabase.functions.invoke("transcribe-feedback", {
    body: { feedbackId },
  })
  return !error
}
