import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";

function fmt(sec) {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const s = Math.floor(sec);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

/**
 * Custom glasovna poruka — play/pause + premotavanje (seek).
 * `durationHint` dolazi sa snimanja (webm često nema duration u metapodacima).
 */
export default function VoicePlayer({ src, durationHint = 0 }) {
  const audioRef = useRef(null);
  const barRef = useRef(null);
  const dragging = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(
    Number.isFinite(durationHint) && durationHint > 0 ? durationHint : 0
  );

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !src) return;

    const syncDuration = () => {
      const d = audio.duration;
      if (Number.isFinite(d) && d > 0 && d !== Infinity) {
        setDuration((prev) => (prev > 0 ? Math.max(prev, d) : d));
      } else if (Number.isFinite(durationHint) && durationHint > 0) {
        setDuration(durationHint);
      }
    };

    const onTime = () => {
      if (dragging.current) return;
      setCurrent(audio.currentTime || 0);
      syncDuration();
    };
    const onEnd = () => {
      setPlaying(false);
      setCurrent(0);
    };
    const onMeta = () => {
      // MediaRecorder webm često prijavi Infinity — force-read duration
      if (!Number.isFinite(audio.duration) || audio.duration === Infinity) {
        try {
          const onTU = () => {
            audio.removeEventListener("timeupdate", onTU);
            audio.currentTime = 0;
            syncDuration();
          };
          audio.addEventListener("timeupdate", onTU);
          audio.currentTime = 1e101;
        } catch {
          syncDuration();
        }
      } else {
        syncDuration();
      }
    };

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("ended", onEnd);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("durationchange", syncDuration);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("ended", onEnd);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("durationchange", syncDuration);
    };
  }, [src, durationHint]);

  async function toggle(e) {
    e?.stopPropagation?.();
    const audio = audioRef.current;
    if (!audio || !src) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
      return;
    }
    try {
      await audio.play();
      setPlaying(true);
    } catch {
      setPlaying(false);
    }
  }

  function seekTo(clientX) {
    const audio = audioRef.current;
    const bar = barRef.current;
    const total = duration > 0 ? duration : audio?.duration;
    if (!audio || !bar || !Number.isFinite(total) || total <= 0) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const t = ratio * total;
    try {
      audio.currentTime = t;
    } catch {
      /* ignore */
    }
    setCurrent(t);
  }

  function onPointerDown(e) {
    e.stopPropagation();
    e.preventDefault();
    dragging.current = true;
    seekTo(e.clientX);
    const onMove = (ev) => seekTo(ev.clientX);
    const onUp = () => {
      dragging.current = false;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  const total = duration > 0 ? duration : 0;
  const pct = total > 0 ? Math.min(100, (current / total) * 100) : 0;

  return (
    <div className="voice-player" onClick={(e) => e.stopPropagation()}>
      <audio ref={audioRef} src={src} preload="metadata" playsInline />
      <button
        type="button"
        className="voice-player__btn"
        onClick={toggle}
        aria-label={playing ? "Pauza" : "Play"}
      >
        {playing ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
      </button>
      <div className="voice-player__body">
        <div
          className="voice-player__bar"
          ref={barRef}
          onPointerDown={onPointerDown}
          role="slider"
          aria-valuemin={0}
          aria-valuemax={Math.round(total)}
          aria-valuenow={Math.round(current)}
          aria-label="Premotaj glasovnu"
          tabIndex={0}
        >
          <div className="voice-player__fill" style={{ width: `${pct}%` }} />
          <span className="voice-player__knob" style={{ left: `${pct}%` }} />
        </div>
        <div className="voice-player__times">
          <span>{fmt(current)}</span>
          <span>{total > 0 ? fmt(total) : "–:––"}</span>
        </div>
      </div>
    </div>
  );
}
