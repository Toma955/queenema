import { useEffect, useRef, useState } from "react";
import GlassSurface from "./GlassSurface.jsx";

export default function GlassIsland({ onSend, onSendVoice, disabled }) {
  const [text, setText] = useState("");
  const [recording, setRecording] = useState(false);
  const mediaRef = useRef(null);
  const chunksRef = useRef([]);

  useEffect(() => {
    return () => {
      mediaRef.current?.stream?.getTracks?.().forEach((t) => t.stop());
    };
  }, []);

  function submitText(event) {
    event.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText("");
  }

  async function toggleVoice() {
    if (disabled) return;

    if (recording) {
      mediaRef.current?.stop();
      setRecording(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/mp4")
        ? "audio/mp4"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "";
      const recorder = new MediaRecorder(
        stream,
        mime ? { mimeType: mime } : undefined
      );
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        const reader = new FileReader();
        reader.onloadend = () => {
          onSendVoice(reader.result, blob.type);
        };
        reader.readAsDataURL(blob);
      };
      mediaRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      /* mic denied */
    }
  }

  return (
    <GlassSurface
      className="glass-surface--island"
      width="auto"
      height={62}
      borderRadius={28}
      backgroundOpacity={0.1}
      saturation={1.6}
      style={{
        alignSelf: "stretch",
        marginLeft: "0.75rem",
        marginRight: "0.75rem",
        marginBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))",
      }}
    >
      <form className="island" onSubmit={submitText}>
        <button
          type="button"
          className={`island__mic ${recording ? "is-rec" : ""}`}
          onClick={toggleVoice}
          disabled={disabled}
          aria-label={recording ? "Stop" : "Glasovna poruka"}
        >
          {recording ? "REC" : "MIC"}
        </button>
        <input
          className="island__input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={recording ? "snimam…" : "Poruka…"}
          disabled={disabled || recording}
          enterKeyHint="send"
          maxLength={2000}
        />
        <button
          type="submit"
          className="island__send"
          disabled={disabled || recording || !text.trim()}
          aria-label="Pošalji"
        >
          ↑
        </button>
      </form>
    </GlassSurface>
  );
}
