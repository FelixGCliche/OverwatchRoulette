// Seeds localStorage from assets/heroes.json.
//   - nothing stored, or stored data is corrupt/invalid: store the seed
//   - valid stored data: keep it, appending any seed heroes missing by name,
//     so new heroes in heroes.json show up without wiping saved progress
// Idempotent, so every page can call it on load.

import { read, write } from './storage.js';

const SEED_URL = new URL('../assets/heroes.json', import.meta.url);

function isValidHeroList(storage) {
  return Array.isArray(storage) && storage.every((hero) => typeof hero?.name === 'string');
}

export async function seedHeroes() {
  const response = await fetch(SEED_URL);
  if (!response.ok) throw new Error(`Failed to load heroes: ${response.statusText}`);
  const seed = await response.json();

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
