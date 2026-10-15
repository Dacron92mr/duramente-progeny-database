/** Storage may be disabled in private or embedded browsing. Preferences are optional. */
export function readPreference(key, fallback) {
  try { return localStorage.getItem(key) || fallback; } catch { return fallback; }
}
export function savePreference(key, value) {
  try { localStorage.setItem(key, value); } catch { /* Keep the current in-memory preference. */ }
}
