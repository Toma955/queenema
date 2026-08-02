/** Javni domen — obični korisnici (zahtjev → račun). */
const PUBLIC_HOSTS = new Set([
  "queenema.art",
  "www.queenema.art",
  "guest.queenema.art",
]);

export function isPublicHost(hostname = typeof window !== "undefined" ? window.location.hostname : "") {
  return PUBLIC_HOSTS.has(String(hostname || "").toLowerCase());
}

/** Ema / staff app — samo Vercel ili localhost (ne .art). */
export function isStaffHost(hostname = typeof window !== "undefined" ? window.location.hostname : "") {
  const h = String(hostname || "").toLowerCase();
  if (!h || isPublicHost(h)) return false;
  return (
    h === "localhost" ||
    h === "127.0.0.1" ||
    h.endsWith(".vercel.app")
  );
}

/** Javni ulaz: .art domen ili /guest putanja (dev). */
export function isGuestMode() {
  if (typeof window === "undefined") return false;
  if (isPublicHost()) return true;
  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  return path === "/guest" || path.startsWith("/guest/");
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
