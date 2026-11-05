// Mutations: each reads the heroes once, builds the next list, and writes it
// once, then notifies listeners (via createMutation). If the write throws,
// listeners are not notified. Heroes are addressed by name, not index.

import { write } from './storage.js';
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
const setCurrent = (list, name) => list.map((h) => ({ ...h, isCurrent: h.name === name }));

function withRandomCurrent(list) {
  const pool = list.filter(isAvailable);
  const pick = pool[Math.floor(Math.random() * pool.length)];
  return setCurrent(list, pick?.name ?? null);
}

// Blocking or completing the current hero moves on to a random one.
function toggleFlag(name, flag) {
  const list = heroes();
  findHero(list, name);
  let next = updateHero(list, name, (h) => ({ [flag]: !h[flag] }));
  const hero = findHero(next, name);
  if (hero.isCurrent && !isAvailable(hero)) next = withRandomCurrent(next);
  write(next);
}

// Completed and blocked heroes can't be selected; that's a silent no-op.
export const selectHero = createMutation((name) => {
  const list = heroes();
  if (!isAvailable(findHero(list, name))) return;
  write(setCurrent(list, name));
});

export const selectRandomHero = createMutation(() => write(withRandomCurrent(heroes())));

export const toggleBlocked = createMutation((name) => toggleFlag(name, 'isBlocked'));

export const toggleCompleted = createMutation((name) => toggleFlag(name, 'isCompleted'));

// Completes the current hero, counts the win, and moves on to a random hero.
export const recordWin = createMutation(() => {
  const list = heroes();
  const current = list.find((h) => h.isCurrent);
  if (!current) return;
  const won = updateHero(list, current.name, (h) => ({ isCompleted: true, win: h.win + 1 }));
  write(withRandomCurrent(won));
});

export const recordLoss = createMutation(() => {
  const list = heroes();
  const current = list.find((h) => h.isCurrent);
  if (!current) return;
  write(updateHero(list, current.name, (h) => ({ lost: h.lost + 1 })));
});

// Replaces all hero state. Validates the shape; the caller picks a new current hero.
export const importHeroes = createMutation((list) => {
  if (!isValidHeroList(list)) throw new Error('Invalid hero list');
  write(list);
});

// Restores the pristine hero list. Async because it fetches the seed, so it
// notifies itself instead of using createMutation.
export async function resetHeroes() {
  write(await loadSeed());
  notify();
}
