import { useEffect, useRef } from "react";
import MusicPlayer from "../MusicPlayer.jsx";
import GlassIsland from "../GlassIsland.jsx";
import { apiUrl } from "../../lib/api.js";

function formatTime(value) {
  try {
    const iso = value.includes("T") || value.endsWith("Z") ? value : `${value}Z`;
    return new Date(iso).toLocaleTimeString("hr-HR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function mediaSrc(url) {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return apiUrl(url);
}

export default function ChatMode({
  user,
  partner,
  messages,
  error,
  joining,
  onSend,
  onSendVoice,
}) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <section className="mode mode--chat">
      <MusicPlayer />

      <div className="chat-stream">
        {!user || joining ? (
          <p className="chat-stream__status">spajam…</p>
        ) : messages.length === 0 ? (
          <div className="chat-stream__empty">
            <strong>Chat</strong>
            <span>
              {partner?.online ? "Toma je tu." : "Čekamo Tomu."}
            </span>
          </div>
        ) : (
          messages.map((m) => {
            const mine = user && m.user_id === user.id;
            return (
              <article
                key={m.id}
                className={`msg ${mine ? "is-mine" : ""}`}
              >
                {m.type === "voice" ? (
                  <div className="msg__voice">
                    <audio controls preload="metadata" src={mediaSrc(m.media_url)} />
                  </div>
                ) : (
                  <p className="msg__text">{m.text}</p>
                )}
                <span className="msg__time">{formatTime(m.created_at)}</span>
              </article>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {error ? <p className="chat-error">{error}</p> : null}

      <GlassIsland onSend={onSend} onSendVoice={onSendVoice} disabled={!user} />
    </section>
  );
}
