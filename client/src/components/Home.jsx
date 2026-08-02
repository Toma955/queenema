import { useEffect, useRef, useState } from "react";
import {
  CircleHelp,
  LogOut,
  Palette,
  Settings,
} from "lucide-react";
import { apiUrl } from "../lib/api.js";
import PatienceBar from "./PatienceBar.jsx";

const TABS = [
  { id: "requests", label: "Zahtjevi" },
  { id: "messages", label: "Poruke" },
  { id: "analytics", label: "Analitika" },
];

const BRAND_ICONS = [
  { id: "settings", label: "Postavke", Icon: Settings },
  { id: "theme", label: "Tema", Icon: Palette },
  { id: "faq", label: "Upitnik", Icon: CircleHelp },
  { id: "logout", label: "Odjava", Icon: LogOut, danger: true },
];

const BRAND_HEIGHT = 72;

const BRAND_HEIGHTS = {
  icons: 152,
  theme: 228,
  logout: 168,
};

function BrandMark() {
  return (
    <>
      <span className="qe">Q</span>ueen<span className="qe">E</span>ma
    </>
  );
}

function guestBaseUrl() {
  const env = (import.meta.env.VITE_GUEST_URL || "").replace(/\/$/, "");
  if (env) return env;
  if (typeof window !== "undefined") {
    const { protocol, hostname } = window.location;
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return `${protocol}//${hostname}:5174`;
    }
  }
  return "https://guest.queenema.art";
}

