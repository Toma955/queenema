import GlassSurface from "../GlassSurface.jsx";

export default function SleepMode({ partner }) {
  const now = new Date();
  const time = now.toLocaleTimeString("hr-HR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const date = now.toLocaleDateString("hr-HR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <section className="mode mode--sleep">
      <div className="sleep__glow" />
      <p className="sleep__date">{date}</p>
      <h1 className="sleep__time">{time}</h1>
      <p className="sleep__hint">
        sleep mode
        {partner?.online ? " · Toma je budan" : " · tiho"}
      </p>
      <div className="sleep__dock">
        <GlassSurface
          width={140}
          height={36}
          borderRadius={20}
          backgroundOpacity={0.12}
          saturation={1.3}
        >
          <span className="sleep__island-label">queenema</span>
        </GlassSurface>
      </div>
    </section>
  );
}
