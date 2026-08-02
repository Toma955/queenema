export default function Login({ onLogin, joining, error, variant = "ema" }) {
  const isAdmin = variant === "admin";

  function handleSubmit(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    onLogin(String(data.get("username") || ""), String(data.get("password") || ""));
  }

  return (
    <section className="login">
      <div className="login__atmosphere" aria-hidden />
      <div className="login__stack">
        <div className="login__hero">
          <p className="login__eyebrow">{isAdmin ? "Admin" : "Ema"}</p>
          <h1 className="login__brand">
            <span className="qe">Q</span>ueen<span className="qe">E</span>ma
          </h1>
          <p className="login__lead">
            {isAdmin
              ? "Sustavne kontrole + sve što Ema i korisnik koriste. Bez cookies."
              : "Tvoj prostor. Tvoja pravila."}
          </p>
        </div>
        <form className="login__form" onSubmit={handleSubmit}>
          <label className="login__field">
            <span>Username</span>
            <input
              className="login__input"
              name="username"
              placeholder={isAdmin ? "admin" : "ema"}
              autoComplete="username"
              defaultValue={isAdmin ? "admin" : "ema"}
              required
            />
          </label>
          <label className="login__field">
            <span>Password</span>
            <input
              className="login__input"
              name="password"
              type="password"
              placeholder="••••"
              autoComplete="current-password"
              defaultValue={isAdmin ? "admin" : "ema"}
              required
            />
          </label>
          <button className="login__btn" type="submit" disabled={joining}>
            {joining ? "Ulazim…" : "Uđi"}
          </button>
          {error ? <p className="err">{error}</p> : null}
        </form>
      </div>
    </section>
  );
}
