import { useCallback, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { Coffee, Heart, Mic, Phone, Video } from "lucide-react";
import { apiUrl, mediaUrl, socketUrl } from "../lib/api.js";

const COOKIE_KEY = "queenema_cookies";

function detectDevice() {
  const ua = navigator.userAgent || "";
  const mobile = /Mobi|Android|iPhone|iPad|iPod/i.test(ua);
  return { device: mobile ? "mobile" : "desktop", userAgent: ua };
}

function MessageBubble({ m }) {
  if (m.type === "system") {
    return <p className="guest-system">{m.text}</p>;
  }
  const mine = m.from === "guest";
  return (
    <div className={`guest-bubble ${mine ? "mine" : ""}`}>
      {m.type === "voice" && m.media_url ? (
        <audio controls src={mediaUrl(m.media_url)} />
      ) : m.type === "call" || m.type === "video" ? (
        <p className="guest-bubble__call">{m.text}</p>
      ) : m.type === "reaction" ? (
        <p className="guest-bubble__react">{m.text}</p>
      ) : (
        <p>{m.text}</p>
      )}
    </div>
  );
}

/**
 * Javni ulaz (queenema.art):
 * ime + opis (+ opcionalna slika) → zahtjev → ako Ema prihvati → račun/chat.
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
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [bio, setBio] = useState("");
  const fileRef = useRef(null);
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
  const [islandOpen, setIslandOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const socketRef = useRef(null);
  const bottomRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const islandRef = useRef(null);

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
    socket.on("patience", ({ conversation: next }) => {
      if (next) setConversation(next);
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

  useEffect(() => {
    if (!islandOpen) return undefined;
    function onDown(e) {
      if (islandRef.current?.contains(e.target)) return;
      setIslandOpen(false);
    }
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [islandOpen]);

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
    if (!firstName.trim()) {
      setError("Upiši ime.");
      return;
    }
    if (!lastName.trim()) {
      setError("Upiši prezime.");
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
          firstName: firstName.trim(),
          lastName: lastName.trim(),
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

  function sendCall(kind) {
    if (!socketRef.current || !conversation?.id) return;
    socketRef.current.emit("send_call", {
      conversationId: conversation.id,
      kind,
    });
    setIslandOpen(false);
  }

  function sendReaction(kind) {
    if (!socketRef.current || !conversation?.id) return;
    socketRef.current.emit("send_reaction", {
      conversationId: conversation.id,
      kind,
    });
    setIslandOpen(false);
  }

  async function toggleVoice() {
    if (recording) {
      try {
        mediaRecorderRef.current?.requestData?.();
      } catch {
        /* ignore */
      }
      mediaRecorderRef.current?.stop();
      setRecording(false);
      return;
    }
    if (!conversation?.features?.voice) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : MediaRecorder.isTypeSupported("audio/mp4")
            ? "audio/mp4"
            : "";
      const recorder = mime
        ? new MediaRecorder(stream, { mimeType: mime })
        : new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || mime || "audio/webm",
        });
        if (blob.size < 100) {
          setError("Snimka je prekratka — drži mic duže.");
          return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
          setError("");
          socketRef.current?.emit("send_voice", {
            conversationId: conversation.id,
            audio: reader.result,
            mime: blob.type,
          });
        };
        reader.readAsDataURL(blob);
      };
      mediaRecorderRef.current = recorder;
      recorder.start(200);
      setRecording(true);
    } catch {
      setError("Mikrofon nije dostupan.");
    }
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
    const features = conversation.features || {};
    const patience = conversation.patience ?? 50;
    const maxChars = features.maxChars ?? 2000;
    const islandActions = [
      features.call
        ? { id: "call", label: "Poziv", Icon: Phone, onClick: () => sendCall("call") }
        : null,
      features.video
        ? {
            id: "video",
            label: "Videopoziv",
            Icon: Video,
            onClick: () => sendCall("video"),
          }
        : null,
      features.heart
        ? {
            id: "heart",
            label: "Srce",
            Icon: Heart,
            onClick: () => sendReaction("heart"),
          }
        : null,
      features.coffee
        ? {
            id: "coffee",
            label: "Kava / dejt",
            Icon: Coffee,
            onClick: () => sendReaction("coffee"),
          }
        : null,
    ].filter(Boolean);

    return (
      <div className="guest-page guest-page--chat">
        <div className="guest-top" ref={islandRef}>
          <button
            type="button"
            className={`guest-top-island${islandOpen ? " is-open" : ""}`}
            onClick={() => setIslandOpen((v) => !v)}
            aria-expanded={islandOpen}
          >
            <span>Ema</span>
            <span className="guest-top-island__score">{patience}</span>
          </button>
          {islandOpen ? (
            <div className="guest-top-menu">
              {islandActions.length ? (
                islandActions.map((a) => (
                  <button key={a.id} type="button" onClick={a.onClick}>
                    <a.Icon size={16} />
                    {a.label}
                  </button>
                ))
              ) : (
                <p className="guest-top-menu__empty">Nema otključanih akcija</p>
              )}
            </div>
          ) : null}
        </div>

        <div className="guest-chat-stream">
          {messages.map((m) => (
            <MessageBubble key={m.id} m={m} />
          ))}
          <div ref={bottomRef} />
        </div>

        <form
          className={`island island--bar guest-composer${features.voice ? "" : " island--nomic"}`}
          onSubmit={sendText}
        >
          {features.voice ? (
            <button
              type="button"
              className={`island__mic ${recording ? "is-rec" : ""}`}
              onClick={toggleVoice}
              aria-label={recording ? "Stop snimanje" : "Glasovna"}
            >
              <Mic size={18} />
            </button>
          ) : null}
          <input
            className="island__input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Poruka…"
            maxLength={maxChars}
            enterKeyHint="send"
          />
          <button className="island__send" type="submit" disabled={!draft.trim()}>
            ↑
          </button>
        </form>
        {error ? <p className="err pad">{error}</p> : null}
      </div>
    );
  }

  const closed = !open;

  return (
    <div className="guest-page">
      <form className="guest-card" onSubmit={submitRequest}>
        <h1>
          <span className="qe">Q</span>ueen<span className="qe">E</span>ma
        </h1>
        <p className="lead">
          {closed
            ? gateError || "Prijava trenutno nije otvorena."
            : "Pošalji zahtjev. Ako Ema prihvati, dobiješ račun."}
        </p>

        {closed ? null : (
          <>
            <div className="guest-form-top">
              <div className="guest-name-stack">
                <label>
                  Ime
                  <input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    maxLength={32}
                    disabled={busy}
                    required
                    autoComplete="given-name"
                  />
                </label>
                <label>
                  Prezime
                  <input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    maxLength={32}
                    disabled={busy}
                    required
                    autoComplete="family-name"
                  />
                </label>
              </div>
              <button
                type="button"
                className={`guest-ava-btn${avatarPreview ? " has-img" : ""}`}
                onClick={() => fileRef.current?.click()}
                disabled={busy}
                aria-label="Dodaj sliku"
              >
                {avatarPreview ? (
                  <img src={avatarPreview} alt="" />
                ) : (
                  <span aria-hidden>+</span>
                )}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={onAvatarChange}
                disabled={busy}
              />
            </div>

            <label>
              Opis
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={500}
                rows={3}
                disabled={busy}
                required
              />
            </label>

            {error ? <p className="err">{error}</p> : null}

            <button type="submit" className="guest-primary" disabled={busy}>
              {busy ? "Šaljem…" : "Pošalji zahtjev"}
            </button>
          </>
        )}
      </form>
    </div>
  );
}
