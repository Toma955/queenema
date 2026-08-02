import { useEffect, useRef, useState } from "react";

function pickMime() {
  if (typeof MediaRecorder === "undefined") return "";
  if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
    return "audio/webm;codecs=opus";
  }
  if (MediaRecorder.isTypeSupported("audio/webm")) return "audio/webm";
  if (MediaRecorder.isTypeSupported("audio/mp4")) return "audio/mp4";
  return "";
}

/**
 * Snimanje glasovne: start → cancel (odbaci) / send (pošalji).
 */
export function useVoiceRecorder({ onSend, onError } = {}) {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const mediaRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const startedAtRef = useRef(0);
  const discardRef = useRef(false);
  const tickRef = useRef(null);
  const onSendRef = useRef(onSend);
  const onErrorRef = useRef(onError);
  onSendRef.current = onSend;
  onErrorRef.current = onError;

  function clearTick() {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }

  function cleanupStream() {
    streamRef.current?.getTracks?.().forEach((t) => t.stop());
    streamRef.current = null;
  }

  useEffect(() => () => {
    clearTick();
    try {
      discardRef.current = true;
      if (mediaRef.current?.state === "recording") mediaRef.current.stop();
    } catch {
      /* ignore */
    }
    cleanupStream();
  }, []);

  async function start() {
    if (recording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = pickMime();
      const recorder = mime
        ? new MediaRecorder(stream, { mimeType: mime })
        : new MediaRecorder(stream);
      chunksRef.current = [];
      discardRef.current = false;
      startedAtRef.current = performance.now();
      setElapsed(0);

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data);
      };
      recorder.onstop = () => {
        clearTick();
        cleanupStream();
        const discard = discardRef.current;
        const durationSec = Math.max(
          0.4,
          (performance.now() - startedAtRef.current) / 1000
        );
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || mime || "audio/webm",
        });
        mediaRef.current = null;
        setRecording(false);
        setElapsed(0);
        if (discard) return;
        if (blob.size < 100) {
          onErrorRef.current?.("Snimka je prekratka — drži mic duže.");
          return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
          onSendRef.current?.(reader.result, blob.type, durationSec);
        };
        reader.readAsDataURL(blob);
      };

      mediaRef.current = recorder;
      recorder.start(200);
      setRecording(true);
      tickRef.current = setInterval(() => {
        setElapsed((performance.now() - startedAtRef.current) / 1000);
      }, 200);
    } catch {
      cleanupStream();
      onErrorRef.current?.("Mikrofon nije dostupan.");
    }
  }

  function stopRecorder() {
    try {
      mediaRef.current?.requestData?.();
    } catch {
      /* ignore */
    }
    try {
      if (mediaRef.current?.state === "recording") mediaRef.current.stop();
      else {
        clearTick();
        cleanupStream();
        setRecording(false);
        setElapsed(0);
      }
    } catch {
      clearTick();
      cleanupStream();
      setRecording(false);
      setElapsed(0);
    }
  }

  function cancel() {
    if (!recording) return;
    discardRef.current = true;
    stopRecorder();
  }

  function send() {
    if (!recording) return;
    discardRef.current = false;
    stopRecorder();
  }

  return { recording, elapsed, start, cancel, send };
}

export function formatRecTime(sec) {
  const s = Math.max(0, Math.floor(sec || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}
