import { useEffect, useState } from "react";

export default function UpdateMode() {
  const [pct, setPct] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setPct((p) => (p >= 96 ? 12 : p + Math.floor(Math.random() * 7) + 1));
    }, 900);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="mode mode--update">
      <div className="update-orb" />
      <h1 className="update__title">Ažuriranje</h1>
      <p className="update__sub">queenema se priprema…</p>
      <div className="update__track">
        <div className="update__fill" style={{ width: `${pct}%` }} />
      </div>
      <p className="update__pct">{pct}%</p>
    </section>
  );
}
