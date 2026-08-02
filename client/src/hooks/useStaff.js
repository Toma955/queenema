import { useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import { apiUrl, socketUrl } from "../lib/api.js";
import { clearChatCache, loadChatCache, saveChatCache } from "../lib/chatCache.js";

/**
 * Ema ili Admin — isti UI/flow.
 * Admin: /api/admin/login + admin_hello + admin kontrole.
 * Cookies se NE traže ovdje (samo na javnom guest ulazu).
 */
export function useStaff(mode = "ema") {
  const isAdmin = mode === "admin";
  const AUTH_KEY = isAdmin ? "queenema_admin_auth" : "queenema_ema_auth";
  const CACHE_KEY = isAdmin ? "queenema_admin_chat" : "queenema_ema_chat";
  const loginPath = isAdmin ? "/api/admin/login" : "/api/login";
  const profilePath = isAdmin ? "/api/admin/profile" : "/api/ema/profile";
  const hello = isAdmin ? "admin_hello" : "ema_hello";
  const joinRole = isAdmin ? "admin" : "ema";

  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(AUTH_KEY) || "null");
    } catch {
      return null;
    }
  });
  const [settings, setSettings] = useState({ acceptNewConversations: false });
  const [requests, setRequests] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [allConversations, setAllConversations] = useState([]);
  const [leaderboard, setLeaderboard] = useState({ byScore: [], byMessages: [] });
  const [emaProfile, setEmaProfile] = useState(null);
  const cachedChat = useMemo(() => loadChatCache(CACHE_KEY), [CACHE_KEY]);
  const [activeId, setActiveId] = useState(() => cachedChat?.activeId ?? null);
  const [active, setActive] = useState(() => cachedChat?.conversation ?? null);
  const [messages, setMessages] = useState(() =>
    Array.isArray(cachedChat?.messages) ? cachedChat.messages : []
  );
  const [error, setError] = useState("");
  const [joining, setJoining] = useState(false);
  const socketRef = useRef(null);
  const patienceTimerRef = useRef(null);
  const patiencePendingRef = useRef(null);

  function applyAdminState(payload) {
    setSettings(payload.settings || { acceptNewConversations: false });
    setRequests(
      (payload.requests || []).filter((r) => r.status === "pending" || !r.status)
    );
    const all = payload.conversations || [];
    setAllConversations(all);
    setConversations(all.filter((c) => c.status === "active"));
    setLeaderboard(payload.leaderboard || { byScore: [], byMessages: [] });
    setEmaProfile(payload.ema || null);
  }

  function applyEmaState(payload) {
    setSettings(payload.settings || { acceptNewConversations: false });
    setRequests(payload.requests || []);
    setConversations(payload.conversations || []);
    setAllConversations(payload.conversations || []);
    setLeaderboard(payload.leaderboard || { byScore: [], byMessages: [] });
  }

  async function login(username, password) {
    setJoining(true);
    setError("");
    try {
      const res = await fetch(apiUrl(loginPath), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Prijava nije uspjela.");
        return;
      }
      localStorage.setItem(AUTH_KEY, JSON.stringify(data.user));
      setUser(data.user);
      if (isAdmin) applyAdminState(data);
      else applyEmaState(data);
    } catch {
      setError("Server nije dostupan.");
    } finally {
      setJoining(false);
    }
  }

  function logout() {
    localStorage.removeItem(AUTH_KEY);
    clearChatCache(CACHE_KEY);
    socketRef.current?.disconnect();
    setUser(null);
    setActiveId(null);
    setActive(null);
    setMessages([]);
  }

  async function updateProfile({ name, username, password, currentPassword }) {
    try {
      const res = await fetch(apiUrl(profilePath), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, username, password, currentPassword }),
      });
      const data = await res.json();
      if (!res.ok) return { ok: false, error: data.error || "Greška." };
      localStorage.setItem(AUTH_KEY, JSON.stringify(data.user));
      setUser(data.user);
      return { ok: true, user: data.user };
    } catch {
      return { ok: false, error: "Server nije dostupan." };
    }
  }

  async function updateEmaAsAdmin({ name, username, password }) {
    if (!isAdmin) return { ok: false, error: "Samo admin." };
    try {
      const res = await fetch(apiUrl("/api/admin/ema-profile"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, username, password }),
      });
      const data = await res.json();
      if (!res.ok) return { ok: false, error: data.error || "Greška." };
      setEmaProfile(data.ema || null);
      return { ok: true, ema: data.ema };
    } catch {
      return { ok: false, error: "Server nije dostupan." };
    }
  }

  useEffect(() => {
    if (!user) return undefined;
    const socket = io(socketUrl(), {
      path: "/socket.io",
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    socket.on("connect", () => socket.emit(hello));

    socket.on("ema_state", (payload) => {
      if (!isAdmin) applyEmaState(payload);
    });
    socket.on("admin_state", (payload) => {
      if (isAdmin) applyAdminState(payload);
    });

    socket.on("settings", (s) => setSettings(s));
    socket.on("new_request", (req) => {
      setRequests((prev) => {
        if (prev.some((r) => r.id === req.id)) return prev;
        return [...prev, req];
      });
    });

    socket.on("conversation_started", (c) => {
      setConversations((prev) => {
        if (prev.some((x) => x.id === c.id)) return prev;
        return [...prev, c];
      });
      setActiveId(c.id);
    });

    socket.on("conversation_state", (payload) => {
      setActive(payload.conversation);
      setMessages(payload.messages || []);
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

    socket.on("patience", ({ conversation }) => {
      setActive(conversation);
      setConversations((prev) =>
        prev.map((c) => (c.id === conversation.id ? conversation : c))
      );
      setAllConversations((prev) =>
        prev.map((c) => (c.id === conversation.id ? conversation : c))
      );
    });

    socket.on("conversation_ended", ({ conversation }) => {
      setActive(conversation);
      setConversations((prev) => prev.filter((c) => c.id !== conversation.id));
      setAllConversations((prev) =>
        prev.map((c) => (c.id === conversation.id ? conversation : c))
      );
      setActiveId((id) => {
        if (id === conversation.id) {
          clearChatCache(CACHE_KEY);
          setMessages([]);
          return null;
        }
        return id;
      });
    });

    socket.on("conversation_wiped", ({ conversationId }) => {
      setConversations((prev) => prev.filter((c) => c.id !== conversationId));
      setAllConversations((prev) =>
        prev.filter((c) => c.id !== conversationId)
      );
      setActiveId((id) => {
        if (id === conversationId) {
          clearChatCache(CACHE_KEY);
          setActive(null);
          setMessages([]);
          return null;
        }
        return id;
      });
    });

    socket.on("error_message", (payload) => {
      setError(payload.error || "Greška.");
    });

    return () => {
      if (patienceTimerRef.current) {
        window.clearTimeout(patienceTimerRef.current);
        const pending = patiencePendingRef.current;
        if (pending && socketRef.current) {
          socketRef.current.emit("set_patience", pending);
        }
      }
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user, isAdmin, hello]);

  useEffect(() => {
    if (!user || !activeId || !socketRef.current) return;
    socketRef.current.emit("join_conversation", {
      conversationId: activeId,
      role: joinRole,
    });
  }, [user, activeId, joinRole]);

  useEffect(() => {
    if (!user) return;
    if (activeId && active) {
      saveChatCache(CACHE_KEY, {
        activeId,
        conversation: active,
        messages,
      });
    } else if (!activeId) {
      clearChatCache(CACHE_KEY);
    }
  }, [user, activeId, active, messages, CACHE_KEY]);

  const features = useMemo(
    () =>
      active?.features || {
        voice: false,
        call: false,
        video: false,
        coffee: false,
        limited: false,
      },
    [active]
  );

  return {
    mode,
    isAdmin,
    user,
    settings,
    requests,
    conversations,
    allConversations,
    leaderboard,
    emaProfile,
    activeId,
    setActiveId,
    active,
    messages,
    features,
    error,
    joining,
    login,
    logout,
    updateProfile,
    updateEmaAsAdmin,
    setAcceptNew: (value) =>
      socketRef.current?.emit("set_accept_new", { value }),
    acceptRequest: (requestId) =>
      socketRef.current?.emit("respond_request", { requestId, accept: true }),
    rejectRequest: (requestId) =>
      socketRef.current?.emit("respond_request", { requestId, accept: false }),
    setPatience: (patience, conversationId) => {
      const id = conversationId ?? activeId;
      if (!id) return;
      patiencePendingRef.current = {
        conversationId: id,
        patience: Math.round(Number(patience)),
      };
      if (patienceTimerRef.current) {
        window.clearTimeout(patienceTimerRef.current);
      }
      // Šalji tek kad Ema završi pomicanje (ne svaki piksel)
      patienceTimerRef.current = window.setTimeout(() => {
        const pending = patiencePendingRef.current;
        patiencePendingRef.current = null;
        patienceTimerRef.current = null;
        if (!pending || !socketRef.current) return;
        socketRef.current.emit("set_patience", pending);
      }, 420);
    },
    endConversation: (conversationId) => {
      const id = conversationId ?? activeId;
      if (!id) return;
      socketRef.current?.emit("end_conversation", { conversationId: id });
    },
    wipeConversation: (conversationId) => {
      const id = conversationId ?? activeId;
      if (!id) return;
      socketRef.current?.emit("wipe_conversation", { conversationId: id });
    },
    send: (text) =>
      activeId &&
      socketRef.current?.emit("send_message", {
        conversationId: activeId,
        text,
      }),
    sendVoice: (audio, mime, durationSec) =>
      activeId &&
      socketRef.current?.emit("send_voice", {
        conversationId: activeId,
        audio,
        mime,
        durationSec,
      }),
    sendPhoto: (image, mime) =>
      activeId &&
      socketRef.current?.emit("send_photo", {
        conversationId: activeId,
        image,
        mime,
      }),
    sendReaction: (kind) =>
      activeId &&
      socketRef.current?.emit("send_reaction", {
        conversationId: activeId,
        kind,
      }),
    reactMessage: (messageId, kind) =>
      activeId &&
      socketRef.current?.emit("react_message", {
        conversationId: activeId,
        messageId,
        kind,
      }),
    sendCall: (kind) =>
      activeId &&
      socketRef.current?.emit("send_call", {
        conversationId: activeId,
        kind,
      }),
    respondInvite: (messageId, answer) =>
      activeId &&
      socketRef.current?.emit("respond_invite", {
        conversationId: activeId,
        messageId,
        answer,
      }),
    socketRef,
  };
}

/** @deprecated use useStaff('ema') */
export function useEma() {
  return useStaff("ema");
}
