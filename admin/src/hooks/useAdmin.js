import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { apiUrl, mediaUrl, socketUrl } from "../lib/api.js";

const AUTH_KEY = "queenema_admin_auth";

export function useAdmin() {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(AUTH_KEY) || "null");
    } catch {
      return null;
    }
  });
  const [state, setState] = useState({
    settings: { acceptNewConversations: false },
    availability: {},
    ema: null,
    requests: [],
    conversations: [],
    leaderboard: { byScore: [], byMessages: [] },
  });
  const [peek, setPeek] = useState(null);
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState("");
  const [joining, setJoining] = useState(false);
  const socketRef = useRef(null);

  async function login(username, password) {
    setJoining(true);
    setError("");
    try {
      const res = await fetch(apiUrl("/api/admin/login"), {
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
      setState({
        settings: data.settings || { acceptNewConversations: false },
        availability: data.availability || {},
        ema: data.ema || null,
        requests: data.requests || [],
        conversations: data.conversations || [],
        leaderboard: data.leaderboard || { byScore: [], byMessages: [] },
      });
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
    setPeek(null);
    setMessages([]);
  }

  useEffect(() => {
    if (!user) return undefined;
    const socket = io(socketUrl(), {
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;
    socket.on("connect", () => socket.emit("admin_hello"));
    socket.on("admin_state", (payload) => {
      setState({
        settings: payload.settings || { acceptNewConversations: false },
        availability: payload.availability || {},
        ema: payload.ema || null,
        requests: payload.requests || [],
        conversations: payload.conversations || [],
        leaderboard: payload.leaderboard || { byScore: [], byMessages: [] },
      });
    });
    socket.on("settings", (s) =>
      setState((prev) => ({ ...prev, settings: s }))
    );
    socket.on("conversation_state", (payload) => {
      setPeek(payload.conversation);
      setMessages(payload.messages || []);
    });
    socket.on("new_message", (message) => {
      setMessages((prev) =>
        prev.some((m) => m.id === message.id) ? prev : [...prev, message]
      );
    });
    socket.on("patience", ({ conversation }) => {
      if (conversation) {
        setPeek((p) => (p?.id === conversation.id ? conversation : p));
        setState((prev) => ({
          ...prev,
          conversations: prev.conversations.map((c) =>
            c.id === conversation.id ? conversation : c
          ),
        }));
      }
    });
    socket.on("error_message", (payload) => {
      setError(payload.error || "Greška.");
    });
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user]);

  return {
    user,
    ...state,
    peek,
    messages,
    error,
    joining,
    login,
    logout,
    clearError: () => setError(""),
    setAcceptNew: (value) =>
      socketRef.current?.emit("set_accept_new", { value }),
    acceptRequest: (requestId) =>
      socketRef.current?.emit("respond_request", { requestId, accept: true }),
    rejectRequest: (requestId) =>
      socketRef.current?.emit("respond_request", { requestId, accept: false }),
    setPatience: (conversationId, patience) =>
      socketRef.current?.emit("set_patience", { conversationId, patience }),
    endConversation: (conversationId) =>
      socketRef.current?.emit("end_conversation", { conversationId }),
    wipeConversation: (conversationId) =>
      socketRef.current?.emit("wipe_conversation", { conversationId }),
    openConversation: (conversationId) =>
      socketRef.current?.emit("admin_peek", { conversationId }),
    closePeek: () => {
      setPeek(null);
      setMessages([]);
    },
    updateOwnProfile: async (body) => {
      const res = await fetch(apiUrl("/api/admin/profile"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) return { ok: false, error: data.error };
      localStorage.setItem(AUTH_KEY, JSON.stringify(data.user));
      setUser(data.user);
      return { ok: true };
    },
    updateEmaProfile: async (body) => {
      const res = await fetch(apiUrl("/api/admin/ema-profile"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) return { ok: false, error: data.error };
      return { ok: true, ema: data.ema };
    },
    mediaUrl,
  };
}
