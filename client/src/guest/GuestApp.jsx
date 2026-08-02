import { useCallback, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { apiUrl, mediaUrl, socketUrl } from "../lib/api.js";

const COOKIE_KEY = "queenema_cookies";

function detectDevice() {
  const ua = navigator.userAgent || "";
  const mobile = /Mobi|Android|iPhone|iPad|iPod/i.test(ua);
  return { device: mobile ? "mobile" : "desktop", userAgent: ua };
}

/**
 * Jednostavan gost ulaz na /guest:
 * ime + opis (+ opcionalna slika) → čeka Emine → chat.
 */
export default function GuestApp() {
  const [cookieConsent, setCookieConsent] = useState(() => {
    try {
      return localStorage.getItem(COOKIE_KEY);
    } catch {
      return null;
    }
  });
  const [apiOk, setApiOk] = useState(null);
  const [open, setOpen] = useState(false);
  const [occupied, setOccupied] = useState(false);
  const [gateError, setGateError] = useState("");
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
  const socketRef = useRef(null);
  const bottomRef = useRef(null);

  const refreshGate = useCallback(async () => {
    try {
      const health = await fetch(apiUrl("/api/health"), { cache: "no-store" });
      if (!health.ok) {
        setApiOk(false);
        return;
      }
      setApiOk(true);
      const avail = await fetch(apiUrl("/api/availability")).then((r) => r.json());
      setOccupied(Boolean(avail.occupied));
      setOpen(Boolean(avail.acceptNewConversations));
      setGateError(
        avail.occupied
          ? "Mjesto je zauzeto — netko već čeka ili razgovara s Emom."
          : avail.acceptNewConversations
            ? ""
            : "Prijava trenutno nije otvorena."
      );
    } catch {
      setApiOk(false);
    }
  }, []);

  useEffect(() => {
    refreshGate();
    const id = setInterval(refreshGate, 12000);
    return () => clearInterval(id);
  }, [refreshGate]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!guestToken || cookieConsent !== "accepted") return undefined;
    const socket = io(socketUrl(), {
      transports: ["websocket", "polling"],
      auth: { role: "guest", guestToken },
    });
    socketRef.current = socket;

    socket.on("guest_state", (payload) => {
      if (payload.status === "active" && payload.conversation) {
        setConversation(payload.conversation);
        setMessages(payload.messages || []);
        setPhase("chat");
      } else if (payload.status === "pending") {
        setPhase("pending");
      }
    });
    socket.on("conversation_state", (payload) => {
      setConversation(payload.conversation);
      setMessages(payload.messages || []);
      setPhase("chat");
    });
    socket.on("new_message", (message) => {
      setMessages((prev) =>
        prev.some((m) => m.id === message.id) ? prev : [...prev, message]
      );
    });
    socket.on("message_updated", (message) => {
      setMessages((prev) => prev.map((m) => (m.id === message.id ? message : m)));
    });
    socket.on("request_accepted", (payload) => {
      if (payload.guestToken !== guestToken) return;
      setPhase("chat");
      setConversation(payload.conversation);
      socket.emit("join_conversation", {
        conversationId: payload.conversation.id,
        role: "guest",
        guestToken,
      });
    });
    socket.on("request_rejected", (payload) => {
      if (payload.guestToken !== guestToken) return;
      setPhase("rejected");
      localStorage.removeItem("queenema_guest");
    });
    socket.on("conversation_ended", () => {
      setPhase("gone");
      setConversation(null);
      localStorage.removeItem("queenema_guest");
    });
    socket.on("conversation_wiped", (payload) => {
      if (payload?.guestToken && payload.guestToken !== guestToken) return;
      setPhase("gone");
      setConversation(null);
      setMessages([]);
      localStorage.removeItem("queenema_guest");
    });
    socket.on("error_message", (payload) => {
      setError(payload.error || "Greška.");
    });
    socket.emit("guest_hello", { guestToken });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [guestToken, cookieConsent]);

  function onAvatarChange(e) {
    const file = e.target.files?.[0];
    if (!file) {
      setAvatarData(null);
      setAvatarPreview("");
      return;
    }
    if (!file.type.startsWith("image/") || file.size > 2_500_000) {
      setError("Slika max 2.5MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      setAvatarPreview(dataUrl);
      setAvatarData({ data: dataUrl, mime: file.type });
      setError("");
    };
    reader.readAsDataURL(file);
  }

  async function submitRequest(e) {
    e.preventDefault();
    if (cookieConsent !== "accepted") {
      setError("Prihvati cookies da nastaviš.");
      return;
    }
    if (!name.trim()) {
      setError("Upiši ime i prezime.");
      return;
    }
    if (!bio.trim()) {
      setError("Napiši kratki opis.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const { device, userAgent } = detectDevice();
      const existing = localStorage.getItem("queenema_guest") || "";
      const res = await fetch(apiUrl("/api/request"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          bio: bio.trim(),
          avatar: avatarData?.data || undefined,
          avatarMime: avatarData?.mime || undefined,
          cookiesAccepted: true,
          device,
          userAgent,
          guestToken: existing || undefined,
        }),
      });
      const data = await res.json();
      if (data.code === "occupied" || data.code === "closed") {
        setError(data.error || "Prijava nije moguća.");
        setOpen(false);
        setOccupied(data.code === "occupied");
        return;
      }
      if (data.code === "already_active" || data.code === "already_pending") {
        const token = data.guestToken || existing;
        if (token) {
          localStorage.setItem("queenema_guest", token);
          setGuestToken(token);
          setPhase(data.code === "already_active" ? "chat" : "pending");
        }
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
    if (!text || !socketRef.current || !conversation?.id) return;
    socketRef.current.emit("send_message", {
      conversationId: conversation.id,
      text,
    });
    setDraft("");
  }

  if (apiOk === false) {
    return (
      <div className="guest-page">
        <div className="guest-card">
          <h1>queenema</h1>
          <p>API nije dostupan. Pokušaj kasnije.</p>
        </div>
      </div>
    );
  }

  if (apiOk === null) {
    return (
      <div className="guest-page">
        <div className="guest-card">
          <h1>queenema</h1>
          <p>Učitavam…</p>
        </div>
      </div>
    );
  }

  if (cookieConsent === null) {
    return (
      <div className="guest-page">
        <div className="guest-card">
          <h1>Cookies</h1>
          <p>Osnovni podaci (uređaj, IP) da Ema vidi tko šalje zahtjev.</p>
          <button
            type="button"
            className="guest-primary"
            onClick={() => {
              localStorage.setItem(COOKIE_KEY, "accepted");
              setCookieConsent("accepted");
            }}
          >
            Prihvaćam
          </button>
        </div>
      </div>
    );
  }

  if (phase === "pending") {
    return (
      <div className="guest-page">
        <div className="guest-card">
          <h1>Čekaš Emine</h1>
          <p>Zahtjev je poslan. Kad prihvati, otvorit će se chat.</p>
        </div>
      </div>
    );
  }

  if (phase === "rejected" || phase === "gone") {
    return (
      <div className="guest-page">
        <div className="guest-card">
          <h1>{phase === "rejected" ? "Odbijeno" : "Kraj"}</h1>
          <p>
            {phase === "rejected"
              ? "Ema nije prihvatila zahtjev."
              : "Razgovor je završen."}
          </p>
        </div>
      </div>
    );
  }

  if (phase === "chat" && conversation) {
    return (
      <div className="guest-page guest-page--chat">
        <header className="guest-chat-head">
          <strong>Ema</strong>
        </header>
        <div className="guest-chat-stream">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`guest-bubble ${m.from === "guest" ? "mine" : ""}`}
            >
              {m.type === "voice" && m.media_url ? (
                <audio controls src={mediaUrl(m.media_url)} />
              ) : (
                <p>{m.text}</p>
              )}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
        <form className="guest-chat-form" onSubmit={sendText}>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Poruka…"
          />
          <button type="submit">Šalji</button>
        </form>
        {error ? <p className="err pad">{error}</p> : null}
      </div>
    );
  }

  const closed = !open;

  return (
    <div className="guest-page">
      <form className="guest-card" onSubmit={submitRequest}>
        <h1>Zahtjev</h1>
        <p className="lead">
          {closed
            ? gateError || "Prijava nije dostupna."
            : "Ime i prezime, opis, slika po želji — Ema odlučuje."}
        </p>

        <label>
          Ime i prezime
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={48}
            disabled={closed || busy}
            required
          />
        </label>

        <label>
          Opis
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={500}
            rows={3}
            disabled={closed || busy}
            required
          />
        </label>

        <label>
          Slika (opcionalno)
          <input
            type="file"
            accept="image/*"
            onChange={onAvatarChange}
            disabled={closed || busy}
          />
        </label>
        {avatarPreview ? (
          <img src={avatarPreview} alt="" className="guest-ava" />
        ) : null}

        {error ? <p className="err">{error}</p> : null}

        <button
          type="submit"
          className="guest-primary"
          disabled={closed || busy}
        >
          {busy ? "Šaljem…" : "Pošalji zahtjev"}
        </button>
      </form>
    </div>
  );
}
