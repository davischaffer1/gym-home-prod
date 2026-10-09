const KEY = 'activeSessionId';

export function saveActiveSession(id: number) {
  try {
    localStorage.setItem(KEY, String(id));
  } catch {}
}

export function getActiveSession(): number | null {
  try {
    const v = localStorage.getItem(KEY);
    return v ? parseInt(v) : null;
  } catch {
    return null;
  }
}

export function clearActiveSession() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
}