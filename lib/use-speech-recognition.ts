"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Push-to-talk wrapper around the browser's Web Speech API
 * (window.SpeechRecognition / window.webkitSpeechRecognition).
 *
 * Behaviour:
 *  - `start()` opens the mic and streams transcription. Finalized phrases
 *    accumulate in `transcript`; the current in-flight phrase is in
 *    `interim`. Both are reset on the next `start()`.
 *  - `stop()` ends the session cleanly. The session also ends if the
 *    browser auto-stops on long silence; we expose that via `listening`.
 *  - On unsupported browsers, `supported` is false and start/stop are
 *    no-ops — the UI should hide the mic button in that case.
 */
export function useSpeechRecognition(options?: { lang?: string }) {
  const lang = options?.lang ?? "en-US";

  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const SR =
      (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    setSupported(Boolean(SR));
  }, []);

  const start = useCallback(() => {
    if (typeof window === "undefined") return;
    const SR =
      (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SR) {
      setError("Speech recognition is not supported in this browser.");
      return;
    }
    // Reuse if already listening
    if (recRef.current && listening) return;

    setError(null);
    setTranscript("");
    setInterim("");

    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = lang;

    rec.onresult = (event: any) => {
      let finalChunk = "";
      let interimChunk = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const r = event.results[i];
        const text: string = r[0]?.transcript ?? "";
        if (r.isFinal) finalChunk += text;
        else interimChunk += text;
      }
      if (finalChunk) {
        setTranscript((prev) => (prev ? prev + " " : "") + finalChunk.trim());
      }
      setInterim(interimChunk);
    };

    rec.onerror = (e: any) => {
      const code = e?.error ?? "unknown";
      // 'no-speech' fires when there's silence; not really an error to surface.
      if (code === "no-speech" || code === "aborted") return;
      if (code === "not-allowed" || code === "service-not-allowed") {
        setError("Microphone permission denied. Allow access in your browser settings.");
      } else {
        setError(`Speech recognition error: ${code}`);
      }
    };

    rec.onend = () => {
      setListening(false);
      setInterim("");
    };

    try {
      rec.start();
      recRef.current = rec;
      setListening(true);
    } catch (e: any) {
      setError(e?.message ?? "Could not start the microphone.");
    }
  }, [lang, listening]);

  const stop = useCallback(() => {
    const rec = recRef.current;
    if (!rec) return;
    try {
      rec.stop();
    } catch {}
  }, []);

  const reset = useCallback(() => {
    setTranscript("");
    setInterim("");
    setError(null);
  }, []);

  // Stop the recogniser on unmount so the mic icon in the browser tab
  // releases properly.
  useEffect(() => {
    return () => {
      const rec = recRef.current;
      if (rec) {
        try {
          rec.stop();
        } catch {}
      }
    };
  }, []);

  return { supported, listening, transcript, interim, error, start, stop, reset };
}
