import { useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import { apiUrl, socketUrl } from "../lib/api.js";

const STORAGE_KEY = "queenema_toma";

export function useAdminChat() {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [mode, setModeState] = useState("chat");
  const [error, setError] = useState("");
  const [joining, setJoining] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!user) return;

    const socket = io(socketUrl(), {
      path: "/socket.io",
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    socket.on("connect", () => socket.emit("join", { userId: user.id }));

    socket.on("chat_state", (payload) => {
      setMessages(payload.messages ?? []);
      setUsers(payload.users ?? []);
      if (payload.mode) setModeState(payload.mode);
      setError("");
    });

    socket.on("new_message", (message) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev;
        return [...prev, message];
      });
    });

    socket.on("chat_cleared", () => setMessages([]));
    socket.on("mode_changed", (payload) => {
      if (payload?.mode) setModeState(payload.mode);
    });
    socket.on("presence", (payload) => {
      setUsers(payload.users ?? []);
      if (payload.mode) setModeState(payload.mode);
    });
    socket.on("error_message", (payload) => {
      setError(payload.error || "Nešto nije u redu.");
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user]);

  const partner = useMemo(() => {
    if (!user) return null;
    return users.find((u) => u.role === "ema") ?? null;
  }, [user, users]);

  async function join() {
    setJoining(true);
    setError("");
    try {
      const res = await fetch(apiUrl("/api/join"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "toma" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Prijava nije uspjela.");
        return;
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data.user));
      setUser(data.user);
      setMessages(data.messages ?? []);
      setUsers(data.users ?? []);
      if (data.mode) setModeState(data.mode);
    } catch {
      setError("Server nije dostupan.");
    } finally {
      setJoining(false);
    }
  }

  function leave() {
    localStorage.removeItem(STORAGE_KEY);
    socketRef.current?.disconnect();
    setUser(null);
    setMessages([]);
    setError("");
  }

  function send(text) {
    socketRef.current?.emit("send_message", { text });
  }

  function clearChat() {
    socketRef.current?.emit("clear_messages");
  }

  function setMode(next) {
    socketRef.current?.emit("set_mode", { mode: next });
  }

  return {
    user,
    partner,
    users,
    messages,
    mode,
    error,
    joining,
    join,
    leave,
    send,
    clearChat,
    setMode,
  };
}
