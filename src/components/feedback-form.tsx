import { useEffect, useRef, useState } from "react"
import { GameButton } from "@/components/game-button"
import { saveFeedback } from "@/lib/feedback"
import { startDictation, type Dictation } from "@/lib/speech"
import { usePlayer } from "@/store/player"
import { cn } from "cn"

const MAX_SECONDS = 60

export function FeedbackForm({
  onSent,
  compact = false,
}: {
  onSent?: () => void
  compact?: boolean
}) {
  const userId = usePlayer((state) => state.userId)
  const [rating, setRating] = useState(0)
  const [note, setNote] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [recording, setRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<number | null>(null)
  const fileRef = useRef<File | null>(null)
  const urlRef = useRef<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const dictationRef = useRef<Dictation | null>(null)
  const spokenRef = useRef(false)
  const [listening, setListening] = useState(false)

  useEffect(() => {
    return () => {
      dictationRef.current?.stop()
      if (timerRef.current) window.clearInterval(timerRef.current)
      const recorder = recorderRef.current
      if (recorder && recorder.state !== "inactive") recorder.stop()
      streamRef.current?.getTracks().forEach((track) => track.stop())
      if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    }
  }, [])

  function releaseMic() {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }

  function clearTimer() {
    if (timerRef.current) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  function stopDictation() {
    dictationRef.current?.stop()
    dictationRef.current = null
    setListening(false)
  }

  function finishRecording() {
    clearTimer()
    stopDictation()
    const recorder = recorderRef.current
    if (recorder && recorder.state !== "inactive") recorder.stop()
    setRecording(false)
  }

  function storeClip(blob: Blob, type: string) {
    const ext = type.includes("mp4") ? "m4a" : "webm"
    fileRef.current = new File([blob], `facts-finder-feedback.${ext}`, { type })
    if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    const url = URL.createObjectURL(blob)
    urlRef.current = url
    setAudioUrl(url)
  }

  async function startRecording() {
    setError(null)
    setStatus(null)
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("This browser cannot record a voice note. You can still type feedback.")
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((type) =>
        MediaRecorder.isTypeSupported(type)
      )
      const recorder = mime
        ? new MediaRecorder(stream, { mimeType: mime })
        : new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data)
      }
      recorder.onstop = () => {
        const type = recorder.mimeType || mime || "audio/webm"
        storeClip(new Blob(chunksRef.current, { type }), type)
        releaseMic()
      }
      recorderRef.current = recorder
      recorder.start()
      setRecording(true)
      setSeconds(0)

      // Spoken words type themselves into the note while the clip records.
      const typedBefore = note.trim()
      spokenRef.current = false
      const dictation = startDictation((spoken) => {
        if (spoken) spokenRef.current = true
        setNote(typedBefore ? `${typedBefore} ${spoken}`.trim() : spoken)
      })
      dictationRef.current = dictation
      setListening(dictation !== null)
      const started = Date.now()
      timerRef.current = window.setInterval(() => {
        const elapsed = Math.min(MAX_SECONDS, Math.floor((Date.now() - started) / 1000))
        setSeconds(elapsed)
        if (elapsed >= MAX_SECONDS) finishRecording()
      }, 250)
    } catch {
      releaseMic()
      setError("The microphone stayed off. You can still type a note.")
    }
  }

  function playClip() {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = 0
    void audio.play()
  }

  async function send() {
    if (recording) {
      finishRecording()
      setStatus("Recording stopped. Tap Send when the clip is ready.")
      return
    }
    if (rating < 1) {
      setError("Choose a rating from 1 to 5.")
      setStatus(null)
      return
    }
    setError(null)
    const written = note.trim()
    const saved = await saveFeedback({
      userId,
      rating,
      body: written,
      file: fileRef.current,
      transcriptStatus: fileRef.current && written && spokenRef.current ? "browser" : "none",
    })
    if (saved) {
      setStatus("Saved. Thank you.")
      onSent?.()
      return
    }
    const delivered = await shareOrCopy({
      rating,
      body: written || "Voice note only.",
      file: fileRef.current,
      url: urlRef.current,
    })
    if (delivered.cancelled) return
    setStatus(delivered.status)
    if (delivered.close) onSent?.()
  }

  const clock = `0:${String(seconds).padStart(2, "0")}`

  return (
    <div className="flex flex-col gap-3">
      <div role="radiogroup" aria-label="Rating" className="flex justify-between gap-2">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={rating === value}
            aria-label={`${value} out of 5`}
            onClick={() => setRating(value)}
            className={cn(
              "font-display h-11 flex-1 rounded-xl border-2 text-lg font-extrabold",
              rating >= value
                ? "border-transparent bg-lime text-ink"
                : "border-border bg-card text-muted-foreground"
            )}
          >
            {value}
          </button>
        ))}
      </div>
      <textarea
        value={note}
        onChange={(event) => setNote(event.target.value)}
        aria-label="Written feedback"
        readOnly={listening}
        placeholder={listening ? "Start talking. Your words appear here." : "What should we change?"}
        className={cn(
          "w-full resize-y rounded-[14px] border-2 border-input bg-card px-3 py-3 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring",
          compact ? "min-h-20" : "min-h-32"
        )}
      />
      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="text-sm font-semibold">Voice note</p>
        <p className="mt-1 text-sm text-muted-foreground" aria-live="polite">
          {recording ? `Recording ${clock} of 1:00` : audioUrl ? `Ready ${clock}` : "Up to 1 minute"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {listening
            ? "Your words are being written in the note box. Fix any wrong word after you stop."
            : "Your voice note is also turned into text, so it can be read."}
        </p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <GameButton
            type="button"
            variant="ghost"
            className="h-11 text-sm"
            disabled={recording}
            onClick={() => void startRecording()}
          >
            Record
          </GameButton>
          <GameButton
            type="button"
            variant="ghost"
            className="h-11 text-sm"
            disabled={!recording}
            onClick={finishRecording}
          >
            Stop
          </GameButton>
          <GameButton
            type="button"
            variant="ghost"
            className="h-11 text-sm"
            disabled={!audioUrl || recording}
            onClick={playClip}
          >
            Play
          </GameButton>
        </div>
        {audioUrl ? <audio ref={audioRef} src={audioUrl} className="sr-only" /> : null}
      </div>
      {error ? (
        <p role="alert" className="text-sm font-semibold text-wrong">
          {error}
        </p>
      ) : null}
      {status ? (
        <p role="status" className="text-sm text-muted-foreground">
          {status}
        </p>
      ) : null}
      <GameButton type="button" onClick={() => void send()}>
        Send
      </GameButton>
    </div>
  )
}

