import { useCallback, useEffect, useMemo, useState } from "react";
import { useStaff } from "./hooks/useStaff.js";
import { useTheme } from "./hooks/useTheme.js";
import { apiUrl } from "./lib/api.js";
import { isAdminHost, isGuestMode } from "./lib/host.js";
import Preloader from "./components/Preloader.jsx";

function previewMode() {
  if (typeof window === "undefined") return null;
  const p = new URLSearchParams(window.location.search).get("preview");
  if (p === "chat" || p === "request") return p;
  return null;
}

async function warmFonts() {
  if (typeof document === "undefined" || !document.fonts?.ready) return;
  try {
    await Promise.race([
      document.fonts.ready,
      new Promise((r) => setTimeout(r, 2500)),
    ]);
  } catch {
    /* ignore */
  }
}

export default function App() {
  const guestMode = useMemo(() => isGuestMode(), []);
  const adminMode = useMemo(() => isAdminHost(), []);
  const staffMode = adminMode ? "admin" : "ema";
  const [bootProgress, setBootProgress] = useState(0);
  const [bootLabel, setBootLabel] = useState("Pripremam…");
  const [ready, setReady] = useState(false);
  const [apiOk, setApiOk] = useState(null);
  const [Mods, setMods] = useState(null);
  const staff = useStaff(staffMode);
  const theme = useTheme();
  const preview = useMemo(() => previewMode(), []);

  const checkApi = useCallback(async () => {
    try {
      const res = await fetch(apiUrl("/api/health"), { cache: "no-store" });
      const data = await res.json();
      const ok = Boolean(res.ok && data?.ok);
      setApiOk(ok);
      return ok;
    } catch {
      setApiOk(false);
      return false;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        if (guestMode) {
          setBootLabel("Učitavam…");
          setBootProgress(20);
          const [{ default: GuestApp }] = await Promise.all([
            import("./guest/GuestApp.jsx"),
            warmFonts(),
          ]);
          if (cancelled) return;
          setMods({ GuestApp });
          setBootProgress(70);
          await checkApi();
          if (cancelled) return;
          setBootProgress(100);
          setTimeout(() => !cancelled && setReady(true), 160);
          return;
        }

        if (preview) {
          setBootLabel("Učitavam preview…");
          setBootProgress(20);
          const [
            { default: Preview },
            { FloatingPathsBackground },
          ] = await Promise.all([
            import("./components/Preview.jsx"),
            import("@/components/ui/floating-paths"),
          ]);
          if (cancelled) return;
          setMods({ Preview, FloatingPathsBackground });
          setBootProgress(100);
          setApiOk(true);
          setTimeout(() => !cancelled && setReady(true), 180);
          return;
        }

        setBootLabel(adminMode ? "Učitavam admin…" : "Učitavam komponente…");
        setBootProgress(8);
        const [
          { default: Login },
          { default: Home },
          { default: ConversationView },
          { default: Unavailable },
          { default: Preview },
          { FloatingPathsBackground },
        ] = await Promise.all([
          import("./components/Login.jsx"),
          import("./components/Home.jsx"),
          import("./components/ConversationView.jsx"),
          import("./components/Unavailable.jsx"),
          import("./components/Preview.jsx"),
          import("@/components/ui/floating-paths"),
        ]);
        if (cancelled) return;
        setMods({
          Login,
          Home,
          ConversationView,
          Unavailable,
          Preview,
          FloatingPathsBackground,
        });
        setBootProgress(45);

        setBootLabel("Fontovi…");
        await warmFonts();
        if (cancelled) return;
        setBootProgress(60);

        setBootLabel("Spajam API…");
        let ok = false;
        for (let i = 0; i < 6; i++) {
          ok = await checkApi();
          if (cancelled) return;
          setBootProgress(60 + Math.round(((i + 1) / 6) * 30));
          if (ok) break;
          await new Promise((r) => setTimeout(r, 500));
        }
        if (cancelled) return;

        setBootLabel(ok ? "Spremno" : "API nije dostupan");
        setBootProgress(100);
        await new Promise((r) => setTimeout(r, 220));
        if (!cancelled) setReady(true);
      } catch {
        if (!cancelled) {
          setBootLabel("Greška pri učitavanju");
          setBootProgress(100);
          setApiOk(false);
          setTimeout(() => setReady(true), 300);
        }
      }
    })();

    const id = guestMode
      ? null
      : setInterval(() => {
          checkApi();
        }, 20000);

    return () => {
      cancelled = true;
      if (id) clearInterval(id);
    };
  }, [checkApi, preview, guestMode, adminMode]);

  if (!ready || !Mods) {
    return (
      <div className="app-root">
        <Preloader progress={bootProgress} label={bootLabel} />
      </div>
    );
  }

  if (guestMode && Mods.GuestApp) {
    const { GuestApp } = Mods;
    return (
      <div className="app-root">
        <div className="app-stage">
          <GuestApp />
        </div>
      </div>
    );
  }

  const {
    Login,
    Home,
    ConversationView,
    Unavailable,
    Preview,
    FloatingPathsBackground,
  } = Mods;

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
          ) : !staff.user ? (
            <Login
              variant={adminMode ? "admin" : "ema"}
              onLogin={staff.login}
              joining={staff.joining}
              error={staff.error}
            />
          ) : staff.activeId ? (
            <ConversationView
              conversation={staff.active}
              messages={staff.messages}
              error={staff.error}
              isAdmin={staff.isAdmin}
              onBack={() => staff.setActiveId(null)}
              onPatience={staff.setPatience}
              onSend={staff.send}
              onSendVoice={staff.sendVoice}
              onSendPhoto={staff.sendPhoto}
              onReactMessage={staff.reactMessage}
              onSendCall={staff.sendCall}
              onSendReaction={staff.sendReaction}
              onRespondInvite={staff.respondInvite}
              socketRef={staff.socketRef}
              onEnd={() => staff.endConversation()}
              onWipe={() => staff.wipeConversation()}
            />
          ) : (
            <Home
              user={staff.user}
              isAdmin={staff.isAdmin}
              requests={staff.requests}
              conversations={staff.conversations}
              allConversations={staff.allConversations}
              leaderboard={staff.leaderboard}
              settings={staff.settings}
              emaProfile={staff.emaProfile}
              onAccept={staff.acceptRequest}
              onReject={staff.rejectRequest}
              onOpenConversation={staff.setActiveId}
              onSetPatience={staff.setPatience}
              onSetAcceptNew={staff.setAcceptNew}
              onEndConversation={staff.endConversation}
              onWipeConversation={staff.wipeConversation}
              onLogout={staff.logout}
              onUpdateProfile={staff.updateProfile}
              onUpdateEmaProfile={staff.updateEmaAsAdmin}
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
