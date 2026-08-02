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
 * Rail = od centra lijeve do centra desne ikone (7 chipova, space-between).
 * left pad = half chip → 0% pod Prekid, 50% pod ∞, 100% pod Kava.
 */
export default function PatienceBar({
  value = 50,
  onChange,
  readonly,
  ariaLabel = "Faktor zainteresiranosti",
}) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  const trackRef = useRef(null);
  const dragging = useRef(false);
  const accent = pearColor(pct);

  function setFromClientX(clientX) {
    if (readonly || !trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    if (rect.width <= 0) return;
    const raw = ((clientX - rect.left) / rect.width) * 100;
    onChange?.(Math.round(Math.max(0, Math.min(100, raw))));
  }

  function onPointerDown(e) {
    if (readonly) return;
    e.preventDefault();
    dragging.current = true;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setFromClientX(e.clientX);
  }

  function onPointerMove(e) {
    if (!dragging.current || readonly) return;
    setFromClientX(e.clientX);
  }

  function onPointerUp(e) {
    dragging.current = false;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
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
        if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
          e.preventDefault();
          onChange?.(Math.max(0, pct - 1));
        } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
          e.preventDefault();
          onChange?.(Math.min(100, pct + 1));
        } else if (e.key === "Home") {
          e.preventDefault();
          onChange?.(0);
        } else if (e.key === "End") {
          e.preventDefault();
          onChange?.(100);
        }
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
