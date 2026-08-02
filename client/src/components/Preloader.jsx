import { useEffect, useState } from "react";

export default function Preloader({ onDone }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let frame;
    let start;
    const duration = 2200;

    function tick(now) {
      if (!start) start = now;
      const t = Math.min(1, (now - start) / duration);
      // ease-out cubic, settle at 100
      const eased = 1 - Math.pow(1 - t, 3);
      const value = Math.round(eased * 100);
      setProgress(value);
      if (t < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        setTimeout(onDone, 280);
      }
    }

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [onDone]);

  return (
    <section className="preloader">
      <p className="preloader__brand">queenema</p>
      <div className="preloader__bar" aria-hidden>
        <div className="preloader__fill" style={{ width: `${progress}%` }} />
      </div>
      <p className="preloader__pct">{progress}%</p>
    </section>
  );
}
