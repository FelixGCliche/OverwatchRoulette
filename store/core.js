// Sync change notification, localStorage is synchronous and
// the dashboard is the only writer, so a listener just re-runs its queries.
//
//   query    = plain function that reads storage (see queries.js)
//   mutation = function that writes storage, then notifies listeners. If it
//              throws (e.g. a rejected write), listeners are not notified.
//
// Listeners run after any mutation in this tab and after any change made by
// another tab (via the `storage` event).

import { subscribe as subscribeToStorage } from './storage.js';

const listeners = new Set();
let storageSyncStarted = false;

// Calls listener() after any mutation in this tab, or any change from another
// tab. The listener re-runs whichever queries it needs. Returns unsubscribe.
export function subscribe(listener) {
  if (!storageSyncStarted) {
    storageSyncStarted = true;
    subscribeToStorage(notify);
  }
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function notify() {
  listeners.forEach((listener) => listener());
}

export function createMutation(fn) {
  return (...args) => {
    const result = fn(...args);
    notify();
    return result;
  };
}
