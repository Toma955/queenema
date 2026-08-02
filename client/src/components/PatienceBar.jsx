import { useRef } from "react";

/** Boja kruške: lijevo crno/crveno → sredina žuto → desno zeleno */
function pearColor(pct) {
  const stops = [
    { at: 0, c: [0, 0, 0] },
    { at: 12, c: [90, 20, 18] },
    { at: 28, c: [196, 60, 46] },
    { at: 50, c: [232, 184, 74] },
    { at: 75, c: [61, 158, 95] },
    { at: 100, c: [26, 122, 69] },
  ];
  let i = 0;
  while (i < stops.length - 1 && pct > stops[i + 1].at) i += 1;
  const a = stops[i];
  const b = stops[Math.min(i + 1, stops.length - 1)];
  const t = a.at === b.at ? 0 : (pct - a.at) / (b.at - a.at);
  const rgb = a.c.map((v, n) => Math.round(v + (b.c[n] - v) * t));
  return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
}

/**
 * onChange = uživo dok vuče (samo UI).
 * onCommit = jednom kad pusti pointer / završi tipkalo.
 */
export default function PatienceBar({
  value = 50,
  onChange,
  onCommit,
  readonly,
  ariaLabel = "Faktor zainteresiranosti",
}) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  const trackRef = useRef(null);
  const dragging = useRef(false);
  const startVal = useRef(pct);
  const latest = useRef(pct);
  const accent = pearColor(pct);

  if (!dragging.current) {
    latest.current = pct;
  }

  function valueFromClientX(clientX) {
    if (readonly || !trackRef.current) return null;
    const rect = trackRef.current.getBoundingClientRect();
    if (rect.width <= 0) return null;
    const raw = ((clientX - rect.left) / rect.width) * 100;
    return Math.round(Math.max(0, Math.min(100, raw)));
  }

  function setFromClientX(clientX) {
    const next = valueFromClientX(clientX);
    if (next == null) return;
    latest.current = next;
    onChange?.(next);
  }

  function endDrag() {
    if (!dragging.current) return;
    dragging.current = false;
    const v = latest.current;
    if (v !== startVal.current) {
      onCommit?.(v);
    }
  }

  function onPointerDown(e) {
    if (readonly) return;
    e.preventDefault();
    e.stopPropagation();
    dragging.current = true;
    startVal.current = latest.current;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setFromClientX(e.clientX);
  }

  function onPointerMove(e) {
    if (!dragging.current || readonly) return;
    e.preventDefault();
    setFromClientX(e.clientX);
  }

  function onPointerUp(e) {
    if (!dragging.current) return;
    try {
      e.currentTarget.releasePointerCapture?.(e.pointerId);
    } catch {
      /* ignore */
    }
    endDrag();
  }

  return (
    <div
      className={`patience patience--pear ${readonly ? "is-readonly" : ""}`}
      style={{ "--pct": String(pct), "--pear-accent": accent }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      role="slider"
      tabIndex={readonly ? -1 : 0}
      aria-label={ariaLabel}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      aria-disabled={readonly || undefined}
      onKeyDown={(e) => {
        if (readonly) return;
        let next = null;
        if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
          e.preventDefault();
          next = Math.max(0, pct - 1);
        } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
          e.preventDefault();
          next = Math.min(100, pct + 1);
        } else if (e.key === "Home") {
          e.preventDefault();
          next = 0;
        } else if (e.key === "End") {
          e.preventDefault();
          next = 100;
        }
        if (next == null) return;
        latest.current = next;
        onChange?.(next);
        onCommit?.(next);
      }}
    >
      <div className="patience__rail" ref={trackRef}>
        <div className="patience__track" aria-hidden />
        <div
          className="patience__pear"
          aria-hidden
          style={{ left: `${pct}%` }}
        >
          <span className="patience__pear-knob" />
          <span className="patience__pear-stem" />
          <span className="patience__pear-bulb" />
        </div>
      </div>
    </div>
  );
}
