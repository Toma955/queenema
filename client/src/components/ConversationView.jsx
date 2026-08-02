import { useEffect, useRef, useState } from "react";
import {
  Ban,
  Camera,
  Coffee,
  Heart,
  Infinity as InfinityIcon,
  Mic,
  Phone,
  Smile,
  ThumbsUp,
  Video,
} from "lucide-react";
import PatienceBar from "./PatienceBar.jsx";
import CallInvite from "./CallInvite.jsx";
import VoicePlayer from "./VoicePlayer.jsx";
import VoiceRecordBar from "./VoiceRecordBar.jsx";
import { useVoiceRecorder } from "../hooks/useVoiceRecorder.js";
import { apiUrl } from "../lib/api.js";

function mediaSrc(url) {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return apiUrl(url);
}

/**
 * Honeycomb: centri po redoslijedu L→D (donji i / 6, gornji u udubinama).
 * Pale se kumulativno kako stoje — lijeve se NE gase dok slider ne padne ispod ∞.
 */
const STEP = 100 / 6;
const AT = {
  cut: 0,
  harsh: STEP * 0.5,
  soft: STEP * 1,
  mid: STEP * 1.5,
  like: STEP * 2,
  smile: STEP * 2.5,
  free: 50,
  voice: STEP * 3.5,
  photo: STEP * 4,
  call: STEP * 4.5,
  video: STEP * 5,
  heart: STEP * 5.5,
  coffee: 100,
};

function lit(at, p, id) {
  if (id === "cut") return p <= 0;
  return p >= at;
}

const ZIG_BOT = [
  { id: "cut", at: AT.cut, tone: "cut", side: "left", Icon: Ban, label: "Prekid · 0" },
  {
    id: "soft",
    at: AT.soft,
    tone: "soft",
    side: "left",
    caption: "10",
    sub: "250",
    label: "10 / dan · 250",
  },
  {
    id: "like",
    at: AT.like,
    tone: "like",
    side: "left",
    Icon: ThumbsUp,
    label: `Like na poruci · ${Math.round(AT.like)}`,
  },
  {
    id: "free",
    at: AT.free,
    tone: "free",
    side: "mid",
    Icon: InfinityIcon,
    label: "∞ · 50",
  },
  {
    id: "photo",
    at: AT.photo,
    tone: "photo",
    side: "right",
    Icon: Camera,
    label: `Foto · ${Math.round(AT.photo)}`,
  },
  {
    id: "video",
    at: AT.video,
    tone: "video",
    side: "right",
    Icon: Video,
    label: `Video · ${Math.round(AT.video)}`,
  },
  {
    id: "coffee",
    at: AT.coffee,
    tone: "coffee",
    side: "right",
    Icon: Coffee,
    label: "Kava · 100",
  },
];

const ZIG_TOP = [
  {
    id: "harsh",
    at: AT.harsh,
    tone: "limit",
    side: "left",
    caption: "1",
    sub: "50",
    label: "1 / dan · 50",
  },
  {
    id: "mid",
    at: AT.mid,
    tone: "mid",
    side: "left",
    caption: "20",
    sub: "250",
    label: "20 / dan · 250",
  },
  {
    id: "smile",
    at: AT.smile,
    tone: "smile",
    side: "left",
    Icon: Smile,
    label: `Smajlić na poruci · ${Math.round(AT.smile)}`,
  },
  {
    id: "voice",
    at: AT.voice,
    tone: "voice",
    side: "right",
    Icon: Mic,
    label: `Glasovna · ${Math.round(AT.voice)}`,
  },
  {
    id: "call",
    at: AT.call,
    tone: "call",
    side: "right",
    Icon: Phone,
    label: `Poziv · ${Math.round(AT.call)}`,
  },
  {
    id: "heart",
    at: AT.heart,
    tone: "heart",
    side: "right",
    Icon: Heart,
    label: `Srce Emi · ${Math.round(AT.heart)}`,
  },
];

const REACT_OPTS = [
  { kind: "smile", emoji: "😊", label: "Smajlić" },
  { kind: "like", emoji: "👍", label: "Like" },
  { kind: "heart", emoji: "❤️", label: "Srce" },
];

const REACTABLE = new Set(["text", "voice", "call", "video"]);

