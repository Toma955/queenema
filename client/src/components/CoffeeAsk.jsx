import { Coffee } from "lucide-react";

const STATUS_LABEL = {
  pending: "Čeka odgovor…",
  yes: "Rekla/rekao Da ☕",
  no: "Rekla/rekao Ne",
};

/**
 * Pitanje: Idemo na kavu / dejt? — Da / Ne.
 */
export default function CoffeeAsk({
  fromLabel = "",
  status = "pending",
  canRespond = false,
  onRespond,
}) {
  const st = status || "pending";
  const sub =
    st === "pending"
      ? fromLabel
        ? `Pitanje · ${fromLabel}`
        : "Pitanje"
      : STATUS_LABEL[st] || STATUS_LABEL.pending;

  return (
    <div className={`coffee-ask status-${st}`} onClick={(e) => e.stopPropagation()}>
      <div className="coffee-ask__icon" aria-hidden>
        <Coffee size={18} strokeWidth={2.2} />
      </div>
      <div className="coffee-ask__meta">
        <p className="coffee-ask__title">Idemo na kavu / dejt?</p>
        <p className="coffee-ask__sub">{sub}</p>
      </div>
      {canRespond && st === "pending" ? (
        <div className="coffee-ask__actions">
          <button
            type="button"
            className="coffee-ask__btn coffee-ask__btn--no"
            onClick={() => onRespond?.("no")}
          >
            Ne
          </button>
          <button
            type="button"
            className="coffee-ask__btn coffee-ask__btn--yes"
            onClick={() => onRespond?.("yes")}
          >
            Da
          </button>
        </div>
      ) : (
        <span className={`coffee-ask__badge status-${st}`}>
          {st === "yes" ? "Da" : st === "no" ? "Ne" : "?"}
        </span>
      )}
    </div>
  );
}
