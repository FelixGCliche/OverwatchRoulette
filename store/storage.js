export const STORAGE_KEY = 'owr:v1:heroes';
// Marker written when the wheel should spin; separate from which hero is current.
export const SPIN_KEY = 'owr:v1:spin';

// Resolved once. If localStorage is blocked (private mode, disabled site data),
// fall back to memory so the app still works for the session, unsaved.
function resolveStorage() {
  try {
    return localStorage;
  } catch {
    const memory = new Map();
    return {
      getItem: (key) => memory.get(key) ?? null,
      setItem: (key, value) => memory.set(key, String(value)),
      removeItem: (key) => memory.delete(key),
    };
  }
}

const storage = resolveStorage();

// Returns null when the key is missing or its value is corrupt.
export function read(key = STORAGE_KEY) {
  const raw = storage.getItem(key);
  if (raw === null) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// Throws if the browser rejects the write
export function write(value, key = STORAGE_KEY) {
  storage.setItem(key, JSON.stringify(value));
}

export function remove(key = STORAGE_KEY) {
  storage.removeItem(key);
}

// Calls onExternalChange(newValue) when another tab/window changes the key.
// The `storage` event never fires in the tab that wrote, so same-tab
// updates are the caller's responsibility. Returns an unsubscribe function.
export function subscribe(onExternalChange, key = STORAGE_KEY) {
  const handler = (event) => {
    if (event.storageArea !== storage) return;
    // event.key is null when storage.clear() is called
    if (event.key !== null && event.key !== key) return;
    onExternalChange(read(key));
  };
  window.addEventListener('storage', handler);
  return () => window.removeEventListener('storage', handler);
}
