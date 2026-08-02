import { useEffect, useState } from "react";

export const DEFAULT_GLASS = {
  borderRadius: 22,
  borderWidth: 0.1,
  brightness: 49,
  opacity: 0.7,
  blur: 4,
  displace: 0,
  backgroundOpacity: 0,
  saturation: 0.2,
  distortionScale: -50,
};

export const BRAND_HEIGHT = 72;
export const CTA_HEIGHT = 54;

const STORAGE_KEY = "queenema_glass_tune_v3";

const SLIDERS = [
  { key: "borderRadius", label: "Radius", min: 0, max: 40, step: 1 },
  { key: "borderWidth", label: "Border", min: 0, max: 0.4, step: 0.01 },
  { key: "brightness", label: "Brightness", min: 0, max: 100, step: 1 },
  { key: "opacity", label: "Opacity", min: 0, max: 1, step: 0.01 },
  { key: "blur", label: "Blur", min: 0, max: 40, step: 1 },
  { key: "displace", label: "Displace", min: 0, max: 20, step: 0.5 },
  { key: "backgroundOpacity", label: "Frost", min: 0, max: 1, step: 0.01 },
  { key: "saturation", label: "Saturation", min: 0, max: 3, step: 0.05 },
  { key: "distortionScale", label: "Distortion", min: -300, max: 0, step: 5 },
];

function loadStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.glass) return parsed.glass;
    // migrate old brand/cta shape
    if (parsed?.brand) {
      const { height: _h, ...rest } = parsed.brand;
      return { ...DEFAULT_GLASS, ...rest };
    }
    return null;
  } catch {
    return null;
  }
}

export function useGlassTune() {
  const [glass, setGlass] = useState(
    () => loadStored() || { ...DEFAULT_GLASS }
  );
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ glass }));
  }, [glass]);

  function setValue(key, value) {
    setGlass((prev) => ({ ...prev, [key]: value }));
  }

  function reset() {
    setGlass({ ...DEFAULT_GLASS });
  }

  async function copy() {
    const text = JSON.stringify({ glass }, null, 2);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
    return text;
  }

  return {
    glass,
    setValue,
    reset,
    copy,
    copied,
    open,
    setOpen,
    sliders: SLIDERS,
  };
}

export default function GlassTunePanel({ tune }) {
  if (!tune?.open) return null;

  return (
    <div className="glass-tune-float" role="dialog" aria-label="Glass postavke">
      <div className="glass-tune-float__card">
        <div className="glass-tune__head">
          <h2>Glass Surface</h2>
          <button
            type="button"
            className="ghost-btn"
            onClick={() => tune.setOpen(false)}
          >
            Zatvori
          </button>
        </div>

        <p className="glass-tune__hint">Iste postavke za QueenEma i donji gumb</p>

        <div className="glass-tune__sliders">
          {tune.sliders.map((s) => (
            <label key={s.key} className="glass-tune__row">
              <span>
                {s.label}
                <em>
                  {Number(tune.glass[s.key]).toFixed(s.step < 1 ? 2 : 0)}
                </em>
              </span>
              <input
                type="range"
                min={s.min}
                max={s.max}
                step={s.step}
                value={tune.glass[s.key]}
                onChange={(e) => tune.setValue(s.key, Number(e.target.value))}
              />
            </label>
          ))}
        </div>

        <div className="glass-tune__actions">
          <button type="button" className="login__btn" onClick={tune.copy}>
            {tune.copied ? "Kopirano" : "Copy"}
          </button>
          <button type="button" className="ghost-btn" onClick={tune.reset}>
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
