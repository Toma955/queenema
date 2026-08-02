import { useEffect, useRef, useState } from "react";
import { useChat } from "./hooks/useChat.js";
import Preloader from "./components/Preloader.jsx";
import IPhoneGate from "./components/IPhoneGate.jsx";
import UpdateMode from "./components/modes/UpdateMode.jsx";
import SleepMode from "./components/modes/SleepMode.jsx";
import ChatMode from "./components/modes/ChatMode.jsx";

function isIPhone() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const force = new URLSearchParams(window.location.search).has("force");
  if (force) return true;
  const iPhone = /iPhone|iPod/i.test(ua);
  const local =
    location.hostname === "localhost" || location.hostname === "127.0.0.1";
  return iPhone || local;
}

export default function App() {
  const [ready, setReady] = useState(false);
  const allowed = isIPhone();
  const chat = useChat("ema");
  const joinRef = useRef(chat.join);
  joinRef.current = chat.join;
  const startedRef = useRef(false);

  useEffect(() => {
    if (!ready || startedRef.current) return;
    startedRef.current = true;
    joinRef.current();
  }, [ready]);

  if (!allowed) {
    return (
      <div className="phone-root">
        <IPhoneGate />
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="phone-root">
        <Preloader onDone={() => setReady(true)} />
      </div>
    );
  }

  return (
    <div className="phone-root">
      <div className="phone-stage">
        {chat.mode === "update" && <UpdateMode />}
        {chat.mode === "sleep" && <SleepMode partner={chat.partner} />}
        {chat.mode === "chat" && (
          <ChatMode
            user={chat.user}
            partner={chat.partner}
            messages={chat.messages}
            error={chat.error}
            joining={chat.joining}
            onSend={chat.send}
            onSendVoice={chat.sendVoice}
          />
        )}
      </div>
    </div>
  );
}
