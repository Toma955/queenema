import { useEffect, useState } from "react";

/**
 * Preloader s kontroliranim progresom (App šalje %).
 * Ako nema `progress`, radi kratki lokalni progress dok čeka onDone.
 */
export default function Preloader({ progress: progressProp, label, onDone }) {
  const controlled = typeof progressProp === "number";
  const [local, setLocal] = useState(0);
  const progress = controlled ? Math.max(0, Math.min(100, progressProp)) : local;

  useEffect(() => {
    if (controlled) return undefined;
    let frame;
    let start;
    const duration = 1600;
    function tick(now) {
      if (!start) start = now;
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setLocal(Math.round(eased * 100));
      if (t < 1) frame = requestAnimationFrame(tick);
      else setTimeout(() => onDone?.(), 200);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [controlled, onDone]);

  return (
    <section className="preloader" aria-busy="true" aria-live="polite">
      <p className="preloader__brand">queenema</p>
      <div className="preloader__bar" aria-hidden>
        <div className="preloader__fill" style={{ width: `${progress}%` }} />
      </div>
      <p className="preloader__pct">{progress}%</p>
      {label ? <p className="preloader__label">{label}</p> : null}
    </section>
  );
}
