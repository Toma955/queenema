/** API base for production (Render). Empty in local Vite = same-origin proxy. */
const FALLBACK_PROD = "https://queenema-api-node.onrender.com";

export const API_URL = (
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? FALLBACK_PROD : "") ||
  ""
).replace(/\/$/, "");

export function apiUrl(path) {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${API_URL}${p}`;
}

export function mediaUrl(path) {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return apiUrl(path);
}

/** Pass as first arg to io() when API is on another origin */
export function socketUrl() {
  return API_URL || undefined;
}
