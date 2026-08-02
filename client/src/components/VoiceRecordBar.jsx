import { Send, X } from "lucide-react";
import { formatRecTime } from "../hooks/useVoiceRecorder.js";

/**
 * Traka dok se snima glasovna — poništi / timer / pošalji.
 */
export default function VoiceRecordBar({ elapsed = 0, onCancel, onSend }) {
  return (
    <div className="voice-rec island island--bar" role="status" aria-live="polite">
      <button
        type="button"
        className="voice-rec__cancel"
        onClick={onCancel}
        aria-label="Poništi snimanje"
      >
        <X size={18} strokeWidth={2.4} />
      </button>

      <div className="voice-rec__center">
        <span className="voice-rec__dot" aria-hidden />
        <span className="voice-rec__label">Snimanje</span>
        <span className="voice-rec__time">{formatRecTime(elapsed)}</span>
        <div className="voice-rec__wave" aria-hidden>
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
      </div>

      <button
        type="button"
        className="voice-rec__send"
        onClick={onSend}
        aria-label="Pošalji glasovnu"
      >
        <Send size={16} strokeWidth={2.4} />
      </button>
    </div>
  );
}
