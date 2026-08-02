import { Phone, Video } from "lucide-react";

const STATUS_LABEL = {
  pending: "Čeka odgovor…",
  accepted: "Prihvaćeno",
  declined: "Odbijeno",
};

/**
 * Invite widget za poziv / videopoziv + Prihvati / Odbij.
 */
export default function CallInvite({
  kind = "call",
  fromLabel = "",
  status = "pending",
  canRespond = false,
  onRespond,
}) {
  const video = kind === "video";
  const Icon = video ? Video : Phone;
  const title = video ? "Videopoziv" : "Glasovni poziv";
  const st = status || "pending";
  const waiting = st === "pending";
  const sub = waiting
    ? fromLabel
      ? `Poziv · ${fromLabel}`
      : "Poziv u chatu"
    : STATUS_LABEL[st] || STATUS_LABEL.pending;

  return (
    <div
      className={`call-invite ${video ? "is-video" : "is-audio"} status-${st}${canRespond && waiting ? " call-invite--respond" : ""}`}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="call-invite__top">
        <div className="call-invite__icon" aria-hidden>
          {waiting ? (
            <>
              <span className="call-invite__ring" />
              <span className="call-invite__ring call-invite__ring--delay" />
            </>
          ) : null}
          <span className="call-invite__glyph">
            <Icon size={18} strokeWidth={2.2} />
          </span>
        </div>
        <div className="call-invite__meta">
          <p className="call-invite__title">{title}</p>
          <p className="call-invite__sub">{sub}</p>
        </div>
        {!canRespond || !waiting ? (
          <span className={`call-invite__badge status-${st}`}>
            {st === "accepted"
              ? "OK"
              : st === "declined"
                ? "Ne"
                : video
                  ? "Video"
                  : "Audio"}
          </span>
        ) : null}
      </div>

      {canRespond && waiting ? (
        <div className="call-invite__actions">
          <button
            type="button"
            className="call-invite__btn call-invite__btn--no"
            onClick={(e) => {
              e.stopPropagation();
              onRespond?.("decline");
            }}
          >
            Odbij
          </button>
          <button
            type="button"
            className="call-invite__btn call-invite__btn--yes"
            onClick={(e) => {
              e.stopPropagation();
              onRespond?.("accept");
            }}
          >
            Prihvati
          </button>
        </div>
      ) : null}
    </div>
  );
}
