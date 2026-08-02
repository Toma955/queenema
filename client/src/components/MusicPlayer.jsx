import { useEffect, useRef, useState } from "react";
import GlassSurface from "./GlassSurface.jsx";

const TRACK = "/music/track.mp3";

export default function MusicPlayer() {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTime = () => {
      if (!audio.duration) return;
      setProgress((audio.currentTime / audio.duration) * 100);
    };
    const onEnd = () => setPlaying(false);
    const onCanPlay = () => setReady(true);
    const onError = () => setFailed(true);

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("ended", onEnd);
    audio.addEventListener("canplay", onCanPlay);
    audio.addEventListener("error", onError);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("ended", onEnd);
      audio.removeEventListener("canplay", onCanPlay);
      audio.removeEventListener("error", onError);
    };
  }, []);

  async function toggle() {
    const audio = audioRef.current;
    if (!audio || failed) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
      return;
    }
    try {
      await audio.play();
      setPlaying(true);
    } catch {
      setFailed(true);
    }
  }

  return (
    <GlassSurface
      className="glass-surface--music"
      width="auto"
      height={64}
      borderRadius={20}
      backgroundOpacity={0.08}
      saturation={1.4}
      style={{ alignSelf: "stretch", marginLeft: "0.85rem", marginRight: "0.85rem" }}
    >
      <div className="music">
        <audio ref={audioRef} src={TRACK} preload="metadata" playsInline />
        <button
          type="button"
          className="music__btn"
          onClick={toggle}
          aria-label={playing ? "Pause" : "Play"}
          disabled={failed}
        >
          {playing ? "❚❚" : "▶"}
        </button>
        <div className="music__meta">
          <p className="music__title">queenema radio</p>
          <p className="music__sub">
            {failed
              ? "dodaj /music/track.mp3"
              : ready
                ? "now playing"
                : "loading…"}
          </p>
          <div className="music__bar">
            <div className="music__fill" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <div className={`music__eq ${playing ? "is-on" : ""}`} aria-hidden>
          <span />
          <span />
          <span />
        </div>
      </div>
    </GlassSurface>
  );
}
