/**
 * Lokalni cache razgovora — refresh ne gubi poruke / otvoreni chat.
 */

export function loadChatCache(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || typeof data !== "object") return null;
    return data;
  } catch {
    return null;
  }
}

export function saveChatCache(key, data) {
  try {
    if (!data) {
      localStorage.removeItem(key);
      return;
    }
    localStorage.setItem(
      key,
      JSON.stringify({ ...data, savedAt: Date.now() })
    );
  } catch {
    /* quota / private mode */
  }
}

export function clearChatCache(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}
