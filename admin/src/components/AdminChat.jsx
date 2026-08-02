import { useEffect, useRef, useState } from "react";
import { apiUrl } from "../lib/api.js";

function formatTime(value) {
  try {
    const iso = value.includes("T") || value.endsWith("Z") ? value : `${value}Z`;
    return new Date(iso).toLocaleString("hr-HR", {
      day: "2-digit",
      month: "2-digit",
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

const MODES = [
  { id: "update", label: "Update" },
  { id: "sleep", label: "Sleep" },
  { id: "chat", label: "Chat" },
];

export default function AdminChat({
  user,
  partner,
  messages,
  mode,
  error,
  onSend,
  onLeave,
  onClear,
  onSetMode,
}) {
  const [text, setText] = useState("");
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleSubmit(event) {
    event.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText("");
  }

  function handleKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  function handleClear() {
    if (window.confirm("Obrisati sve poruke?")) onClear();
  }

  return (
    <div className="a-layout">
      <aside className="a-side">
        <div>
          <p className="a-side__eyebrow">admin</p>
          <h1 className="a-side__brand">queenema</h1>
        </div>

        <div className="a-card">
          <p className="a-card__label">iPhone mode</p>
          <div className="a-modes">
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                className={`a-mode ${mode === m.id ? "is-active" : ""}`}
                onClick={() => onSetMode(m.id)}
              >
                {m.label}
              </button>
            ))}
          </div>
          <p className="a-card__meta">trenutno: {mode}</p>
        </div>

        <div className="a-card">
          <p className="a-card__label">Ema</p>
          <p className="a-card__value">mobile</p>
          <p className="a-card__meta">
            <span className={`a-dot ${partner?.online ? "is-on" : ""}`} />
            {partner?.online ? "online" : "offline"}
          </p>
        </div>

        <div className="a-card">
          <p className="a-card__label">Poruke</p>
          <p className="a-card__value">{messages.length}</p>
        </div>

        <div className="a-side__actions">
          <button type="button" className="a-btn a-btn--ghost" onClick={handleClear}>
            Obriši chat
          </button>
          <button type="button" className="a-btn a-btn--ghost" onClick={onLeave}>
            Odjavi se
          </button>
        </div>
      </aside>

      <main className="a-main">
        <header className="a-main__header">
          <div>
            <h2 className="a-main__title">Chat s Emom</h2>
            <p className="a-main__sub">desktop admin · mode: {mode}</p>
          </div>
        </header>

        <div className="a-messages">
          {messages.length === 0 ? (
            <div className="a-empty">Nema poruka.</div>
          ) : (
            messages.map((message) => {
              const mine = message.user_id === user.id;
              return (
                <article
                  key={message.id}
                  className={`a-row ${mine ? "is-mine" : ""}`}
                >
                  <div className="a-row__meta">
                    <span>{mine ? "Toma" : "Ema"}</span>
                    <span>{formatTime(message.created_at)}</span>
                  </div>
                  {message.type === "voice" ? (
                    <div className="a-row__text">
                      <audio controls src={mediaSrc(message.media_url)} />
                    </div>
                  ) : (
                    <p className="a-row__text">{message.text}</p>
                  )}
                </article>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {error ? <p className="a-error a-error--pad">{error}</p> : null}

        <form className="a-composer" onSubmit={handleSubmit}>
          <textarea
            ref={inputRef}
            className="a-composer__input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Poruka za Emu…"
            rows={3}
            maxLength={2000}
          />
          <button className="a-btn a-btn--primary" type="submit" disabled={!text.trim()}>
            Pošalji
          </button>
        </form>
      </main>
    </div>
  );
}