function Chip({ chip, patience }) {
  const on = lit(chip.at, patience, chip.id);
  const Icon = chip.Icon;
  return (
    <div
      className={`conv__chip side-${chip.side} tone-${chip.tone} ${on ? "is-on" : "is-off"}`}
      title={chip.label || `${chip.caption} · ${chip.sub}`}
    >
      {Icon ? (
        <Icon size={16} strokeWidth={chip.tone === "cut" ? 2.2 : 1.9} aria-hidden />
      ) : (
        <>
          <strong>{chip.caption}</strong>
          <span>{chip.sub}</span>
        </>
      )}
    </div>
  );
}

function ReactionBar({ reactions, onPick, open }) {
  const counts = {};
  for (const r of reactions || []) {
    counts[r.kind] = (counts[r.kind] || 0) + 1;
  }
  const mineKinds = new Set(
    (reactions || []).filter((r) => r.from === "ema").map((r) => r.kind)
  );

  return (
    <div className={`msg__reacts ${open ? "is-open" : ""}`}>
      {Object.keys(counts).length > 0 ? (
        <div className="msg__react-pills">
          {REACT_OPTS.filter((o) => counts[o.kind]).map((o) => (
            <button
              key={o.kind}
              type="button"
              className={`msg__pill ${mineKinds.has(o.kind) ? "is-mine" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                onPick(o.kind);
              }}
              title={o.label}
            >
              {o.emoji}
              {counts[o.kind] > 1 ? <span>{counts[o.kind]}</span> : null}
            </button>
          ))}
        </div>
      ) : null}
      {open ? (
        <div className="msg__react-picker" role="menu">
          {REACT_OPTS.map((o) => (
            <button
              key={o.kind}
              type="button"
              className={`msg__pick ${mineKinds.has(o.kind) ? "is-on" : ""}`}
              title={o.label}
              onClick={(e) => {
                e.stopPropagation();
                onPick(o.kind);
              }}
            >
              {o.emoji}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function ConversationView({
  conversation,
  messages,
  error,
  onBack,
  onPatience,
  onSend,
  onSendVoice,
  onReactMessage,
  onSendCall,
  onSendReaction,
  onEnd,
  onWipe,
  isAdmin = false,
  canSetInterest = true,
}) {
  const [text, setText] = useState("");
  const [interestOpen, setInterestOpen] = useState(false);
  const [draftPatience, setDraftPatience] = useState(null);
  const [reactId, setReactId] = useState(null);
  const bottomRef = useRef(null);
  const interestRef = useRef(null);
  const {
    recording,
    elapsed: recElapsed,
    start: startRec,
    cancel: cancelRec,
    send: sendRec,
  } = useVoiceRecorder({
    onSend: (audio, mime, durationSec) => onSendVoice?.(audio, mime, durationSec),
  });

  const patience =
    draftPatience != null
      ? draftPatience
      : conversation?.patience ?? 50;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!interestOpen) setDraftPatience(null);
  }, [interestOpen]);

  useEffect(() => {
    if (!interestOpen) return;
    function onPointerDown(e) {
      if (!interestRef.current?.contains(e.target)) {
        setInterestOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [interestOpen]);

  useEffect(() => {
    if (reactId == null) return;
    function onPointerDown(e) {
      if (!e.target.closest?.(".msg")) setReactId(null);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [reactId]);

  function submit(e) {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    onSend(t);
    setText("");
  }

  const ended = conversation?.status === "ended";
  const guestName = conversation?.guestName || "Gost";
  const features = conversation?.features || {};

  return (
    <section className={`conv ${interestOpen ? "conv--interest" : ""}`}>
      {!interestOpen ? (
        <header className="conv__head">
          <button type="button" className="ghost-btn conv__back" onClick={onBack}>
            Povratak
          </button>
          <div className="conv__center">
            <button
              type="button"
              className="conv__name-btn"
              onClick={() => {
                if (!canSetInterest || ended) return;
                setInterestOpen(true);
              }}
              aria-expanded={false}
              disabled={!canSetInterest || ended}
            >
              {guestName}
            </button>
          </div>
          {!ended &&
          (features.call || features.video || features.heart || features.coffee) ? (
            <div className="conv__call-actions">
              {features.call ? (
                <button
                  type="button"
                  className="conv__call-btn"
                  title="Poziv"
                  onClick={() => onSendCall?.("call")}
                >
                  <Phone size={16} />
                </button>
              ) : null}
              {features.video ? (
                <button
                  type="button"
                  className="conv__call-btn"
                  title="Videopoziv"
                  onClick={() => onSendCall?.("video")}
                >
                  <Video size={16} />
                </button>
              ) : null}
              {features.heart ? (
                <button
                  type="button"
                  className="conv__call-btn"
                  title="Srce"
                  onClick={() => onSendReaction?.("heart")}
                >
                  <Heart size={16} />
                </button>
              ) : null}
              {features.coffee ? (
                <button
                  type="button"
                  className="conv__call-btn"
                  title="Kava / dejt"
                  onClick={() => onSendReaction?.("coffee")}
                >
                  <Coffee size={16} />
                </button>
              ) : null}
            </div>
          ) : (
            <span className="conv__head-spacer" aria-hidden />
          )}
        </header>
      ) : null}

      {interestOpen && canSetInterest ? (
        <div className="conv__interest" ref={interestRef}>
          <div className="conv__zig" aria-label="Faktor zainteresiranosti">
            <div className="conv__zig-row conv__zig-row--top">
              {ZIG_TOP.map((chip) => (
                <Chip key={chip.id} chip={chip} patience={patience} />
              ))}
            </div>
            <div className="conv__zig-row conv__zig-row--bot">
              {ZIG_BOT.map((chip) => (
                <Chip key={chip.id} chip={chip} patience={patience} />
              ))}
            </div>
          </div>

          <PatienceBar
            value={patience}
            onChange={setDraftPatience}
            onCommit={(v) => {
              setDraftPatience(v);
              onPatience?.(v);
            }}
            readonly={ended}
          />
          <p className="conv__score">score {patience}</p>
          {patience <= 0 ? (
            <p className="conv__wipe-hint">Prekid — razgovor se briše</p>
          ) : null}
          {isAdmin ? (
            <div className="conv__admin-actions">
              <button type="button" className="ghost-btn" onClick={onEnd}>
                Završi chat
              </button>
              <button type="button" className="ghost-btn conv__wipe-btn" onClick={onWipe}>
                Obriši (wipe)
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="chat-stream">
        {messages.map((m) => {
          if (m.type === "system") {
            return (
              <p key={m.id} className="msg msg--system">
                {m.text}
              </p>
            );
          }
          const mine = m.from === "ema";
          const canReact = REACTABLE.has(m.type) && !ended;
          return (
            <article
              key={m.id}
              className={`msg ${mine ? "is-mine" : ""} ${canReact ? "is-reactable" : ""}`}
              onClick={() => {
                if (!canReact) return;
                setReactId((id) => (id === m.id ? null : m.id));
              }}
            >
              {m.type === "voice" ? (
                <VoicePlayer
                  src={mediaSrc(m.media_url || m.mediaUrl)}
                  durationHint={Number(m.duration_sec || m.durationSec) || 0}
                />
              ) : m.type === "reaction" ? (
                <p className="msg__react">{m.text}</p>
              ) : m.type === "call" || m.type === "video" ? (
                <CallInvite
                  kind={m.type === "video" ? "video" : "call"}
                  fromLabel={m.from === "ema" ? "Ema" : guestName}
                />
              ) : (
                <p className="msg__text">{m.text}</p>
              )}
              {canReact || (m.reactions && m.reactions.length) ? (
                <ReactionBar
                  reactions={m.reactions}
                  open={reactId === m.id}
                  onPick={(kind) => {
                    onReactMessage?.(m.id, kind);
                    setReactId(null);
                  }}
                />
              ) : null}
            </article>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {error ? <p className="err pad">{error}</p> : null}

      {!ended ? (
        recording ? (
          <VoiceRecordBar
            elapsed={recElapsed}
            onCancel={cancelRec}
            onSend={sendRec}
          />
        ) : (
          <form className="island island--bar" onSubmit={submit}>
            <button
              type="button"
              className="island__mic"
              onClick={startRec}
              aria-label="Glasovna"
            >
              <Mic size={18} />
            </button>
            <input
              className="island__input"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Poruka…"
              maxLength={2000}
              enterKeyHint="send"
            />
            <button className="island__send" type="submit" disabled={!text.trim()}>
              ↑
            </button>
          </form>
        )
      ) : null}
    </section>
  );
}
