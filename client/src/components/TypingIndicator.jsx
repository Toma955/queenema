import { useEffect, useRef, useState } from "react";

/**
 * Emitira tipkanje dok korisnik piše; prima peer_typing.
 */
export function useTyping({
  socketRef,
  conversationId,
  draft,
  enabled = true,
}) {
  const [peerTyping, setPeerTyping] = useState(false);
  const stopTimer = useRef(null);
  const peerTimer = useRef(null);
  const lastSent = useRef(false);

  function emitTyping(typing) {
    const socket = socketRef?.current;
    if (!socket || !conversationId || !enabled) return;
    if (lastSent.current === typing) return;
    lastSent.current = typing;
    socket.emit("typing", { conversationId, typing: Boolean(typing) });
  }

  useEffect(() => {
    if (!enabled || !conversationId) {
      emitTyping(false);
      return undefined;
    }
    const text = String(draft || "");
    if (text.trim()) {
      emitTyping(true);
      if (stopTimer.current) clearTimeout(stopTimer.current);
      stopTimer.current = setTimeout(() => emitTyping(false), 1400);
    } else {
      emitTyping(false);
    }
    return () => {
      if (stopTimer.current) clearTimeout(stopTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, conversationId, enabled]);

  useEffect(() => {
    if (!enabled) {
      setPeerTyping(false);
      return undefined;
    }

    let attached = null;
    function onPeer({ from, typing, conversationId: cid } = {}) {
      if (cid && conversationId && Number(cid) !== Number(conversationId)) return;
      if (peerTimer.current) clearTimeout(peerTimer.current);
      if (typing) {
        setPeerTyping(true);
        peerTimer.current = setTimeout(() => setPeerTyping(false), 2200);
      } else {
        setPeerTyping(false);
      }
    }

    function attach() {
      const socket = socketRef?.current;
      if (!socket || attached === socket) return;
      if (attached) attached.off("peer_typing", onPeer);
      attached = socket;
      socket.on("peer_typing", onPeer);
    }

    attach();
    const poll = setInterval(attach, 400);

    return () => {
      clearInterval(poll);
      if (peerTimer.current) clearTimeout(peerTimer.current);
      if (attached) attached.off("peer_typing", onPeer);
      emitTyping(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socketRef, conversationId, enabled]);

  return peerTyping;
}

export function TypingDots({ label = "tipka" }) {
  return (
    <p className="typing-ind" aria-live="polite">
      <span className="typing-ind__dots" aria-hidden>
        <i />
        <i />
        <i />
      </span>
      {label}…
    </p>
  );
}
