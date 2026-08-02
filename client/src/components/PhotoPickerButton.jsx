import { useRef, useState } from "react";
import { Camera, Image as ImageIcon, X } from "lucide-react";

/**
 * Kompresija + data URL za chat slike.
 */
export function fileToChatImage(file, maxEdge = 1600, quality = 0.82) {
  return new Promise((resolve, reject) => {
    if (!file || !String(file.type || "").startsWith("image/")) {
      reject(new Error("Odaberi sliku."));
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      const scale = Math.min(1, maxEdge / Math.max(w, h, 1));
      const cw = Math.max(1, Math.round(w * scale));
      const ch = Math.max(1, Math.round(h * scale));
      const canvas = document.createElement("canvas");
      canvas.width = cw;
      canvas.height = ch;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas nije dostupan."));
        return;
      }
      ctx.drawImage(img, 0, 0, cw, ch);
      const mime = file.type.includes("png") ? "image/png" : "image/jpeg";
      const dataUrl = canvas.toDataURL(mime, quality);
      resolve({ dataUrl, mime });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Slika se nije učitala."));
    };
    img.src = url;
  });
}

/**
 * Gumb fotoaparata: slikaj ili odaberi datoteku.
 */
export default function PhotoPickerButton({ onPick, disabled = false }) {
  const [open, setOpen] = useState(false);
  const camRef = useRef(null);
  const fileRef = useRef(null);

  async function handleFile(file) {
    setOpen(false);
    if (!file) return;
    try {
      const { dataUrl, mime } = await fileToChatImage(file);
      onPick?.(dataUrl, mime);
    } catch (err) {
      console.warn(err);
    }
  }

  return (
    <div className="photo-pick">
      <button
        type="button"
        className="island__mic photo-pick__btn"
        disabled={disabled}
        aria-label="Pošalji sliku"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Camera size={18} />
      </button>
      {open ? (
        <div className="photo-pick__menu" role="menu">
          <button
            type="button"
            role="menuitem"
            onClick={() => camRef.current?.click()}
          >
            <Camera size={15} />
            Slikaj
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => fileRef.current?.click()}
          >
            <ImageIcon size={15} />
            Datoteka
          </button>
          <button
            type="button"
            role="menuitem"
            className="photo-pick__close"
            onClick={() => setOpen(false)}
          >
            <X size={15} />
            Zatvori
          </button>
        </div>
      ) : null}
      <input
        ref={camRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          handleFile(f);
        }}
      />
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          handleFile(f);
        }}
      />
    </div>
  );
}
