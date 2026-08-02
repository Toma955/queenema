import { useCallback, useEffect, useState } from "react";
import { useEma } from "./hooks/useEma.js";
import { apiUrl } from "./lib/api.js";
import Preloader from "./components/Preloader.jsx";
import Login from "./components/Login.jsx";
import Home from "./components/Home.jsx";
import ConversationView from "./components/ConversationView.jsx";
import Unavailable from "./components/Unavailable.jsx";

export default function App() {
  const [ready, setReady] = useState(false);
  const [apiOk, setApiOk] = useState(null);
  const ema = useEma();

  const checkApi = useCallback(async () => {
    try {
      const res = await fetch(apiUrl("/api/health"), { cache: "no-store" });
      const data = await res.json();
      setApiOk(Boolean(res.ok && data?.ok));
    } catch {
      setApiOk(false);
    }
  }, []);

  useEffect(() => {
    checkApi();
    const id = setInterval(checkApi, 15000);
    return () => clearInterval(id);
  }, [checkApi]);

  if (apiOk === false) {
    return (
      <div className="app-root">
        <div className="app-stage">
          <Unavailable
            code="404"
            title="Stranica nedostupna"
            message="API server nije dostupan. Provjeri je li queenema API upaljen."
            onRetry={checkApi}
          />
        </div>
      </div>
    );
  }

  if (!ready || apiOk === null) {
    return (
      <div className="app-root">
        <Preloader onDone={() => setReady(true)} />
      </div>
    );
  }

  return (
    <div className="app-root">
      <div className="app-stage">
        {!ema.user ? (
          <Login onLogin={ema.login} joining={ema.joining} error={ema.error} />
        ) : ema.activeId ? (
          <ConversationView
            conversation={ema.active}
            messages={ema.messages}
            features={ema.features}
            error={ema.error}
            onBack={() => ema.setActiveId(null)}
            onPatience={ema.setPatience}
            onEnd={ema.endConversation}
            onSend={ema.send}
            onSendVoice={ema.sendVoice}
          />
        ) : (
          <Home
            settings={ema.settings}
            requests={ema.requests}
            conversations={ema.conversations}
            leaderboard={ema.leaderboard}
            onToggleAccept={ema.setAcceptNew}
            onAccept={ema.acceptRequest}
            onReject={ema.rejectRequest}
            onOpen={ema.setActiveId}
            onLogout={ema.logout}
          />
        )}
      </div>
    </div>
  );
}