async function shareOrCopy(input: {
  rating: number
  body: string
  file: File | null
  url: string | null
}) {
  const text = `Rating: ${input.rating}/5\n\n${input.body}`
  const shareFiles = input.file ? canShareFile(input.file) : false
  if (navigator.share && (shareFiles || !input.file)) {
    try {
      if (shareFiles && input.file) {
        await navigator.share({ title: "Facts-Finder feedback", text, files: [input.file] })
      } else {
        await navigator.share({ title: "Facts-Finder feedback", text })
      }
      return { close: true, cancelled: false, status: "Shared from this phone." }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return { close: false, cancelled: true, status: "" }
      }
    }
  }
  if (input.file && input.url) {
    const link = document.createElement("a")
    link.href = input.url
    link.download = input.file.name
    link.click()
  }
  let copied = false
  try {
    await navigator.clipboard.writeText(text)
    copied = true
  } catch {
    /* Clipboard can be blocked; the note stays on screen. */
  }
  if (input.file && copied) {
    return {
      close: false,
      cancelled: false,
      status: "Saving failed. The voice note downloaded, and the text is copied. Send both.",
    }
  }
  if (input.file) {
    return {
      close: false,
      cancelled: false,
      status: "Saving failed. The voice note downloaded. Copy the text and send both.",
    }
  }
  if (copied) {
    return {
      close: false,
      cancelled: false,
      status: "Saving failed. The note is copied. Paste it into WhatsApp, Messages, or mail.",
    }
  }
  return {
    close: false,
    cancelled: false,
    status: "Saving failed. Copy the rating and the note, then send them.",
  }
}

function canShareFile(file: File) {
  if (!navigator.canShare) return false
  try {
    return navigator.canShare({ files: [file] })
  } catch {
    return false
  }
}
