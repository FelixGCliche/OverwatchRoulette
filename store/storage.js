// Thin localStorage adapter. Knows nothing about heroes.

export const STORAGE_KEY = 'owr:v1:heroes';

export function read(key = STORAGE_KEY) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? null : JSON.parse(raw);
  } catch {
    return null; // missing, corrupt or inaccessible
  }
}

export function write(value, key = STORAGE_KEY) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false; // quota exceeded or inaccessible
  }
}

export function remove(key = STORAGE_KEY) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

// Calls onExternalChange(newValue) when another tab/window changes the key.
// The `storage` event never fires in the tab that wrote, so same-tab
// updates are the caller's responsibility. Returns an unsubscribe function.
export function subscribe(onExternalChange, key = STORAGE_KEY) {
  const handler = (event) => {
    // event.key is null when localStorage.clear() is called
    if (event.storageArea !== localStorage) return;
    if (event.key !== null && event.key !== key) return;
    onExternalChange(read(key));
  };
  window.addEventListener('storage', handler);
  return () => window.removeEventListener('storage', handler);
}
