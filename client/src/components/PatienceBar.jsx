export default function PatienceBar({ value = 50, onChange, readonly, features }) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0));

  return (
    <div className="patience">
      <div className="patience__labels">
        <span>crno · briši</span>
        <span>limit</span>
        <span>sredina</span>
        <span>glas</span>
        <span>poziv</span>
        <span>kava</span>
      </div>
      <div className="patience__track">
        <div className="patience__gradient" />
        <div className="patience__thumb" style={{ left: `${pct}%` }} />
      </div>
      <input
        className="patience__range"
        type="range"
        min={0}
        max={100}
        value={pct}
        onChange={(e) => !readonly && onChange?.(Number(e.target.value))}
        disabled={readonly}
        aria-label="Strpljenje"
      />
      <p className="patience__hint">
        {pct <= 0
          ? "Crno — razgovor se briše"
          : features?.limited
            ? `Limit: ${features.maxMessages} poruka · ${features.maxChars} znakova`
            : pct >= 100
              ? "Kava otključana"
              : pct >= 75
                ? "Poziv / video otključani"
                : pct >= 60
                  ? "Glasovne otključane"
                  : "Bez limity — samo tekst"}
      </p>
    </div>
  );
}
