/**
 * Legacy folder — production for queenema-admin is the same staff client
 * deployed from ../client (Vercel project queenema-admin).
 *
 * Korisnici: https://queenema.art
 * Ema / Admin prijava: Vercel URL (*.vercel.app)
 */
export default function App() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        background: "#0b0c10",
        color: "#f3eee3",
        fontFamily: "Georgia, serif",
        padding: "1.5rem",
        textAlign: "center",
        gap: "0.75rem",
      }}
    >
      <h1 style={{ margin: 0, fontWeight: 500 }}>QueenEma</h1>
      <p style={{ margin: 0, opacity: 0.75, maxWidth: 28 * 16 }}>
        Korisnici se prijavljuju na{" "}
        <a href="https://queenema.art" style={{ color: "#d6b36a" }}>
          queenema.art
        </a>
        . Ema i admin koriste Vercel link.
      </p>
    </main>
  );
}
