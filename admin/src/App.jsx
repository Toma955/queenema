import { useEffect, useState } from "react";
import { useAdmin } from "./hooks/useAdmin.js";
import AdminDashboard from "./components/AdminDashboard.jsx";
import Unavailable from "./components/Unavailable.jsx";
import { apiUrl } from "./lib/api.js";

function Login({ onLogin, joining, error }) {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");

  return (
    <section className="ad-login">
      <form
        className="ad-login__card"
        onSubmit={(e) => {
          e.preventDefault();
          onLogin(username, password);
        }}
      >
        <p className="ad__eyebrow">admin · vercel</p>
        <h1>QueenEma Admin</h1>
        <p className="ad-muted">
          Odvojeno od Eme. Ovdje su sustavne kontrole.
        </p>
        <label>
          Username
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        <button type="submit" className="ad-btn ad-btn--primary" disabled={joining}>
          {joining ? "Prijava…" : "Prijava"}
        </button>
        {error ? <p className="ad-error">{error}</p> : null}
      </form>
    </section>
  );
}

export default function App() {
  const admin = useAdmin();
  const [apiOk, setApiOk] = useState(null);

  useEffect(() => {
    let alive = true;
    fetch(apiUrl("/api/health"), { cache: "no-store" })
      .then((r) => {
        if (alive) setApiOk(r.ok);
      })
      .catch(() => {
        if (alive) setApiOk(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  if (apiOk === false) {
    return (
      <Unavailable
        code="404"
        title="API nedostupan"
        message="queenema API nije dostupan."
        onRetry={() => {
          setApiOk(null);
          fetch(apiUrl("/api/health"), { cache: "no-store" })
            .then((r) => setApiOk(r.ok))
            .catch(() => setApiOk(false));
        }}
      />
    );
  }

  if (!admin.user) {
    return (
      <Login onLogin={admin.login} joining={admin.joining} error={admin.error} />
    );
  }

  return <AdminDashboard admin={admin} />;
}
