/** Javni domen — obični korisnici (zahtjev → račun). Cookies samo ovdje. */
const PUBLIC_HOSTS = new Set([
  "queenema.art",
  "www.queenema.art",
  "guest.queenema.art",
]);

export function isPublicHost(
  hostname = typeof window !== "undefined" ? window.location.hostname : ""
) {
  return PUBLIC_HOSTS.has(String(hostname || "").toLowerCase());
}

/** Admin konzola — queenema-admin Vercel / localhost:5174 / ?as=admin */
export function isAdminHost() {
  if (typeof window === "undefined") return false;
  const h = window.location.hostname.toLowerCase();
  const port = window.location.port;
  const as = new URLSearchParams(window.location.search).get("as");
  if (as === "admin") return true;
  if (h.includes("queenema-admin")) return true;
  if ((h === "localhost" || h === "127.0.0.1") && port === "5174") return true;
  return false;
}

/** Ema app — Vercel ema / localhost (ne .art, ne admin). */
export function isEmaHost() {
  if (typeof window === "undefined") return false;
  if (isPublicHost() || isGuestModePath() || isAdminHost()) return false;
  const h = window.location.hostname.toLowerCase();
  return (
    h === "localhost" ||
    h === "127.0.0.1" ||
    h.endsWith(".vercel.app") ||
    h.includes("queenema-ema")
  );
}

function isGuestModePath() {
  if (typeof window === "undefined") return false;
  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  return path === "/guest" || path.startsWith("/guest/");
}

/** Javni ulaz: .art domen ili /guest (dev). Nikad na admin hostu. */
export function isGuestMode() {
  if (typeof window === "undefined") return false;
  if (isAdminHost()) return false;
  if (isPublicHost()) return true;
  return isGuestModePath();
}

export function publicShareUrl() {
  if (typeof window !== "undefined") {
    const { protocol, hostname } = window.location;
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return `${protocol}//${hostname}:${window.location.port || "5173"}/guest`;
    }
  }
  return "https://queenema.art";
}
