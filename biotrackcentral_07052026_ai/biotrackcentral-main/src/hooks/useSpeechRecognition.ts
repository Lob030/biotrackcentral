import { useState, useEffect, useCallback, useRef } from "react";

// Add global typings for Web Speech API since standard TS DOM library might lack them
interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: { new (): SpeechRecognition };
    webkitSpeechRecognition?: { new (): SpeechRecognition };
  }
}

export type SpeechState = "idle" | "listening" | "processing" | "unsupported" | "error" | "permission_denied";

interface UseSpeechRecognitionReturn {
  state: SpeechState;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  start: () => void;
  stop: () => void;
  reset: () => void;
}

export function useSpeechRecognition(onResult?: (finalText: string) => void): UseSpeechRecognitionReturn {
  const [state, setState] = useState<SpeechState>("idle");
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      setState("unsupported");
      return;
    }

    const rec = new SpeechRec();
    rec.continuous = true;
    rec.interimResults = true;
    // Set lang to es-MX (or standard es) for bioterio operators
    rec.lang = "es-MX";

    rec.onstart = () => {
      setState("listening");
      setError(null);
    };

    rec.onresult = (event: SpeechRecognitionEvent) => {
      let finalStr = "";
      let interimStr = "";

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalStr += event.results[i][0].transcript;
        } else {
          interimStr += event.results[i][0].transcript;
        }
      }

      setInterimTranscript(interimStr);
      if (finalStr) {
        setTranscript((prev) => {
          const updated = prev ? prev + " " + finalStr.trim() : finalStr.trim();
          if (onResult) onResult(updated);
          return updated;
        });
      }
    };

    rec.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === "not-allowed") {
        setState("permission_denied");
        setError("Permiso de micrófono denegado.");
      } else if (event.error === "no-speech") {
        // Just went silent, no big deal
        setState("idle");
      } else if (event.error === "aborted") {
        setState("idle");
      } else {
        setState("error");
        setError(`Error de reconocimiento: ${event.error}`);
      }
    };

    rec.onend = () => {
      setState((s) => (s === "listening" ? "idle" : s));
    };

    recognitionRef.current = rec;

    return () => {
      rec.abort();
    };
  }, [onResult]);

  const start = useCallback(() => {
    if (state === "unsupported" || state === "permission_denied") return;
    try {
      recognitionRef.current?.start();
    } catch (e) {
      // already started?
    }
  }, [state]);

  const stop = useCallback(() => {
    if (state !== "listening") return;
    setState("processing");
    recognitionRef.current?.stop();
  }, [state]);

  const reset = useCallback(() => {
    setTranscript("");
    setInterimTranscript("");
    setError(null);
    if (state !== "unsupported" && state !== "permission_denied") {
      setState("idle");
    }
  }, [state]);

  return {
    state,
    transcript,
    interimTranscript,
    error,
    start,
    stop,
    reset,
  };
}
