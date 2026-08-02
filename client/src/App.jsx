import { useCallback, useEffect, useMemo, useState } from "react";
import { useEma } from "./hooks/useEma.js";
import { useTheme } from "./hooks/useTheme.js";
import { apiUrl } from "./lib/api.js";
import Preloader from "./components/Preloader.jsx";
import Login from "./components/Login.jsx";
import Home from "./components/Home.jsx";
import ConversationView from "./components/ConversationView.jsx";
import Unavailable from "./components/Unavailable.jsx";
import Preview from "./components/Preview.jsx";
import { FloatingPathsBackground } from "@/components/ui/floating-paths";

function previewMode() {
  if (typeof window === "undefined") return null;
  const p = new URLSearchParams(window.location.search).get("preview");
  if (p === "chat" || p === "request") return p;
  return null;
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [apiOk, setApiOk] = useState(null);
  const ema = useEma();
  const theme = useTheme();
  const preview = useMemo(() => previewMode(), []);

  const checkApi = useCallback(async () => {
    try {
      const res = await fetch(apiUrl("/api/health"), { cache: "no-store" });
      const data = await res.json();
      setApiOk(Boolean(res.ok && data?.ok));
      return Boolean(res.ok && data?.ok);
    } catch {
      setApiOk(false);
      return false;
    }
  }, []);

  useEffect(() => {
    if (preview) {
      setReady(true);
      setApiOk(true);
      return;
    }
    let cancelled = false;
    (async () => {
      for (let i = 0; i < 5; i++) {
        const ok = await checkApi();
        if (cancelled || ok) return;
        await new Promise((r) => setTimeout(r, 600));
      }
    })();
    const id = setInterval(checkApi, 15000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [checkApi, preview]);

  if (!ready || apiOk === null) {
    return (
      <div className="app-root">
        <Preloader onDone={() => setReady(true)} />
      </div>
    );
  }

  if (apiOk === false) {
    return (
      <div className="app-root">
        <div className="app-stage">
          <FloatingPathsBackground position={-1} className="h-full">
            <Unavailable
              code="404"
              title="Stranica nedostupna"
              message="API server nije dostupan. Provjeri je li queenema API upaljen."
              onRetry={checkApi}
            />
          </FloatingPathsBackground>
        </div>
      </div>
    );
  }

  return (
    <div className="app-root">
      <div className="app-stage">
        <FloatingPathsBackground position={-1} className="h-full min-h-0">
          {preview ? (
            <Preview mode={preview} />
          ) : !ema.user ? (
            <Login onLogin={ema.login} joining={ema.joining} error={ema.error} />
          ) : ema.activeId ? (
            <ConversationView
              conversation={ema.active}
              messages={ema.messages}
              error={ema.error}
              onBack={() => ema.setActiveId(null)}
              onPatience={ema.setPatience}
              onSend={ema.send}
              onSendVoice={ema.sendVoice}
              onReactMessage={ema.reactMessage}
              onSendCall={ema.sendCall}
            />
          ) : (
            <Home
              user={ema.user}
              requests={ema.requests}
              conversations={ema.conversations}
              leaderboard={ema.leaderboard}
              settings={ema.settings}
              onAccept={ema.acceptRequest}
              onReject={ema.rejectRequest}
              onOpenConversation={ema.setActiveId}
              onSetPatience={ema.setPatience}
              onSetAcceptNew={ema.setAcceptNew}
              onLogout={ema.logout}
              onUpdateProfile={ema.updateProfile}
              themeId={theme.themeId}
              themes={theme.themes}
              onSetTheme={theme.setTheme}
            />
          )}
        </FloatingPathsBackground>
      </div>
    </div>
  );
}
