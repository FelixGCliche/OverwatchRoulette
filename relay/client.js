// WebSocket client for the donation relay channel (protocol version 1).
//
//   URL      wss://<origin>/api/channel/<key>
//   frames   { kind: 'hello', key } | { kind: 'replay', events } |
//            { kind: 'event', event } | { kind: 'marks', marks }
//
// Only `incentive.redeemed` events for the two incentives saved on the
// dashboard are passed on, tagged with a kind: the hero request incentive
// (`owr:v1:hero-incentive`, 'hero') and the un-complete incentive
// (`owr:v1:uncomplete-incentive`, 'uncomplete'). With no saved ID for a kind,
// none are, and redemptions received meanwhile are dropped. The IDs are read
// at each event, so a change applies live on every page of this origin.
// Hello and marks frames are ignored. The client reconnects with exponential
// backoff and resumes after the last event it saw (`&since=<id>`).

import { read, write, subscribe as subscribeToStorage } from '../store/storage.js';

export const RELAY_URL_KEY = 'owr:v1:relay';
export const HERO_INCENTIVE_KEY = 'owr:v1:hero-incentive';
export const UNCOMPLETE_INCENTIVE_KEY = 'owr:v1:uncomplete-incentive';

const BACKOFF_BASE_MS = 1000;
const BACKOFF_MAX_MS = 30000;

// The page's ?relay= param wins over the URL saved by the dashboard.
export function relayUrl() {
  const param = new URLSearchParams(location.search).get('relay');
  if (param) return param;
  const saved = read(RELAY_URL_KEY);
  return typeof saved === 'string' && saved ? saved : null;
}

export const hasRelayParam = () => new URLSearchParams(location.search).has('relay');

// An empty value clears the saved URL. Throws if the URL is not a valid
// channel URL, so the dashboard can tell the user.
export function saveRelayUrl(url) {
  const value = url.trim();
  if (value && !parseRelayUrl(value)) throw new Error('Invalid relay URL');
  write(value, RELAY_URL_KEY);
}

// Calls onChange(url) when another tab saves a new relay URL. Returns unsubscribe.
export const watchSavedRelayUrl = (onChange) =>
  subscribeToStorage((value) => onChange(typeof value === 'string' && value ? value : null), RELAY_URL_KEY);

const savedId = (key) => {
  const saved = read(key);
  return typeof saved === 'string' && saved ? saved : null;
};

// An empty value clears the saved ID.
const saveId = (id, key) => write(id.trim(), key);

// Calls onChange(id) when another tab saves a new incentive ID. Returns unsubscribe.
const watchId = (onChange, key) =>
  subscribeToStorage((value) => onChange(typeof value === 'string' && value ? value : null), key);

// The DonorDrive incentive whose redemptions are hero requests, or null.
export const heroIncentiveId = () => savedId(HERO_INCENTIVE_KEY);
export const saveHeroIncentiveId = (id) => saveId(id, HERO_INCENTIVE_KEY);
export const watchHeroIncentiveId = (onChange) => watchId(onChange, HERO_INCENTIVE_KEY);

// The DonorDrive incentive whose redemptions ask to clear a hero's completed
// state, or null.
export const uncompleteIncentiveId = () => savedId(UNCOMPLETE_INCENTIVE_KEY);
export const saveUncompleteIncentiveId = (id) => saveId(id, UNCOMPLETE_INCENTIVE_KEY);
export const watchUncompleteIncentiveId = (onChange) => watchId(onChange, UNCOMPLETE_INCENTIVE_KEY);

// 'hero' | 'uncomplete' for an incentive id matching a saved field, else null.
// If both fields hold the same id, hero wins.
function kindOf(incentiveId) {
  if (!incentiveId) return null;
  if (incentiveId === heroIncentiveId()) return 'hero';
  if (incentiveId === uncompleteIncentiveId()) return 'uncomplete';
  return null;
}

// Returns { url } or null when the URL can't be used. Query params are
// kept but not read.
export function parseRelayUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== 'wss:' && url.protocol !== 'ws:') return null;
  if (!/\/api\/channel\/[^/]+\/?$/.test(url.pathname)) return null;
  return { url };
}

