/** API base for production (Render). Empty in local Vite = same-origin proxy. */
export const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

export function apiUrl(path) {
  return `${API_URL}${path}`;
}

export function socketUrl() {
  return API_URL || undefined;
}
