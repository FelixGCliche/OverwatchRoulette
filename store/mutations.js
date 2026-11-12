// Mutations: each reads the heroes once, builds the next list, and writes it
// once, then notifies listeners (via createMutation). If the write throws,
// listeners are not notified. Heroes are addressed by name, not index.
// Each mutation logs its own result as [mutations:<name>] ...

import { write, SPIN_KEY } from './storage.js';
import { heroes, isAvailable } from './queries.js';
import { createMutation, notify } from './core.js';
import { loadSeed, isValidHeroList } from './seed.js';

function findHero(list, name) {
  const hero = list.find((h) => h.name === name);
  if (!hero) throw new Error(`Unknown hero "${name}"`);
  return hero;
}

const updateHero = (list, name, change) =>
  list.map((h) => (h.name === name ? { ...h, ...change(h) } : h));

// Makes `name` the only current hero; null clears the current hero.
const setCurrent = (list, name) => list.map((h) => ({ ...h, currentLostStreak: 0, isCurrent: h.name === name }));

function withRandomCurrent(list) {
  const pool = list.filter(isAvailable);
  const pick = pool[Math.floor(Math.random() * pool.length)];
  return setCurrent(list, pick?.name ?? null);
}

const currentName = (list) => list.find((h) => h.isCurrent)?.name ?? null;

// Asks the wheel to spin. Call before writing the heroes: other tabs are
// notified by the heroes write and read this marker then.
const triggerSpin = () => write({ id: Date.now() + Math.random() }, SPIN_KEY);

// Blocking or completing the current hero moves on to a random one.
// Returns the toggled hero and, if the current hero changed, who is current now.
function toggleFlag(name, flag) {
  const list = heroes();
  let next = updateHero(list, name, (h) => ({ [flag]: !h[flag] }));
  const hero = findHero(next, name);
  write(next);
  return hero;
}

// Blocked heroes can't be selected; that's a silent no-op.
export const selectHero = createMutation((name) => {
  const list = heroes();
  const hero = findHero(list, name);
  if (hero.isBlocked) {
    console.log('[mutations:selectHero]', name, 'ignored (blocked)');
    return;
  }
  write(setCurrent(list, name));
  console.log('[mutations:selectHero]', name, JSON.stringify({ isCurrent: true }));
});

export const selectRandomHero = createMutation(() => {
  const next = withRandomCurrent(heroes());
  triggerSpin();
  write(next);
  console.log('[mutations:selectRandomHero] current ->', currentName(next) ?? 'none');
});

export const toggleBlocked = createMutation((name) => {
  const hero = toggleFlag(name, 'isBlocked');
  console.log('[mutations:toggleBlocked]', name, JSON.stringify({ isBlocked: hero.isBlocked }));
});

export const toggleCompleted = createMutation((name) => {
  const hero = toggleFlag(name, 'isCompleted');
  console.log('[mutations:toggleCompleted]', name, JSON.stringify({ isCompleted: hero.isCompleted }));
});

// Completes the current hero and counts the win. The current hero is left
// as is; selecting the next one is a separate action.
export const recordWin = createMutation(() => {
  const list = heroes();
  const current = list.find((h) => h.isCurrent);
  if (!current) return;
  const next = updateHero(list, current.name, (h) => ({ isCompleted: true, win: h.win + 1 }));
  write(next);
  const { isCompleted, win } = findHero(next, current.name);
  console.log('[mutations:recordWin]', current.name, JSON.stringify({ isCompleted, win }));
});

export const recordLoss = createMutation(() => {
  const list = heroes();
  const current = list.find((h) => h.isCurrent);
  if (!current) return;
  const next = updateHero(list, current.name, (h) => ({ lost: h.lost + 1 , currentLostStreak: h.currentLostStreak + 1 }));
  write(next);
  console.log('[mutations:recordLoss]', current.name, JSON.stringify({ lost: findHero(next, current.name).lost, currentLostStreak: findHero(next, current.name).currentLostStreak }));
});

// Replaces all hero state. Validates the shape; the caller picks a new current hero.
export const importHeroes = createMutation((list) => {
  if (!isValidHeroList(list)) throw new Error('Invalid hero list');
  write(list);
  console.log('[mutations:importHeroes]', `${list.length} heroes imported, current: ${currentName(list) ?? 'none'}`);
});

// Restores the pristine hero list. Async because it fetches the seed, so it
// notifies itself instead of using createMutation.
export async function resetHeroes() {
  const seed = await loadSeed();
  write(seed);
  console.log('[mutations:resetHeroes]', `${seed.length} heroes restored from seed`);
  notify();
}
