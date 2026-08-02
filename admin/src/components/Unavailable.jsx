export default function Unavailable({
  code = "404",
  title = "Stranica nedostupna",
  message = "Server trenutno nije dostupan. Pokušaj ponovo uskoro.",
  onRetry,
}) {
  return (
    <section className="unavailable">
      <p className="unavailable__code">{code}</p>
      <h1 className="unavailable__title">{title}</h1>
      <p className="unavailable__msg">{message}</p>
      {onRetry ? (
        <button type="button" className="unavailable__btn" onClick={onRetry}>
          Pokušaj ponovo
        </button>
      ) : null}
    </section>
  );
}
