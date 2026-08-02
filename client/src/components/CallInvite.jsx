import { Phone, Video } from "lucide-react";

/**
 * Chat widget za poziv / videopoziv — ne generički tekst.
 */
export default function CallInvite({ kind = "call", fromLabel = "" }) {
  const video = kind === "video";
  const Icon = video ? Video : Phone;
  const title = video ? "Videopoziv" : "Glasovni poziv";
  const sub = fromLabel ? `Poziv · ${fromLabel}` : "Poziv u chatu";

  return (
    <div className={`call-invite ${video ? "is-video" : "is-audio"}`}>
      <div className="call-invite__icon" aria-hidden>
        <span className="call-invite__ring" />
        <span className="call-invite__ring call-invite__ring--delay" />
        <span className="call-invite__glyph">
          <Icon size={18} strokeWidth={2.2} />
        </span>
      </div>
      <div className="call-invite__meta">
        <p className="call-invite__title">{title}</p>
        <p className="call-invite__sub">{sub}</p>
      </div>
      <span className="call-invite__badge">{video ? "Video" : "Audio"}</span>
    </div>
  );
}
