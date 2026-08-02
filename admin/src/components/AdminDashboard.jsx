import { useState } from "react";
import { mediaUrl } from "../lib/api.js";

export default function AdminDashboard({ admin }) {
  const [tab, setTab] = useState("overview");
  const [patienceDraft, setPatienceDraft] = useState("");
  const [msg, setMsg] = useState("");
  const [emaForm, setEmaForm] = useState({
    name: "",
    username: "",
    password: "",
  });
  const [ownForm, setOwnForm] = useState({
    name: "",
    username: "",
    password: "",
    currentPassword: "",
  });

  const pending = admin.requests.filter((r) => r.status === "pending");
  const active = admin.conversations.filter((c) => c.status === "active");
  const gateOn = Boolean(admin.settings?.acceptNewConversations);

  async function saveEma(e) {
    e.preventDefault();
    const result = await admin.updateEmaProfile({
      name: emaForm.name || undefined,
      username: emaForm.username || undefined,
      password: emaForm.password || undefined,
    });
    setMsg(result.ok ? "Ema profil spremljen." : result.error || "Greška.");
    if (result.ok) setEmaForm({ name: "", username: "", password: "" });
  }

  async function saveOwn(e) {
    e.preventDefault();
    const result = await admin.updateOwnProfile(ownForm);
    setMsg(result.ok ? "Admin profil spremljen." : result.error || "Greška.");
    if (result.ok) {
      setOwnForm({ name: "", username: "", password: "", currentPassword: "" });
    }
  }

  return (
    <div className="ad">
      <header className="ad__head">
        <div>
          <p className="ad__eyebrow">admin konzola</p>
          <h1>QueenEma</h1>
        </div>
        <div className="ad__head-actions">
          <span className="ad__who">
            {admin.user?.name || "Admin"} · nije Ema
          </span>
          <button type="button" className="ad-btn" onClick={admin.logout}>
            Odjava
          </button>
        </div>
      </header>

      <nav className="ad__tabs">
        {[
          ["overview", "Pregled"],
          ["requests", "Zahtjevi"],
          ["chats", "Razgovori"],
          ["settings", "Postavke"],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={tab === id ? "is-on" : ""}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </nav>

      {admin.error ? (
        <p className="ad-error" onClick={admin.clearError}>
          {admin.error}
        </p>
      ) : null}
      {msg ? <p className="ad-ok">{msg}</p> : null}

      {tab === "overview" ? (
        <section className="ad__grid">
          <article className="ad-card">
            <h2>Vrata</h2>
            <p>
              Zahtjevi:{" "}
              <strong>{gateOn ? "omogućeni" : "zatvoreni"}</strong>
            </p>
            <p>
              Zauzeto:{" "}
              <strong>{admin.availability?.occupied ? "da" : "ne"}</strong>
            </p>
            <button
              type="button"
              className={`ad-btn ad-btn--primary ${gateOn ? "is-on" : ""}`}
              onClick={() => admin.setAcceptNew(!gateOn)}
            >
              {gateOn ? "Onemogući zahtjeve" : "Omogući zahtjeve"}
            </button>
          </article>
          <article className="ad-card">
            <h2>Stanje</h2>
            <p>Pending: {pending.length}</p>
            <p>Aktivni chatovi: {active.length}</p>
            <p>
              Ema: {admin.ema?.name || "—"} (@{admin.ema?.username || "—"})
            </p>
          </article>
          <article className="ad-card">
            <h2>Top score</h2>
            <ul className="ad-list">
              {(admin.leaderboard?.byScore || []).slice(0, 5).map((row) => (
                <li key={row.id || row.guestName}>
                  {row.guestName} · {row.score ?? row.patience}
                </li>
              ))}
            </ul>
          </article>
        </section>
      ) : null}

      {tab === "requests" ? (
        <section className="ad-stack">
          {pending.length === 0 ? (
            <p className="ad-muted">Nema pending zahtjeva.</p>
          ) : (
            pending.map((r) => (
              <article key={r.id} className="ad-card ad-card--row">
                {r.guestAvatar ? (
                  <img
                    src={mediaUrl(r.guestAvatar)}
                    alt=""
                    className="ad-ava"
                  />
                ) : (
                  <div className="ad-ava ad-ava--empty" />
                )}
                <div className="ad-card__body">
                  <strong>{r.guestName}</strong>
                  <p>{r.guestBio}</p>
                  <p className="ad-muted">
                    {r.meta?.device || "?"} · {r.meta?.ip || "—"}
                  </p>
                </div>
                <div className="ad-card__actions">
                  <button
                    type="button"
                    className="ad-btn ad-btn--primary"
                    onClick={() => admin.acceptRequest(r.id)}
                  >
                    Prihvati
                  </button>
                  <button
                    type="button"
                    className="ad-btn"
                    onClick={() => admin.rejectRequest(r.id)}
                  >
                    Odbij
                  </button>
                </div>
              </article>
            ))
          )}
        </section>
      ) : null}

      {tab === "chats" ? (
        <section className="ad-split">
          <div className="ad-stack">
            {admin.conversations.length === 0 ? (
              <p className="ad-muted">Nema razgovora.</p>
            ) : (
              admin.conversations.map((c) => (
                <article key={c.id} className="ad-card ad-card--row">
                  <div className="ad-card__body">
                    <strong>{c.guestName}</strong>
                    <p className="ad-muted">
                      {c.status} · score {c.patience}
                    </p>
                  </div>
                  <div className="ad-card__actions">
                    <button
                      type="button"
                      className="ad-btn"
                      onClick={() => {
                        setPatienceDraft(String(c.patience ?? 50));
                        admin.openConversation(c.id);
                      }}
                    >
                      Otvori
                    </button>
                    {c.status === "active" ? (
                      <>
                        <button
                          type="button"
                          className="ad-btn"
                          onClick={() => admin.endConversation(c.id)}
                        >
                          Završi
                        </button>
                        <button
                          type="button"
                          className="ad-btn ad-btn--danger"
                          onClick={() => admin.wipeConversation(c.id)}
                        >
                          Obriši
                        </button>
                      </>
                    ) : null}
                  </div>
                </article>
              ))
            )}
          </div>

          {admin.peek ? (
            <aside className="ad-peek">
              <div className="ad-peek__head">
                <div>
                  <strong>{admin.peek.guestName}</strong>
                  <p className="ad-muted">score {admin.peek.patience}</p>
                </div>
                <button type="button" className="ad-btn" onClick={admin.closePeek}>
                  Zatvori
                </button>
              </div>
              {admin.peek.status === "active" ? (
                <form
                  className="ad-peek__patience"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const n = Number(patienceDraft);
                    if (Number.isFinite(n)) admin.setPatience(admin.peek.id, n);
                  }}
                >
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={patienceDraft}
                    onChange={(e) => setPatienceDraft(e.target.value)}
                  />
                  <button type="submit" className="ad-btn ad-btn--primary">
                    Postavi score
                  </button>
                </form>
              ) : null}
              <div className="ad-peek__msgs">
                {admin.messages.map((m) => (
                  <p
                    key={m.id}
                    className={`ad-msg ${m.type === "system" ? "is-sys" : ""} ${
                      m.from === "ema" ? "is-ema" : ""
                    }`}
                  >
                    <span>{m.from}</span>
                    {m.type === "voice" && m.media_url ? (
                      <audio controls src={mediaUrl(m.media_url)} />
                    ) : (
                      m.text
                    )}
                  </p>
                ))}
              </div>
            </aside>
          ) : null}
        </section>
      ) : null}

      {tab === "settings" ? (
        <section className="ad__grid">
          <form className="ad-card" onSubmit={saveEma}>
            <h2>Ema račun</h2>
            <p className="ad-muted">
              Trenutno: {admin.ema?.name} (@{admin.ema?.username})
            </p>
            <label>
              Ime
              <input
                value={emaForm.name}
                onChange={(e) =>
                  setEmaForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder={admin.ema?.name || "Ema"}
              />
            </label>
            <label>
              Username
              <input
                value={emaForm.username}
                onChange={(e) =>
                  setEmaForm((f) => ({ ...f, username: e.target.value }))
                }
                placeholder={admin.ema?.username || "ema"}
              />
            </label>
            <label>
              Nova lozinka
              <input
                type="password"
                value={emaForm.password}
                onChange={(e) =>
                  setEmaForm((f) => ({ ...f, password: e.target.value }))
                }
              />
            </label>
            <button type="submit" className="ad-btn ad-btn--primary">
              Spremi Emu
            </button>
          </form>

          <form className="ad-card" onSubmit={saveOwn}>
            <h2>Admin račun</h2>
            <label>
              Ime
              <input
                value={ownForm.name}
                onChange={(e) =>
                  setOwnForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder={admin.user?.name || "Admin"}
              />
            </label>
            <label>
              Username
              <input
                value={ownForm.username}
                onChange={(e) =>
                  setOwnForm((f) => ({ ...f, username: e.target.value }))
                }
                placeholder={admin.user?.username || "admin"}
              />
            </label>
            <label>
              Trenutna lozinka
              <input
                type="password"
                value={ownForm.currentPassword}
                onChange={(e) =>
                  setOwnForm((f) => ({
                    ...f,
                    currentPassword: e.target.value,
                  }))
                }
                required
              />
            </label>
            <label>
              Nova lozinka
              <input
                type="password"
                value={ownForm.password}
                onChange={(e) =>
                  setOwnForm((f) => ({ ...f, password: e.target.value }))
                }
              />
            </label>
            <button type="submit" className="ad-btn ad-btn--primary">
              Spremi admin
            </button>
          </form>
        </section>
      ) : null}
    </div>
  );
}