function CtaButton({ children, onClick, disabled, className = "" }) {
  return (
    <button
      type="button"
      className={`home__cta-btn ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

export default function Home({
  user,
  requests = [],
  conversations = [],
  leaderboard = { byScore: [], byMessages: [] },
  settings,
  onAccept,
  onReject,
  onOpenConversation,
  onSetPatience,
  onSetAcceptNew,
  onLogout,
  onUpdateProfile,
  themeId,
  themes,
  onSetTheme,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuView, setMenuView] = useState("icons");
  const [tabIndex, setTabIndex] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [panel, setPanel] = useState(null);
  const [inviteUrl, setInviteUrl] = useState("");
  const [linkBusy, setLinkBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [msgMode, setMsgMode] = useState("reply");
  const [patienceId, setPatienceId] = useState(null);
  const [name, setName] = useState(user?.name || "Ema");
  const [username, setUsername] = useState(user?.username || "ema");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saveMsg, setSaveMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const touchRef = useRef({
    x: 0,
    y: 0,
    active: false,
    axis: null,
    width: 1,
    swiped: false,
  });
  const tabIndexRef = useRef(0);
  const brandRef = useRef(null);
  const windowsRef = useRef(null);
  const ignoreOutsideRef = useRef(false);

  useEffect(() => {
    tabIndexRef.current = tabIndex;
  }, [tabIndex]);

  useEffect(() => {
    return () => {
      const { move, end } = touchRef.current;
      if (move) window.removeEventListener("pointermove", move);
      if (end) {
        window.removeEventListener("pointerup", end);
        window.removeEventListener("pointercancel", end);
      }
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    let attached = false;
    function onPointerDown(e) {
      if (ignoreOutsideRef.current) return;
      if (brandRef.current?.contains(e.target)) return;
      setMenuOpen(false);
      setMenuView("icons");
    }
    /* Na mobitelu isti tap inače odmah zatvori meni — odgodi listener */
    const timer = window.setTimeout(() => {
      document.addEventListener("pointerdown", onPointerDown, true);
      attached = true;
    }, 280);
    return () => {
      window.clearTimeout(timer);
      if (attached) {
        document.removeEventListener("pointerdown", onPointerDown, true);
      }
    };
  }, [menuOpen]);

  const tab = TABS[tabIndex]?.id || "requests";
  const brandHeight = menuOpen
    ? BRAND_HEIGHTS[menuView] || BRAND_HEIGHTS.icons
    : BRAND_HEIGHT;
  const pending = requests.filter((r) => r.status === "pending" || !r.status);
  const convList = conversations;
  const byMessages = leaderboard.byMessages || [];
  const byScore = leaderboard.byScore || [];
  const shareOn = Boolean(settings?.acceptNewConversations);
  const patienceConv = conversations.find((c) => c.id === patienceId) || null;

  function openPanel(id) {
    setPanel(id);
    setMenuOpen(false);
    setMenuView("icons");
    setSaveMsg("");
    setInviteUrl("");
    setCopied(false);
  }

  function closeBrandMenu() {
    setMenuOpen(false);
    setMenuView("icons");
  }

  function onBrandAction(id) {
    if (id === "theme") {
      setMenuView("theme");
      return;
    }
    if (id === "logout") {
      setMenuView("logout");
      return;
    }
    openPanel(id);
  }

  function openBrandMenu(e) {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    ignoreOutsideRef.current = true;
    setMenuView("icons");
    setMenuOpen(true);
    window.setTimeout(() => {
      ignoreOutsideRef.current = false;
    }, 400);
  }

  function goTab(next) {
    const i = Math.max(0, Math.min(TABS.length - 1, next));
    setTabIndex(i);
    setDragX(0);
    setDragging(false);
    setPatienceId(null);
  }

  function clearSwipeListeners() {
    const { move, end } = touchRef.current;
    if (move) window.removeEventListener("pointermove", move);
    if (end) {
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
    }
    touchRef.current.move = null;
    touchRef.current.end = null;
  }

  function onSwipeStart(e) {
    if (panel) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (e.target.closest?.("input, textarea, .patience, a")) return;

    clearSwipeListeners();
    const width = windowsRef.current?.clientWidth || 1;
    touchRef.current = {
      ...touchRef.current,
      x: e.clientX,
      y: e.clientY,
      active: true,
      axis: null,
      width,
      pointerId: e.pointerId,
      swiped: false,
    };

    const move = (ev) => {
      const s = touchRef.current;
      if (!s.active || ev.pointerId !== s.pointerId) return;
      const dx = ev.clientX - s.x;
      const dy = ev.clientY - s.y;

      if (!s.axis) {
        if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
        s.axis = Math.abs(dx) > Math.abs(dy) * 1.1 ? "x" : "y";
        if (s.axis === "y") {
          s.active = false;
          clearSwipeListeners();
          return;
        }
        s.swiped = true;
        setDragging(true);
      }
      if (s.axis !== "x") return;

      s.swiped = true;
      if (ev.cancelable) ev.preventDefault();
      const i = tabIndexRef.current;
      let next = dx;
      if (i === 0 && dx > 0) next = dx * 0.28;
      if (i === TABS.length - 1 && dx < 0) next = dx * 0.28;
      setDragX(next);
    };

    const end = (ev) => {
      const s = touchRef.current;
      if (ev.pointerId !== s.pointerId && s.pointerId != null) return;
      const wasX = s.axis === "x";
      const dx = ev.clientX - s.x;
      clearSwipeListeners();
      s.active = false;
      s.axis = null;

      if (!wasX) {
        setDragging(false);
        setDragX(0);
        return;
      }

      const threshold = Math.min(64, s.width * 0.16);
      const i = tabIndexRef.current;
      if (dx <= -threshold && i < TABS.length - 1) {
        goTab(i + 1);
        return;
      }
      if (dx >= threshold && i > 0) {
        goTab(i - 1);
        return;
      }
      setDragging(false);
      setDragX(0);
    };

    touchRef.current.move = move;
    touchRef.current.end = end;
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
  }

  function onSwipeClickCapture(e) {
    if (touchRef.current.swiped) {
      e.preventDefault();
      e.stopPropagation();
      touchRef.current.swiped = false;
    }
  }

  async function createLink() {
    setLinkBusy(true);
    setCopied(false);
    try {
      const res = await fetch(apiUrl("/api/invite"), { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.invite?.token) throw new Error(data.error || "Greška");
      const url = `${guestBaseUrl()}/?i=${data.invite.token}`;
      setInviteUrl(url);
      setPanel("link");
      setMenuOpen(false);
    } catch (err) {
      setInviteUrl("");
      setSaveMsg(err.message || "Link nije kreiran.");
      setPanel("link");
    } finally {
      setLinkBusy(false);
    }
  }

  async function copyLink() {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  async function saveProfile(e) {
    e.preventDefault();
    setSaving(true);
    setSaveMsg("");
    try {
      const result = await onUpdateProfile({
        name,
        username,
        password: newPassword || undefined,
        currentPassword,
      });
      if (result?.ok) {
        setSaveMsg("Spremljeno.");
        setCurrentPassword("");
        setNewPassword("");
      } else {
        setSaveMsg(result?.error || "Greška.");
      }
    } finally {
      setSaving(false);
    }
  }

  function onConversationClick(c) {
    if (msgMode === "patience") {
      setPatienceId((id) => (id === c.id ? null : c.id));
      return;
    }
    onOpenConversation?.(c.id);
  }

  return (
    <section className="home home--min">
      <div className="home__top">
        <header className="home__brand-wrap">
          <div
            ref={brandRef}
            className={`home__brand-shell ${menuOpen ? "is-open" : ""} ${
              menuView !== "icons" ? `is-${menuView}` : ""
            }`}
          >
            <div
              className="home__brand-panel"
              style={{ minHeight: brandHeight }}
            >
              {!menuOpen ? (
                <button
                  type="button"
                  className="home__brand-hit"
                  onPointerUp={openBrandMenu}
                  onClick={(e) => e.preventDefault()}
                  aria-expanded={false}
                >
                  <span className="home__brand-text">
                    <BrandMark />
                  </span>
                </button>
              ) : null}

              {menuOpen && menuView === "icons" ? (
                <nav className="home__brand-menu" aria-label="Izbornik">
                  {BRAND_ICONS.map(({ id, label, Icon, danger }) => (
                    <button
                      key={id}
                      type="button"
                      className={`home__brand-icon ${danger ? "danger" : ""}`}
                      aria-label={label}
                      title={label}
                      onClick={() => onBrandAction(id)}
                    >
                      <Icon size={28} strokeWidth={1.6} />
                    </button>
                  ))}
                </nav>
              ) : null}

              {menuOpen && menuView === "theme" ? (
                <div className="home__brand-sub home__brand-sub--theme">
                  <div className="home__brand-themes">
                    {themes.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        className={`home__brand-swatch ${
                          themeId === t.id ? "on" : ""
                        }`}
                        aria-label={t.label}
                        title={t.label}
                        onClick={() => onSetTheme(t.id)}
                        style={{
                          background: `linear-gradient(135deg, ${t.vars["--stage-top"]}, ${t.vars["--ink"]})`,
                          borderColor: t.vars["--gold"],
                          color: t.vars["--foam"],
                        }}
                      >
                        <span className="home__brand-swatch-mark">
                          <span style={{ color: t.vars["--gold"] }}>Q</span>
                          ueen
                          <span style={{ color: t.vars["--gold"] }}>E</span>
                          ma
                        </span>
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="home__brand-back"
                    onClick={() => setMenuView("icons")}
                  >
                    Povratak
                  </button>
                </div>
              ) : null}

              {menuOpen && menuView === "logout" ? (
                <div className="home__brand-sub home__brand-logout">
                  <p className="home__brand-ask">Odjaviti se?</p>
                  <div className="home__brand-yesno">
                    <button
                      type="button"
                      className="home__brand-yes"
                      onClick={() => {
                        closeBrandMenu();
                        onLogout?.();
                      }}
                    >
                      Da
                    </button>
                    <button
                      type="button"
                      className="home__brand-no"
                      onClick={() => setMenuView("icons")}
                    >
                      Ne
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        {!panel ? (
          <div className="home__dots" role="tablist" aria-label="Pregled">
            {TABS.map((t, i) => {
              const on = tabIndex === i;
              const badge =
                t.id === "requests" && pending.length
                  ? pending.length
                    : t.id === "messages" && convList.length
                      ? convList.length
                      : 0;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  className={`home__dot ${on ? "is-on" : ""}`}
                  onClick={() => goTab(i)}
                >
                  {on ? (
                    <span className="home__dot-label">{t.label}</span>
                  ) : (
                    <span className="home__dot-pill" />
                  )}
                  {badge && !on ? (
                    <span className="home__dot-badge">{badge}</span>
                  ) : null}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      {!panel ? (
        <div
          className={`home__windows ${dragging ? "is-dragging" : ""}`}
          ref={windowsRef}
          onPointerDown={onSwipeStart}
          onClickCapture={onSwipeClickCapture}
        >
          <div
            className="home__track"
            style={{
              transform: `translateX(calc(-${tabIndex * 100}% + ${dragX}px))`,
              transition: dragging ? "none" : undefined,
            }}
          >
            <div className="home__pane" role="tabpanel">
              {pending.length ? (
                <ul className="home__list">
                  {pending.map((req) => (
                    <li key={req.id} className="home__row home__row--request">
                      <div className="req__main">
                        {req.guestAvatar ? (
                          <img
                            src={apiUrl(req.guestAvatar)}
                            alt=""
                            className="req__ava req__ava--lg"
                          />
                        ) : (
                          <span className="req__ava req__ava--lg ph" />
                        )}
                        <div className="req__text">
                          <strong className="req__name">{req.guestName}</strong>
                          <p className="req__bio">{req.guestBio}</p>
                          <p className="muted tiny">
                            {req.meta?.device || "?"} · {req.meta?.ip || "ip?"}
                          </p>
                        </div>
                      </div>
                      <div className="req__actions">
                        <button
                          type="button"
                          className="btn-accept"
                          onClick={() => {
                            onAccept(req.id);
                            goTab(1);
                          }}
                        >
                          Prihvati
                        </button>
                        <button
                          type="button"
                          className="btn-reject"
                          onClick={() => onReject(req.id)}
                        >
                          Odbij
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="home__empty">Nema novih zahtjeva.</p>
              )}
            </div>

            <div className="home__pane" role="tabpanel">
              {convList.length ? (
                <ul className="home__list">
                  {convList.map((c) => (
                    <li key={c.id} className="home__msg-item">
                      <button
                        type="button"
                        className="home__row home__row--btn"
                        onClick={() => onConversationClick(c)}
                      >
                        {c.guestAvatar ? (
                          <img
                            src={apiUrl(c.guestAvatar)}
                            alt=""
                            className="req__ava"
                          />
                        ) : (
                          <span className="req__ava ph" />
                        )}
                        <div className="req__text">
                          <strong className="req__name">{c.guestName}</strong>
                          <p className="muted tiny">
                            {c.totalMessages ?? 0} poruka · strpljenje{" "}
                            {c.patience ?? 0}
                          </p>
                        </div>
                      </button>
                      {msgMode === "patience" && patienceId === c.id ? (
                        <div className="home__patience">
                          <PatienceBar
                            value={patienceConv?.patience ?? c.patience ?? 50}
                            features={c.features}
                            onChange={(v) => onSetPatience?.(v, c.id)}
                          />
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="home__empty">Nema aktivnih razgovora.</p>
              )}
            </div>

            <div className="home__pane" role="tabpanel">
              <div className="home__analytics">
                <div className="home__stat-block">
                  <h3>Najviše dopisivanja</h3>
                  {byMessages.length ? (
                    <ol className="home__rank">
                      {byMessages.slice(0, 8).map((row, i) => (
                        <li key={`m-${row.id}`}>
                          <span className="home__rank-n">{i + 1}</span>
                          <span className="home__rank-name">{row.guestName}</span>
                          <span className="home__rank-val">
                            {row.totalMessages} por.
                          </span>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="home__empty">Još nema podataka.</p>
                  )}
                </div>
                <div className="home__stat-block">
                  <h3>Najveće strpljenje</h3>
                  {byScore.length ? (
                    <ol className="home__rank">
                      {byScore.slice(0, 8).map((row, i) => (
                        <li key={`s-${row.id}`}>
                          <span className="home__rank-n">{i + 1}</span>
                          <span className="home__rank-name">{row.guestName}</span>
                          <span className="home__rank-val">{row.patience}</span>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="home__empty">Još nema podataka.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {panel === "link" ? (
        <div className="sheet">
          <div className="sheet__head">
            <h2>Novi link</h2>
            <button type="button" className="ghost-btn" onClick={() => setPanel(null)}>
              Zatvori
            </button>
          </div>
          {inviteUrl ? (
            <>
              <p className="muted">Pošalji ovaj link. Otvara prozor za zahtjev.</p>
              <code className="invite-url">{inviteUrl}</code>
              <button type="button" className="login__btn" onClick={copyLink}>
                {copied ? "Kopirano" : "Kopiraj link"}
              </button>
            </>
          ) : (
            <p className="err">{saveMsg || "Nema linka."}</p>
          )}
        </div>
      ) : null}

      {panel === "settings" ? (
        <div className="sheet">
          <div className="sheet__head">
            <h2>Postavke</h2>
            <button type="button" className="ghost-btn" onClick={() => setPanel(null)}>
              Zatvori
            </button>
          </div>
          <form className="sheet__form" onSubmit={saveProfile}>
            <label>
              Ime
              <input value={name} onChange={(e) => setName(e.target.value)} required />
            </label>
            <label>
              Username
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </label>
            <label>
              Nova lozinka
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="ostavi prazno ako ne mijenjaš"
              />
            </label>
            <label>
              Trenutna lozinka
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </label>
            <button type="submit" className="login__btn" disabled={saving}>
              {saving ? "Spremam…" : "Spremi"}
            </button>
            {saveMsg ? <p className="muted">{saveMsg}</p> : null}
          </form>
        </div>
      ) : null}

      {panel === "theme" ? (
        <div className="sheet">
          <div className="sheet__head">
            <h2>Tema</h2>
            <button type="button" className="ghost-btn" onClick={() => setPanel(null)}>
              Zatvori
            </button>
          </div>
          <div className="theme-grid">
            {themes.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`theme-swatch ${themeId === t.id ? "on" : ""}`}
                onClick={() => onSetTheme(t.id)}
                style={{
                  background: `linear-gradient(135deg, ${t.vars["--stage-top"]}, ${t.vars["--ink"]})`,
                  color: t.vars["--foam"],
                  borderColor: t.vars["--gold"],
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {panel === "faq" ? (
        <div className="sheet">
          <div className="sheet__head">
            <h2>Upitnik</h2>
            <button type="button" className="ghost-btn" onClick={() => setPanel(null)}>
              Zatvori
            </button>
          </div>
          <div className="faq">
            <p>
              <strong>QueenEma</strong> je privatni prostor za razgovore koje Ema
              kontrolira.
            </p>
            <p>
              Stvori <em>Novi link</em> i podijeli ga. Gost otvara prozor i šalje
              zahtjev (ime, slika, opis).
            </p>
            <p>
              U chatu <em>strpljenje</em> određuje limity, glas, poziv/video ili
              kavu. Skroz lijevo briše razgovor.
            </p>
          </div>
        </div>
      ) : null}

      {!panel ? (
        <footer className="home__footer">
          {tab === "requests" ? (
            <CtaButton onClick={createLink} disabled={linkBusy}>
              {linkBusy ? "Stvaram…" : "Novi link"}
            </CtaButton>
          ) : null}

          {tab === "messages" ? (
            <CtaButton
              onClick={() =>
                setMsgMode((m) => {
                  const next = m === "reply" ? "patience" : "reply";
                  if (next === "reply") setPatienceId(null);
                  return next;
                })
              }
            >
              {msgMode === "patience" ? "Promijeni strpljenje" : "Odgovori"}
            </CtaButton>
          ) : null}

          {tab === "analytics" ? (
            <CtaButton
              className={shareOn ? "is-on" : ""}
              onClick={() => onSetAcceptNew?.(!shareOn)}
            >
              {shareOn ? "Podijeli uključeno" : "Podijeli isključeno"}
            </CtaButton>
          ) : null}
        </footer>
      ) : null}
    </section>
  );
}
