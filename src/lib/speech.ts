// Browser speech-to-text, used while a voice note is recording.
// Android Chrome and desktop Chrome do this well. iPhones are skipped on
// purpose: running dictation next to the recorder can cut the audio file, and
// those notes are transcribed on the server after upload instead.

type Alternative = { transcript: string }
type RecognitionResult = { isFinal: boolean; [index: number]: Alternative }
type RecognitionEvent = {
  resultIndex: number
  results: { length: number; [index: number]: RecognitionResult }
}
type RecognitionErrorEvent = { error: string }

interface Recognition {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((event: RecognitionEvent) => void) | null
  onerror: ((event: RecognitionErrorEvent) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

type RecognitionConstructor = new () => Recognition

function recognitionConstructor(): RecognitionConstructor | null {
  const scope = window as unknown as {
    SpeechRecognition?: RecognitionConstructor
    webkitSpeechRecognition?: RecognitionConstructor
  }
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition ?? null
}

function onApplePhone() {
  const agent = navigator.userAgent
  if (/iPad|iPhone|iPod/.test(agent)) return true
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1
}

export function canDictate() {
  return !onApplePhone() && recognitionConstructor() !== null
}

export type Dictation = { stop: () => void }

// onText receives everything spoken so far in this recording, as one string.
export function startDictation(onText: (text: string) => void): Dictation | null {
  const Ctor = recognitionConstructor()
  if (!Ctor || onApplePhone()) return null

  const recognition = new Ctor()
  recognition.lang = navigator.language || "en-US"
  recognition.continuous = true
  recognition.interimResults = true

  let active = true
  let finals = ""

  recognition.onresult = (event) => {
    let interim = ""
    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      const result = event.results[index]
      const piece = result[0]?.transcript ?? ""
      if (result.isFinal) finals += `${piece.trim()} `
      else interim += piece
    }
    onText(`${finals}${interim}`.trim())
  }

  recognition.onerror = (event) => {
    // Silence and aborted starts are normal. Anything else means stop trying.
    if (event.error !== "no-speech" && event.error !== "aborted") active = false
  }

  // Chrome ends a session after a pause. Start again while still recording.
  recognition.onend = () => {
    if (!active) return
    try {
      recognition.start()
    } catch {
      active = false
    }
  }

  try {
    recognition.start()
  } catch {
    return null
  }

  return {
    stop: () => {
      active = false
      try {
        recognition.stop()
      } catch {
        /* Already stopped. */
      }
    },
  }
}
