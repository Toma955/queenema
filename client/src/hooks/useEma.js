import { useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import { apiUrl, socketUrl } from "../lib/api.js";

const AUTH_KEY = "queenema_ema_auth";

export function useEma() {
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
  const [leaderboard, setLeaderboard] = useState({ byScore: [], byMessages: [] });
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [active, setActive] = useState(null);
  const [error, setError] = useState("");
  const [joining, setJoining] = useState(false);
  const socketRef = useRef(null);

  async function login(username, password) {
    setJoining(true);
    setError("");
    try {
      const res = await fetch(apiUrl("/api/login"), {
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
      setSettings(data.settings || { acceptNewConversations: false });
      setRequests(data.requests || []);
      setConversations(data.conversations || []);
      setLeaderboard(data.leaderboard || { byScore: [], byMessages: [] });
    } catch {
      setError("Server nije dostupan.");
    } finally {
      setJoining(false);
    }
  }

  function logout() {
    localStorage.removeItem(AUTH_KEY);
    socketRef.current?.disconnect();
    setUser(null);
    setActiveId(null);
    setActive(null);
    setMessages([]);
  }

  useEffect(() => {
    if (!user) return;
    const socket = io(socketUrl(), {
      path: "/socket.io",
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    socket.on("connect", () => socket.emit("ema_hello"));

    socket.on("ema_state", (payload) => {
      setSettings(payload.settings || { acceptNewConversations: false });
      setRequests(payload.requests || []);
      setConversations(payload.conversations || []);
      setLeaderboard(payload.leaderboard || { byScore: [], byMessages: [] });
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

    socket.on("patience", ({ conversation }) => {
      setActive(conversation);
      setConversations((prev) =>
        prev.map((c) => (c.id === conversation.id ? conversation : c))
      );
    });

    socket.on("conversation_ended", ({ conversation }) => {
      setActive(conversation);
      setConversations((prev) => prev.filter((c) => c.id !== conversation.id));
    });

    socket.on("conversation_wiped", ({ conversationId }) => {
      setConversations((prev) => prev.filter((c) => c.id !== conversationId));
      setActiveId((id) => (id === conversationId ? null : id));
      setActive(null);
      setMessages([]);
    });

    socket.on("error_message", (payload) => {
      setError(payload.error || "Greška.");
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user]);

  useEffect(() => {
    if (!user || !activeId || !socketRef.current) return;
    socketRef.current.emit("join_conversation", {
      conversationId: activeId,
      role: "ema",
    });
  }, [user, activeId]);

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
    user,
    settings,
    requests,
    conversations,
    leaderboard,
    activeId,
    setActiveId,
    active,
    messages,
    features,
    error,
    joining,
    login,
    logout,
    setAcceptNew: (value) => socketRef.current?.emit("set_accept_new", { value }),
    acceptRequest: (requestId) =>
      socketRef.current?.emit("respond_request", { requestId, accept: true }),
    rejectRequest: (requestId) =>
      socketRef.current?.emit("respond_request", { requestId, accept: false }),
    setPatience: (patience) =>
      activeId &&
      socketRef.current?.emit("set_patience", {
        conversationId: activeId,
        patience,
      }),
    endConversation: () =>
      activeId &&
      socketRef.current?.emit("end_conversation", { conversationId: activeId }),
    send: (text) =>
      activeId &&
      socketRef.current?.emit("send_message", { conversationId: activeId, text }),
    sendVoice: (audio, mime) =>
      activeId &&
      socketRef.current?.emit("send_voice", {
        conversationId: activeId,
        audio,
        mime,
      }),
  };
}
