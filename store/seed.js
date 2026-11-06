import { read, write } from './storage.js';

const SEED_URL = new URL('../assets/heroes.json', import.meta.url);

const FLAGS = ['isBlocked', 'isCompleted', 'isCurrent'];
const COUNTERS = ['win', 'lost'];

const isValidHero = (hero) =>
  typeof hero?.name === 'string' &&
  FLAGS.every((key) => typeof hero[key] === 'boolean') &&
  COUNTERS.every((key) => Number.isFinite(hero[key]));

// Shape of heroes.json: used for stored data and for imported files.
export const isValidHeroList = (list) => Array.isArray(list) && list.every(isValidHero);

// Fetches the pristine hero list without touching storage.
export async function loadSeed() {
  const response = await fetch(SEED_URL);
  if (!response.ok) throw new Error(`Failed to load heroes: ${response.statusText}`);
  return response.json();
}

export async function seedHeroes() {
  const seed = await loadSeed();

  const stored = read();
  if (!isValidHeroList(stored)) {
    write(seed);
    return seed;
  }

  const known = new Set(stored.map((hero) => hero.name));
  const missing = seed.filter((hero) => !known.has(hero.name));
  if (missing.length === 0) return stored;

  const merged = [...stored, ...missing];
  write(merged);
  return merged;
}
