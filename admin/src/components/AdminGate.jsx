export default function AdminGate({ onEnter, joining, error }) {
  return (
    <section className="a-gate">
      <div className="a-gate__panel">
        <p className="a-gate__eyebrow">desktop · admin</p>
        <h1 className="a-gate__brand">queenema</h1>
        <p className="a-gate__lead">
          Toma — admin konzola. Chat s Emom, poruke na ovom serveru.
        </p>
        <button
          type="button"
          className="a-btn a-btn--primary"
          onClick={onEnter}
          disabled={joining}
        >
          {joining ? "Ulazim…" : "Otvori admin chat"}
        </button>
        {error ? <p className="a-error">{error}</p> : null}
      </div>
    </section>
  );
}
