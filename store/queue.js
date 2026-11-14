// Hero request queue fed by donation events. Stored under its own key, apart
// from the hero list, so isValidHeroList never sees it.
//
//   item = { eventId, kind, hero, rawText, donor, amount, ts, test, status }
//          hero is a roster name, or null when the message didn't match.
//          status is 'pending' or 'accepted'; items stored before it existed
//          read as 'accepted'.
//          kind is 'hero' (select the hero) or 'uncomplete' (clear the hero's
//          completed flag); items stored before it existed read as 'hero'.
//          An 'uncomplete' item never reaches the queue: accepting it clears
//          the flag right away and drops it.
//
// Relay events arrive as pending: they show only on the dashboard, where the
// streamer fixes the hero if needed and accepts (or declines, i.e. removes)
// them. Accepted items form the queue the overlay shows and that can be played.
//
// Every OBS page connects to the relay and enqueues what it receives, so
// enqueue is idempotent by eventId. Played and removed ids are remembered
// (`handled`) so a replay after a reload doesn't bring them back.
// Listeners run after any change in this tab and after any change made by
// another tab (via the `storage` event).
//
// Handled listeners (onHandled) run once per item, in the tab that acted,
// when it leaves pending: accepted, applied (un-complete) or declined.
// Playing or removing an accepted item doesn't run them again.

// MVP-SHORTCUT(MVP-12): queue in each page's localStorage, deduped by event id

import { read, write, subscribe as subscribeToStorage } from './storage.js';
import { heroes } from './queries.js';
import { selectHero, clearCompleted } from './mutations.js';
import { matchHero } from './match-hero.js';
import { watchSpin } from '../components/hero-wheel/spin-state.js';

export const QUEUE_KEY = 'owr:v1:queue';

const HANDLED_LIMIT = 500;

const STATUSES = ['pending', 'accepted'];
const KINDS = ['hero', 'uncomplete'];

const listeners = new Set();
const handledListeners = new Set();
let storageSyncStarted = false;
let spinWatchStarted = false;
let spinning = false;

const isValidItem = (item) =>
  typeof item?.eventId === 'string' &&
  (item.hero === null || typeof item.hero === 'string') &&
  typeof item.rawText === 'string' &&
  typeof item.donor === 'string' &&
  (item.amount === null || Number.isFinite(item.amount)) &&
  typeof item.ts === 'string' &&
  typeof item.test === 'boolean' &&
  (item.status === undefined || STATUSES.includes(item.status)) &&
  (item.kind === undefined || KINDS.includes(item.kind));

const isValidState = (state) =>
  Array.isArray(state?.items) &&
  state.items.every(isValidItem) &&
  Array.isArray(state.handled) &&
  state.handled.every((id) => typeof id === 'string');

function readState() {
  const state = read(QUEUE_KEY);
  if (!isValidState(state)) return { items: [], handled: [] };
  return { ...state, items: state.items.map((i) => (i.status ? i : { ...i, status: 'accepted' })) };
}

function writeState(state) {
  write({ items: state.items, handled: state.handled.slice(-HANDLED_LIMIT) }, QUEUE_KEY);
  notify();
}

function notify() {
  listeners.forEach((listener) => listener());
}

// Tracks the hero wheel spin (see spin-state.js) so playNext doesn't start a
// new spin over a running one. Started on first use, after the store is seeded.
function startSpinWatch() {
  if (spinWatchStarted) return;
  spinWatchStarted = true;
  watchSpin((isSpinning) => {
    const changed = spinning !== isSpinning;
    spinning = isSpinning;
    if (changed) notify();
  });
}

