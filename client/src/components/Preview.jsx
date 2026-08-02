import { useState } from "react";
import ConversationView from "./ConversationView.jsx";

export const DEMO_REQUEST = {
  id: "demo-req",
  guestName: "Gost",
  guestBio: "Kratki opis za preview.",
  guestAvatar: null,
  meta: { device: "mobile", ip: "—" },
  status: "pending",
  demo: true,
};

export const DEMO_CONV = {
  id: "demo-chat",
  guestName: "Gost",
  guestBio: "Kratki opis za preview.",
  guestAvatar: null,
  meta: { device: "mobile", ip: "—" },
  status: "active",
  patience: 55,
  totalMessages: 3,
  features: {
    voice: false,
    call: false,
    video: false,
    coffee: false,
    limited: false,
  },
  demo: true,
};

export const DEMO_FEATURES = {
  voice: false,
  call: false,
  video: false,
  coffee: false,
  limited: false,
  maxMessages: null,
  maxChars: null,
};

export const DEMO_MESSAGES = [
  { id: 1, from: "guest", type: "text", text: "Bok Ema." },
  { id: 2, from: "ema", type: "text", text: "Bok. Kako si?" },
  { id: 3, from: "guest", type: "text", text: "Dobro, hvala." },
];

export function DemoChat({ onBack }) {
  const [patience, setPatience] = useState(DEMO_CONV.patience);
  const features =
    patience >= 100
      ? { ...DEMO_FEATURES, coffee: true, call: true, video: true, voice: true }
      : patience >= 75
        ? { ...DEMO_FEATURES, call: true, video: true, voice: true }
        : patience >= 60
          ? { ...DEMO_FEATURES, voice: true }
          : patience > 0 && patience < 40
            ? { ...DEMO_FEATURES, limited: true, maxMessages: 5, maxChars: 80 }
            : DEMO_FEATURES;

  return (
    <ConversationView
      conversation={{ ...DEMO_CONV, patience }}
      messages={DEMO_MESSAGES}
      features={features}
      error=""
      canSetInterest
      onBack={onBack}
      onPatience={setPatience}
      onSend={() => {}}
      onSendVoice={() => {}}
    />
  );
}

export default function Preview({ mode = "request", onBack }) {
  if (mode === "chat") {
    return <DemoChat onBack={onBack || (() => {})} />;
  }

  return (
    <section className="home home--min" style={{ paddingTop: "1.25rem" }}>
      <p className="home__eyebrow" style={{ textAlign: "center" }}>
        Preview · Zahtjev
      </p>
      <ul className="home__list" style={{ marginTop: "1rem", padding: "0 0.25rem" }}>
        <li className="home__row">
          <div className="req__main">
            <span className="req__ava ph" />
            <div className="req__text">
              <strong>{DEMO_REQUEST.guestName}</strong>
              <p className="req__bio">{DEMO_REQUEST.guestBio}</p>
              <p className="muted tiny">
                {DEMO_REQUEST.meta.device} · {DEMO_REQUEST.meta.ip}
              </p>
            </div>
          </div>
          <div className="req__actions">
            <button type="button" className="btn-accept">
              Prihvati
            </button>
            <button type="button" className="btn-reject">
              Odbij
            </button>
          </div>
        </li>
      </ul>
    </section>
  );
}
