export default function Login({ onLogin, joining, error }) {
  function handleSubmit(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    onLogin(String(data.get("username") || ""), String(data.get("password") || ""));
  }

  return (
    <section className="login">
      <p className="login__eyebrow">admin · glavni korisnik</p>
      <h1 className="login__brand">queenema</h1>
      <p className="login__lead">Ema — prijava</p>
      <form className="login__form" onSubmit={handleSubmit}>
        <input
          className="login__input"
          name="username"
          placeholder="username"
          autoComplete="username"
          defaultValue="ema"
          required
        />
        <input
          className="login__input"
          name="password"
          type="password"
          placeholder="password"
          autoComplete="current-password"
          defaultValue="ema"
          required
        />
        <button className="login__btn" type="submit" disabled={joining}>
          {joining ? "…" : "Uđi"}
        </button>
        {error ? <p className="err">{error}</p> : null}
      </form>
    </section>
  );
}
