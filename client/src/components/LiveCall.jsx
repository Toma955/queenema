import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, PhoneOff, Video, VideoOff } from "lucide-react";

const ICE = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

/**
 * Live audio/video poziv (WebRTC) nakon Prihvati.
 */
export default function LiveCall({
  kind = "call",
  role = "callee",
  conversationId,
  socketRef,
  peerLabel = "Poziv",
  onHangup,
}) {
  const video = kind === "video";
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const pcRef = useRef(null);
  const streamRef = useRef(null);
  const makingOffer = useRef(false);
  const [status, setStatus] = useState("Spajanje…");
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const socket = socketRef?.current;
    if (!socket || !conversationId) return undefined;

    let dead = false;
    const pc = new RTCPeerConnection(ICE);
    pcRef.current = pc;

    function signal(payload) {
      socket.emit("webrtc_signal", {
        conversationId,
        ...payload,
      });
    }

    pc.onicecandidate = (ev) => {
      if (ev.candidate) {
        signal({ type: "ice", candidate: ev.candidate.toJSON() });
      }
    };
    pc.onconnectionstatechange = () => {
      const s = pc.connectionState;
      if (s === "connected") setStatus("U pozivu");
      else if (s === "connecting") setStatus("Spajanje…");
      else if (s === "failed") setStatus("Veza nije uspjela");
      else if (s === "disconnected" || s === "closed") setStatus("Prekinuto");
    };
    pc.ontrack = (ev) => {
      const [stream] = ev.streams;
      if (!stream) return;
      if (video && remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
      }
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = stream;
        remoteAudioRef.current.play?.().catch(() => {});
      }
    };

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: video ? { facingMode: "user" } : false,
        });
        if (dead) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        for (const track of stream.getTracks()) {
          pc.addTrack(track, stream);
        }

        if (role === "caller") {
          setStatus("Pozivanje…");
          makingOffer.current = true;
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          signal({ type: "offer", sdp: pc.localDescription });
          makingOffer.current = false;
        } else {
          setStatus("Prihvaćanje…");
          signal({ type: "ready" });
        }
      } catch (err) {
        setError(
          err?.name === "NotAllowedError"
            ? "Dopusti mikrofon/kameru za poziv."
            : "Nije moguće pokrenuti poziv."
        );
        setStatus("Greška");
      }
    }

    async function onSignal(payload = {}) {
      if (
        payload.conversationId != null &&
        Number(payload.conversationId) !== Number(conversationId)
      ) {
        return;
      }
      if (dead || !pcRef.current) return;
      try {
        if (payload.type === "ready" && role === "caller") {
          if (pc.signalingState === "stable" && !makingOffer.current) {
            makingOffer.current = true;
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            signal({ type: "offer", sdp: pc.localDescription });
            makingOffer.current = false;
          }
        } else if (payload.type === "offer" && role === "callee") {
          if (pc.signalingState !== "stable") return;
          await pc.setRemoteDescription(payload.sdp);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          signal({ type: "answer", sdp: pc.localDescription });
          setStatus("U pozivu");
        } else if (payload.type === "answer" && role === "caller") {
          if (!pc.currentRemoteDescription) {
            await pc.setRemoteDescription(payload.sdp);
          }
          setStatus("U pozivu");
        } else if (payload.type === "ice" && payload.candidate) {
          try {
            await pc.addIceCandidate(payload.candidate);
          } catch {
            /* ignore */
          }
        } else if (payload.type === "hangup") {
          setStatus("Prekinuto");
          cleanup(false);
          onHangup?.();
        }
      } catch {
        setError("Signal greška — pokušaj ponovo.");
      }
    }

    function cleanup(emitHangup) {
      if (emitHangup) {
        try {
          signal({ type: "hangup" });
        } catch {
          /* ignore */
        }
      }
      try {
        pc.close();
      } catch {
        /* ignore */
      }
      streamRef.current?.getTracks?.().forEach((t) => t.stop());
      streamRef.current = null;
      if (localVideoRef.current) localVideoRef.current.srcObject = null;
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
      if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
    }

    socket.on("webrtc_signal", onSignal);
    start();

    return () => {
      dead = true;
      socket.off("webrtc_signal", onSignal);
      cleanup(true);
      pcRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, kind, role]);

  function hangup() {
    try {
      socketRef?.current?.emit("webrtc_signal", {
        conversationId,
        type: "hangup",
      });
    } catch {
      /* ignore */
    }
    streamRef.current?.getTracks?.().forEach((t) => t.stop());
    try {
      pcRef.current?.close();
    } catch {
      /* ignore */
    }
    onHangup?.();
  }

  function toggleMute() {
    const track = streamRef.current?.getAudioTracks?.()?.[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMuted(!track.enabled);
  }

  function toggleCam() {
    const track = streamRef.current?.getVideoTracks?.()?.[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setCamOff(!track.enabled);
  }

  return (
    <div className={`live-call ${video ? "is-video" : "is-audio"}`} role="dialog">
      <audio ref={remoteAudioRef} autoPlay playsInline />
      <div className="live-call__stage">
        {video ? (
          <>
            <video
              ref={remoteVideoRef}
              className="live-call__remote"
              autoPlay
              playsInline
            />
            <video
              ref={localVideoRef}
              className="live-call__local"
              autoPlay
              playsInline
              muted
            />
          </>
        ) : (
          <div className="live-call__avatar" aria-hidden>
            <span>{(peerLabel || "?").slice(0, 1).toUpperCase()}</span>
          </div>
        )}
      </div>

      <div className="live-call__meta">
        <p className="live-call__title">
          {video ? "Videopoziv" : "Glasovni poziv"} · {peerLabel}
        </p>
        <p className="live-call__status">{error || status}</p>
      </div>

      <div className="live-call__actions">
        <button type="button" className="live-call__btn" onClick={toggleMute}>
          {muted ? <MicOff size={18} /> : <Mic size={18} />}
          {muted ? "Mic off" : "Mic"}
        </button>
        {video ? (
          <button type="button" className="live-call__btn" onClick={toggleCam}>
            {camOff ? <VideoOff size={18} /> : <Video size={18} />}
            {camOff ? "Cam off" : "Cam"}
          </button>
        ) : null}
        <button
          type="button"
          className="live-call__btn live-call__btn--hang"
          onClick={hangup}
        >
          <PhoneOff size={18} />
          Prekini
        </button>
      </div>
    </div>
  );
}
