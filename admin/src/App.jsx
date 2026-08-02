import { useCallback, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { apiUrl, mediaUrl, socketUrl } from "./lib/api.js";
import Unavailable from "./components/Unavailable.jsx";

const COOKIE_KEY = "queenema_cookies";

function detectDevice() {
  const ua = navigator.userAgent || "";
  const mobile = /Mobi|Android|iPhone|iPad|iPod/i.test(ua);
  return { device: mobile ? "mobile" : "desktop", userAgent: ua };
}

function readInviteToken() {
  try {
    return new URLSearchParams(window.location.search).get("i") || "";
  } catch {
    return "";
  }
}

export default function App() {
  const [cookieConsent, setCookieConsent] = useState(() => {
    try {
      return localStorage.getItem(COOKIE_KEY);
    } catch {
      return null;
    }
  });
  const [inviteToken] = useState(() => readInviteToken());
  const [inviteOk, setInviteOk] = useState(null);
  const [inviteError, setInviteError] = useState("");
  const [availability, setAvailability] = useState(null);
  const [apiOk, setApiOk] = useState(null);
  const [phase, setPhase] = useState("form");
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarPreview, setAvatarPreview] = useState("");
  const [avatarData, setAvatarData] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [guestToken, setGuestToken] = useState(
    () => localStorage.getItem("queenema_guest") || ""
  );
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [recording, setRecording] = useState(false);
  const [reactId, setReactId] = useState(null);
  const socketRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const bottomRef = useRef(null);

  const features = conversation?.features || {};
  const limits = conversation?.limits || {
    maxMessages: features.maxMessages,
    maxChars: features.maxChars,
  };

  useEffect(() => {
    let alive = true;
    async function ping() {
      try {
        const health = await fetch(apiUrl("/api/health"), { cache: "no-store" });
        if (!alive) return;
        if (!health.ok) {
          setApiOk(false);
          return;
        }
        setApiOk(true);
        const avail = await fetch(apiUrl("/api/availability")).then((r) => r.json());
        if (alive) setAvailability(avail);
        if (inviteToken) {
          const inv = await fetch(apiUrl(`/api/invite/${inviteToken}`)).then((r) =>
            r.json()
          );
          if (!alive) return;
          if (inv.ok) {
            setInviteOk(true);
            setInviteError("");
          } else {
            setInviteOk(false);
            setInviteError(inv.error || "Link nije valjan.");
          }
        } else {
          setInviteOk(false);
          setInviteError("Trebaš Emine link za zahtjev.");
        }
      } catch {
        if (alive) {
          setApiOk(false);
          setAvailability({ acceptNewConversations: false });
        }
      }
    }
    ping();
    const id = setInterval(ping, 15000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [inviteToken]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const applyGuestState = useCallback((payload) => {
    if (!payload) return;
    if (payload.status === "pending") {
      setPhase("pending");
      return;
    }
    if (payload.status === "rejected") {
      setPhase("rejected");
      localStorage.removeItem("queenema_guest");
      return;
    }
    if (payload.status === "gone" || payload.status === "ended") {
      setPhase("gone");
      setConversation(null);
      setMessages([]);
      localStorage.removeItem("queenema_guest");
      return;
    }
    if (payload.status === "active" && payload.conversation) {
      setPhase("chat");
      setConversation(payload.conversation);
      setMessages(payload.messages || []);
    }
  }, []);

  const connectSocket = useCallback(
    (token) => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      const socket = io(socketUrl(), {
        transports: ["websocket", "polling"],
        auth: { role: "guest", guestToken: token },
      });
      socketRef.current = socket;

      socket.on("connect", () => {
        socket.emit("guest_hello", { guestToken: token });
      });

      socket.on("guest_state", applyGuestState);

      socket.on("request_accepted", (payload) => {
        if (payload.guestToken !== token) return;
        setPhase("chat");
        setConversation(payload.conversation);
        socket.emit("join_conversation", {
          conversationId: payload.conversation.id,
          role: "guest",
          guestToken: token,
        });
      });

      socket.on("request_rejected", (payload) => {
        if (payload.guestToken !== token) return;
        setPhase("rejected");
        localStorage.removeItem("queenema_guest");
      });

      socket.on("conversation_state", (payload) => {
        setConversation(payload.conversation);
        setMessages(payload.messages || []);
        setPhase("chat");
      });

      socket.on("new_message", (message) => {
        setMessages((prev) => {
          if (prev.some((m) => m.id === message.id)) return prev;
          return [...prev, message];
        });
      });

      socket.on("message_updated", (message) => {
        setMessages((prev) =>
          prev.map((m) => (m.id === message.id ? message : m))
        );
      });

      socket.on("patience", ({ conversation: c }) => {
        setConversation(c);
      });

      socket.on("conversation_ended", () => {
        setPhase("gone");
        setConversation(null);
        localStorage.removeItem("queenema_guest");
      });

      socket.on("conversation_wiped", (payload) => {
        if (payload?.guestToken && payload.guestToken !== token) return;
        setPhase("gone");
        setConversation(null);
        setMessages([]);
        localStorage.removeItem("queenema_guest");
      });

      socket.on("error_message", (payload) => {
        setError(payload.error || "Greška.");
      });
    },
    [applyGuestState]
  );

  useEffect(() => {
    if (!guestToken) return;
    connectSocket(guestToken);
    return () => {
      socketRef.current?.disconnect();
    };
  }, [guestToken, connectSocket]);

  function acceptCookies() {
    localStorage.setItem(COOKIE_KEY, "accepted");
    setCookieConsent("accepted");
  }

  function declineCookies() {
    localStorage.setItem(COOKIE_KEY, "declined");
    setCookieConsent("declined");
  }

  function onAvatarChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError("Slika max 2 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      setAvatarPreview(dataUrl);
      setAvatarData({ data: dataUrl, mime: file.type || "image/jpeg" });
    };
    reader.readAsDataURL(file);
  }

  async function submitRequest(e) {
    e.preventDefault();
    setError("");
    if (cookieConsent !== "accepted") {
      setError("Prihvati cookies da Ema vidi uređaj i IP.");
      return;
    }
    if (!name.trim()) {
      setError("Upiši ime.");
      return;
    }
    if (!avatarData) {
      setError("Dodaj sliku.");
      return;
    }
    if (!bio.trim()) {
      setError("Napiši kratki opis.");
      return;
    }

    setBusy(true);
    try {
      const { device, userAgent } = detectDevice();
      const existing = localStorage.getItem("queenema_guest") || "";
      const res = await fetch(apiUrl("/api/request"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          bio: bio.trim(),
          avatar: avatarData.data,
          avatarMime: avatarData.mime,
          cookiesAccepted: true,
          device,
          userAgent,
          guestToken: existing || undefined,
          inviteToken: inviteToken || undefined,
        }),
      });
      const data = await res.json();
      if (data.code === "already_active" || data.code === "already_pending") {
        const token = data.guestToken || existing;
        if (token) {
          localStorage.setItem("queenema_guest", token);
          setGuestToken(token);
          setPhase(data.code === "already_active" ? "chat" : "pending");
        }
        setError(data.error || "Već imaš jedan chat.");
        return;
      }
      if (!res.ok) throw new Error(data.error || "Neuspjeh.");
      const token = data.guestToken || data.request?.guestToken;
      localStorage.setItem("queenema_guest", token);
      setGuestToken(token);
      setPhase("pending");
    } catch (err) {
      setError(err.message || "Greška.");
    } finally {
      setBusy(false);
    }
  }

  function sendText(e) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !socketRef.current) return;
    if (limits.maxChars && text.length > limits.maxChars) {
      setError(`Max ${limits.maxChars} znakova.`);
      return;
    }
    socketRef.current.emit("send_message", {
      conversationId: conversation?.id,
      text,
    });
    setDraft("");
    setError("");
  }

  function reactToMessage(messageId, kind) {
    if (!socketRef.current || !conversation?.id) return;
    if (kind === "smile" && !features.smile) {
      setError("Smajlić nije otključan.");
      return;
    }
    if (kind === "like" && !features.like) {
      setError("Lajk nije otključan.");
      return;
    }
    if (kind === "heart" && !features.heart) {
      setError("Srce nije otključano.");
      return;
    }
    socketRef.current.emit("react_message", {
      conversationId: conversation.id,
      messageId,
      kind,
    });
    setReactId(null);
    setError("");
  }

  async function toggleRecord() {
    if (!features.voice) return;
    if (recording) {
      mediaRecorderRef.current?.stop();
      setRecording(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (ev) => {
        if (ev.data.size) chunksRef.current.push(ev.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        const reader = new FileReader();
        reader.onloadend = () => {
          socketRef.current?.emit("send_voice", {
            conversationId: conversation?.id,
            audio: reader.result,
            mime: blob.type || "audio/webm",
          });
        };
        reader.readAsDataURL(blob);
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      setError("Mikrofon nije dostupan.");
    }
  }

  if (apiOk === false) {
    return (
      <div className="guest-shell">
        <Unavailable
          code="404"
          title="Stranica nedostupna"
          message="API server nije dostupan. Pokušaj ponovo uskoro."
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  if (apiOk === null) {
    return (
      <div className="guest-shell">
        <div className="status-card">
          <h1>queenema</h1>
          <p>Učitavam…</p>
        </div>
      </div>
    );
  }

  if (cookieConsent === null) {
    return (
      <div className="guest-shell">
        <div className="cookie-card">
          <h1>Cookies</h1>
          <p>
            Koristimo osnovne podatke (uređaj, IP, preglednik) da Ema vidi jesi
            li na mobitelu ili desktopu i odakle dolaziš. Bez toga ne možeš
            poslati zahtjev.
          </p>
          <div className="cookie-actions">
            <button type="button" className="primary" onClick={acceptCookies}>
              Prihvaćam
            </button>
            <button type="button" className="ghost" onClick={declineCookies}>
              Odbijam
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (cookieConsent === "declined") {
    return (
      <div className="guest-shell">
        <div className="cookie-card">
          <h1>Bez cookies</h1>
          <p>Bez privole ne možeš zatražiti razgovor.</p>
          <button type="button" className="primary" onClick={acceptCookies}>
            Ipak prihvaćam
          </button>
        </div>
      </div>
    );
  }

  if (phase === "pending") {
    return (
      <div className="guest-shell">
        <div className="status-card">
          <h1>Čekaš Emine</h1>
          <p>Zahtjev je poslan. Kad prihvati, otvorit će se chat.</p>
        </div>
      </div>
    );
  }

  if (phase === "rejected" || phase === "gone") {
    return (
      <div className="guest-shell">
        <div className="status-card">
          <h1>{phase === "rejected" ? "Odbijeno" : "Kraj"}</h1>
          <p>
            {phase === "rejected"
              ? "Ema nije prihvatila zahtjev."
              : "Razgovor je završen ili obrisan."}
          </p>
          <button
            type="button"
            className="primary"
            onClick={() => {
              localStorage.removeItem("queenema_guest");
              setGuestToken("");
              setPhase("form");
              setConversation(null);
              setMessages([]);
            }}
          >
            Novi zahtjev
          </button>
        </div>
      </div>
    );
  }

  if (phase === "chat" && conversation) {
    const charLimit = limits.maxChars ?? features.maxChars ?? null;
    const guestSent = messages.filter((m) => m.from === "guest").length;
    const msgHint =
      (limits.maxMessages ?? features.maxMessages) != null
        ? `${guestSent}/${limits.maxMessages ?? features.maxMessages} poruka`
        : null;

    return (
      <div className="guest-chat">
        <header className="guest-chat-header">
          <div>
            <strong>Ema</strong>
            <span className="muted">
              strpljenje {conversation.patience ?? "—"}
              {msgHint ? ` · ${msgHint}` : ""}
            </span>
          </div>
          {conversation.coffeeInvited || features.coffee ? (
            <div className="coffee-banner">Poziv na kavu</div>
          ) : null}
        </header>

        <div className="guest-messages">
          {messages.map((m) => {
            const reactable = ["text", "voice", "call", "video"].includes(m.type);
            const counts = {};
            for (const r of m.reactions || []) {
              counts[r.kind] = (counts[r.kind] || 0) + 1;
            }
            const mineKinds = new Set(
              (m.reactions || [])
                .filter((r) => r.from === "guest")
                .map((r) => r.kind)
            );
            const canSmile = features.smile;
            const canLike = features.like;
            const canHeart = features.heart && m.from === "ema";
            const anyReact = canSmile || canLike || canHeart;

            return (
              <div
                key={m.id}
                className={`bubble ${m.from === "guest" ? "mine" : "theirs"} ${m.type === "reaction" ? "is-reaction" : ""} ${reactable ? "is-reactable" : ""}`}
                onClick={() => {
                  if (!reactable || !anyReact) return;
                  setReactId((id) => (id === m.id ? null : m.id));
                }}
              >
                {m.type === "voice" && (m.media_url || m.mediaUrl) ? (
                  <audio controls src={mediaUrl(m.media_url || m.mediaUrl)} />
                ) : m.type === "call" || m.type === "video" ? (
                  <p className="call-msg">
                    {m.text}
                    {m.type === "call" && features.call
                      ? " · možeš primiti"
                      : null}
                    {m.type === "video" && features.video
                      ? " · možeš primiti"
                      : null}
                    {(m.type === "call" && !features.call) ||
                    (m.type === "video" && !features.video)
                      ? " · zaključano za tebe"
                      : null}
                  </p>
                ) : (
                  <p>{m.text}</p>
                )}

                {(Object.keys(counts).length > 0 || reactId === m.id) && (
                  <div className="bubble-reacts">
                    {Object.keys(counts).length > 0 ? (
                      <div className="bubble-pills">
                        {["smile", "like", "heart"]
                          .filter((k) => counts[k])
                          .map((k) => (
                            <span
                              key={k}
                              className={`bubble-pill ${mineKinds.has(k) ? "is-mine" : ""}`}
                            >
                              {k === "smile" ? "😊" : k === "like" ? "👍" : "❤️"}
                              {counts[k] > 1 ? ` ${counts[k]}` : ""}
                            </span>
                          ))}
                      </div>
                    ) : null}
                    {reactId === m.id ? (
                      <div className="bubble-picker">
                        {canSmile ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              reactToMessage(m.id, "smile");
                            }}
                          >
                            😊
                          </button>
                        ) : null}
                        {canLike ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              reactToMessage(m.id, "like");
                            }}
                          >
                            👍
                          </button>
                        ) : null}
                        {canHeart ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              reactToMessage(m.id, "heart");
                            }}
                          >
                            ❤️
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {(features.call || features.video) && (
          <div className="call-row">
            {features.call ? <span>Poziv dostupan</span> : null}
            {features.video ? <span>Video dostupan</span> : null}
          </div>
        )}

        <form className="guest-composer" onSubmit={sendText}>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={charLimit ? `Poruka (max ${charLimit})` : "Poruka…"}
            maxLength={charLimit || undefined}
          />
          {features.voice ? (
            <button
              type="button"
              className={recording ? "rec on" : "rec"}
              onClick={toggleRecord}
            >
              {recording ? "Stop" : "Glas"}
            </button>
          ) : null}
          <button type="submit">Šalji</button>
        </form>
        {error ? <p className="err">{error}</p> : null}
      </div>
    );
  }

  const closed = !inviteOk;

  return (
    <div className="guest-shell guest-shell--modal">
      <form className="request-card request-card--modal" onSubmit={submitRequest}>
        <h1>Zahtjev za razgovor</h1>
        <p className="lead">
          {closed
            ? inviteError || "Link nije dostupan."
            : "Ime, slika i kratki opis — Ema odlučuje."}
        </p>

        <label>
          Ime
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={closed || busy}
            required
          />
        </label>

        <label className="avatar-label">
          Slika
          <input
            type="file"
            accept="image/*"
            onChange={onAvatarChange}
            disabled={closed || busy}
          />
          {avatarPreview ? (
            <img src={avatarPreview} alt="" className="avatar-preview" />
          ) : null}
        </label>

        <label>
          Opis
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            disabled={closed || busy}
            required
            placeholder="Tko si, zašto želiš razgovarati…"
          />
        </label>

        {error ? <p className="err">{error}</p> : null}

        <button type="submit" className="primary" disabled={closed || busy}>
          {busy ? "Šaljem…" : "Pošalji zahtjev"}
        </button>
      </form>
    </div>
  );
}
