import { useEffect, useRef, useState } from "react";
import GlassSurface from "./GlassSurface.jsx";
import PatienceBar from "./PatienceBar.jsx";
import { apiUrl } from "../lib/api.js";

function mediaSrc(url) {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return apiUrl(url);
}

export default function ConversationView({
  conversation,
  messages,
  features,
  error,
  onBack,
  onPatience,
  onEnd,
  onSend,
  onSendVoice,
}) {
  const [text, setText] = useState("");
  const [recording, setRecording] = useState(false);
  const bottomRef = useRef(null);
  const mediaRef = useRef(null);
  const chunksRef = useRef([]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function submit(e) {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    onSend(t);
    setText("");
  }

  async function toggleVoice() {
    if (!features.voice) return;
    if (recording) {
      mediaRef.current?.stop();
      setRecording(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/mp4")
        ? "audio/mp4"
        : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType: mime });
      chunksRef.current = [];
      recorder.ondataavailable = (ev) => {
        if (ev.data.size) chunksRef.current.push(ev.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
        const reader = new FileReader();
        reader.onloadend = () => onSendVoice(reader.result, blob.type);
        reader.readAsDataURL(blob);
      };
      mediaRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      /* mic */
    }
  }

  const maxChars = features?.maxChars;
  const ended = conversation?.status === "ended";

  return (
    <section className="conv">
      <header className="conv__head">
        <button type="button" className="ghost-btn" onClick={onBack}>
          ←
        </button>
        <div className="conv__who">
          {conversation?.guestAvatar ? (
            <img src={mediaSrc(conversation.guestAvatar)} alt="" className="req__ava sm" />
          ) : null}
          <div>
            <h2 className="conv__title">{conversation?.guestName}</h2>
            <p className="conv__sub">
              {conversation?.meta?.device || "?"} · {conversation?.meta?.ip || "ip?"}
            </p>
          </div>
        </div>
        {!ended ? (
          <button type="button" className="ghost-btn" onClick={onEnd}>
            Kraj
          </button>
        ) : (
          <span />
        )}
      </header>

      {conversation?.guestBio ? (
        <p className="conv__bio">{conversation.guestBio}</p>
      ) : null}

      <PatienceBar
        value={conversation?.patience ?? 50}
        onChange={onPatience}
        readonly={ended}
        features={features}
      />

      <div className="unlocks">
        <span className={features.limited ? "on warn" : ""}>limit</span>
        <span className={features.voice ? "on" : ""}>glas</span>
        <span className={features.call ? "on" : ""}>poziv</span>
        <span className={features.video ? "on" : ""}>video</span>
        <span className={features.coffee ? "on coffee" : ""}>kava</span>
      </div>

      <div className="chat-stream">
        {messages.map((m) => {
          const mine = m.from === "ema";
          return (
            <article key={m.id} className={`msg ${mine ? "is-mine" : ""}`}>
              {m.type === "voice" ? (
                <audio controls src={mediaSrc(m.media_url)} />
              ) : (
                <p className="msg__text">{m.text}</p>
              )}
            </article>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {error ? <p className="err pad">{error}</p> : null}

      {!ended ? (
        <GlassSurface
          width="auto"
          height={62}
          borderRadius={28}
          backgroundOpacity={0.1}
          saturation={1.5}
          style={{
            alignSelf: "stretch",
            margin: "0 0.75rem calc(0.75rem + env(safe-area-inset-bottom))",
          }}
        >
          <form className="island" onSubmit={submit}>
            <button
              type="button"
              className={`island__mic ${recording ? "is-rec" : ""}`}
              onClick={toggleVoice}
              disabled={!features.voice}
            >
              MIC
            </button>
            <input
              className="island__input"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={
                maxChars != null ? `Poruka (max ${maxChars})…` : "Poruka…"
              }
              maxLength={maxChars != null ? maxChars : 2000}
              enterKeyHint="send"
            />
            <button className="island__send" type="submit" disabled={!text.trim()}>
              ↑
            </button>
          </form>
        </GlassSurface>
      ) : null}

      {features.call && !ended ? (
        <div className="call-row">
          <button type="button" className="call-btn" disabled>
            Poziv
          </button>
          <button type="button" className="call-btn" disabled>
            Video
          </button>
          {features.coffee ? (
            <button type="button" className="call-btn coffee">
              Kava?
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