const isString = (value) => typeof value === 'string';

const isRelayEvent = (event) =>
  event !== null &&
  typeof event === 'object' &&
  event.v === 1 &&
  isString(event.id) &&
  (event.type === 'donation.created' || event.type === 'incentive.redeemed') &&
  isString(event.ts) &&
  typeof event.test === 'boolean' &&
  isString(event.participantId) &&
  event.data !== null &&
  typeof event.data === 'object' &&
  isString(event.data.donationId) &&
  isString(event.data.displayName) &&
  (event.data.amount === null || Number.isFinite(event.data.amount)) &&
  (event.data.message === undefined || isString(event.data.message)) &&
  (event.data.incentiveId === undefined || isString(event.data.incentiveId));

// Events from a frame in stream order; [] for frames without events or
// with an unexpected shape.
function eventsOf(frame) {
  if (frame === null || typeof frame !== 'object') return [];
  if (frame.kind === 'event') return [frame.event];
  if (frame.kind === 'replay' && Array.isArray(frame.events)) return frame.events;
  return [];
}

// Connects to `url` and keeps the connection open until close() is called.
// Status is 'connecting' | 'open' | 'reconnecting' | 'closed'; it stays
// 'closed' when the URL is missing or invalid.
export function connectRelay(url) {
  const eventListeners = new Set();
  const statusListeners = new Set();
  const parsed = url ? parseRelayUrl(url) : null;

  let status = 'closed';
  let socket = null;
  let retryTimer = null;
  let attempt = 0;
  let lastEventId = null;
  let closed = false;

  function setStatus(next) {
    if (next === status) return;
    status = next;
    console.log('[relay]', status);
    statusListeners.forEach((listener) => listener(status));
  }

  function handleFrame(raw) {
    let frame;
    try {
      frame = JSON.parse(raw);
    } catch {
      console.warn('[relay] ignored a frame that is not JSON');
      return;
    }
    eventsOf(frame).forEach((event) => {
      if (!isRelayEvent(event)) {
        console.warn('[relay] ignored an event with an unexpected shape');
        return;
      }
      lastEventId = event.id;
      if (event.type !== 'incentive.redeemed') return;
      const kind = kindOf(event.data.incentiveId);
      if (!kind) return;
      eventListeners.forEach((listener) => listener(event, kind));
    });
  }

  function open() {
    const target = new URL(parsed.url);
    if (lastEventId) target.searchParams.set('since', lastEventId);
    setStatus(attempt === 0 ? 'connecting' : 'reconnecting');

    socket = new WebSocket(target);
    socket.addEventListener('open', () => {
      attempt = 0;
      setStatus('open');
    });
    socket.addEventListener('message', (event) => {
      if (typeof event.data === 'string') handleFrame(event.data);
    });
    socket.addEventListener('close', () => {
      socket = null;
      if (!closed) scheduleReconnect();
    });
  }

  // Full jitter: wait a random time up to the capped exponential delay.
  function scheduleReconnect() {
    attempt += 1;
    setStatus('reconnecting');
    const cap = Math.min(BACKOFF_MAX_MS, BACKOFF_BASE_MS * 2 ** (attempt - 1));
    const delay = Math.max(BACKOFF_BASE_MS / 2, Math.random() * cap);
    retryTimer = setTimeout(open, delay);
  }

  if (parsed) open();
  else if (url) console.warn('[relay] invalid relay URL, not connecting');

  return {
    status: () => status,
    // Calls listener(event, kind) for each matching incentive.redeemed event,
    // kind being 'hero' or 'uncomplete'. Returns unsubscribe.
    onEvent(listener) {
      eventListeners.add(listener);
      return () => eventListeners.delete(listener);
    },
    // Calls listener(status) on every status change. Returns unsubscribe.
    onStatus(listener) {
      statusListeners.add(listener);
      return () => statusListeners.delete(listener);
    },
    close() {
      closed = true;
      clearTimeout(retryTimer);
      socket?.close();
      socket = null;
      setStatus('closed');
    },
  };
}
