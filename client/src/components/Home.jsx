import { useState } from "react";
import { apiUrl } from "../lib/api.js";

export default function Home({
  settings,
  requests,
  conversations,
  leaderboard,
  onToggleAccept,
  onAccept,
  onReject,
  onOpen,
  onLogout,
}) {
  const [showTop, setShowTop] = useState(false);
  const [topMode, setTopMode] = useState("score"); // score | messages

  const topRows =
    topMode === "score" ? leaderboard?.byScore || [] : leaderboard?.byMessages || [];

  return (
    <section className="home">
      <header className="home__head">
        <div>
          <p className="login__eyebrow">ema · admin</p>
          <h1 className="home__brand">queenema</h1>
        </div>
        <button type="button" className="ghost-btn" onClick={onLogout}>
          Odjava
        </button>
      </header>

      <label className="switch-card">
        <div>
          <strong>Novi razgovori</strong>
          <p>Kad je upaljeno, stignu zahtjevi.</p>
        </div>
        <input
          type="checkbox"
          checked={Boolean(settings.acceptNewConversations)}
          onChange={(e) => onToggleAccept(e.target.checked)}
        />
      </label>

      <label className="switch-card">
        <div>
          <strong>Top lista</strong>
          <p>Prikaži ranking po skoru / porukama.</p>
        </div>
        <input
          type="checkbox"
          checked={showTop}
          onChange={(e) => setShowTop(e.target.checked)}
        />
      </label>

      {showTop ? (
        <div className="panel">
          <div className="top-tabs">
            <button
              type="button"
              className={topMode === "score" ? "on" : ""}
              onClick={() => setTopMode("score")}
            >
              Po skoru
            </button>
            <button
              type="button"
              className={topMode === "messages" ? "on" : ""}
              onClick={() => setTopMode("messages")}
            >
              Po porukama
            </button>
          </div>
          {topRows.length === 0 ? (
            <p className="muted">Još nema podataka.</p>
          ) : (
            topRows.slice(0, 10).map((row, i) => (
              <div className="top-row" key={`${row.id}-${i}`}>
                <span className="top-row__rank">#{i + 1}</span>
                {row.guestAvatar ? (
                  <img src={apiUrl(row.guestAvatar)} alt="" className="top-row__ava" />
                ) : (
                  <span className="top-row__ava ph" />
                )}
                <div className="top-row__meta">
                  <strong>{row.guestName}</strong>
                  <span className="muted">
                    skor {row.score} · poruke {row.totalMessages}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      ) : null}

      <div className="panel">
        <h3>Zahtjevi</h3>
        {requests.length === 0 ? (
          <p className="muted">Nema zahtjeva.</p>
        ) : (
          requests.map((r) => (
            <div className="req req--rich" key={r.id}>
              <div className="req__main">
                {r.guestAvatar ? (
                  <img src={apiUrl(r.guestAvatar)} alt="" className="req__ava" />
                ) : null}
                <div>
                  <strong>{r.guestName}</strong>
                  <p className="req__bio">{r.guestBio}</p>
                  <p className="muted tiny">
                    {r.meta?.device || "?"} · IP {r.meta?.ip || "?"}
                    {r.meta?.cookiesAccepted ? " · cookies ok" : ""}
                  </p>
                </div>
              </div>
              <div className="req__actions">
                <button type="button" onClick={() => onAccept(r.id)}>
                  Prihvati
                </button>
                <button type="button" className="danger" onClick={() => onReject(r.id)}>
                  Odbij
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="panel">
        <h3>Aktivni razgovori</h3>
        {conversations.length === 0 ? (
          <p className="muted">Nema aktivnih.</p>
        ) : (
          conversations.map((c) => (
            <button
              type="button"
              className="conv-item"
              key={c.id}
              onClick={() => onOpen(c.id)}
            >
              <span className="conv-item__left">
                {c.guestAvatar ? (
                  <img src={apiUrl(c.guestAvatar)} alt="" className="req__ava sm" />
                ) : null}
                {c.guestName}
              </span>
              <span className="muted">{c.patience}</span>
            </button>
          ))
        )}
      </div>
    </section>
  );
}