// Calls listener() after any queue change (this tab or another) and when the
// wheel starts or stops spinning. Returns unsubscribe.
export function subscribe(listener) {
  if (!storageSyncStarted) {
    storageSyncStarted = true;
    subscribeToStorage(notify, QUEUE_KEY);
  }
  startSpinWatch();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// Calls listener(item) when an item leaves pending in this tab (accept,
// un-complete or decline). Returns unsubscribe.
export function onHandled(listener) {
  handledListeners.add(listener);
  return () => handledListeners.delete(listener);
}

function notifyHandled(item) {
  handledListeners.forEach((listener) => {
    try {
      listener(item);
    } catch (error) {
      console.warn('[queue:onHandled] listener failed', error);
    }
  });
}

// Accepted items, in order: what the overlay shows and what can be played.
export const queue = () => readState().items.filter((i) => i.status === 'accepted');

// Requests waiting for the streamer to accept or decline them.
export const pending = () => readState().items.filter((i) => i.status === 'pending');

export const isSpinning = () => spinning;

// An accepted item can be played once it has a hero that isn't blocked.
export const kindOf = (item) => item.kind ?? 'hero';

export function canPlay(item) {
  if (item.status !== 'accepted' || !item.hero || spinning) return false;
  const hero = heroes().find((h) => h.name === item.hero);
  return !!hero && !hero.isBlocked;
}

// Builds a pending queue item from an incentive.redeemed relay event, matching
// the donor's message against the current roster.
export function itemFromEvent(event, kind = 'hero') {
  const rawText = event.data.message ?? '';
  return {
    eventId: event.id,
    kind,
    hero: matchHero(rawText, heroes().map((h) => h.name)),
    rawText,
    donor: event.data.displayName,
    amount: event.data.amount,
    ts: event.ts,
    test: event.test,
    status: 'pending',
  };
}

// Adds `item` unless its eventId is already queued or was played/removed.
// Returns true when it was added.
export function enqueue(item) {
  if (!isValidItem(item)) throw new Error('Invalid queue item');
  const state = readState();
  if (state.handled.includes(item.eventId)) return false;
  if (state.items.some((i) => i.eventId === item.eventId)) return false;
  writeState({ ...state, items: [...state.items, item] });
  console.log('[queue:enqueue]', item.eventId, item.hero ?? `unmatched "${item.rawText}"`);
  return true;
}

// A pending item can be accepted once it has a hero.
export const canAccept = (item) => item.status === 'pending' && !!item.hero;

// Moves a pending item into the queue. An un-complete request is applied
// instead: the hero's completed flag is cleared (a no-op if it isn't set) and
// the item is dropped.
// Ignored when it can't be accepted.
export function accept(eventId) {
  const state = readState();
  const item = state.items.find((i) => i.eventId === eventId);
  if (!item || !canAccept(item)) {
    console.log('[queue:accept]', eventId, 'ignored (missing, already accepted or unmatched)');
    return;
  }
  if (kindOf(item) === 'uncomplete') {
    clearCompleted(item.hero);
    remove(eventId);
    console.log('[queue:accept]', eventId, 'un-completed', item.hero);
    return;
  }
  writeState({ ...state, items: state.items.map((i) => (i.eventId === eventId ? { ...i, status: 'accepted' } : i)) });
  notifyHandled({ ...item, status: 'accepted' });
  console.log('[queue:accept]', eventId, item.hero);
}

// Drops an item, pending (decline) or accepted, and remembers its id.
// Handled listeners run only for a pending item; an accepted one already
// ran them when it was accepted.
export function remove(eventId) {
  const state = readState();
  const item = state.items.find((i) => i.eventId === eventId);
  if (!item) return;
  writeState({
    items: state.items.filter((i) => i.eventId !== eventId),
    handled: [...state.handled, eventId],
  });
  if (item.status === 'pending') notifyHandled(item);
  console.log('[queue:remove]', eventId);
}

// Manual pick for an unmatched (or mismatched) item, pending or accepted;
// null clears it.
export function setHero(eventId, hero) {
  if (hero !== null && !heroes().some((h) => h.name === hero)) throw new Error(`Unknown hero "${hero}"`);
  const state = readState();
  if (!state.items.some((i) => i.eventId === eventId)) return;
  writeState({ ...state, items: state.items.map((i) => (i.eventId === eventId ? { ...i, hero } : i)) });
  console.log('[queue:setHero]', eventId, hero ?? 'none');
}

// Selects the item's hero (which spins the wheel) and drops it from the queue.
// Ignored for pending items, while the wheel is spinning or when the hero
// can't be selected.
// Returns the selected hero name, or null.
export function play(eventId) {
  startSpinWatch();
  const item = readState().items.find((i) => i.eventId === eventId);
  if (!item || !canPlay(item)) {
    console.log('[queue:play]', eventId, 'ignored (pending, spinning, unmatched or blocked)');
    return null;
  }
  selectHero(item.hero);
  remove(eventId);
  return item.hero;
}

// Plays the first item that can be played. Returns the hero name, or null.
export function playNext() {
  startSpinWatch();
  const item = queue().find(canPlay);
  return item ? play(item.eventId) : null;
}
