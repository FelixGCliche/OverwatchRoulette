import { read } from './storage.js';

export const heroes = () => read() ?? [];

export const currentHero = () => heroes().find((hero) => hero.isCurrent) ?? null;
export const heroByName = (name) => heroes().find((hero) => hero.name === name);

export const isAvailable = (hero) => !hero.isCompleted && !hero.isBlocked;

// One state per hero, in priority order, for labels and badges.
export const heroState = (hero) =>
  hero.isCurrent ? 'current' : hero.isBlocked ? 'blocked' : hero.isCompleted ? 'completed' : 'available';

export const availableHeroes = () => heroes().filter(isAvailable);

export const totalLosses = () => heroes().reduce((sum, hero) => sum + hero.lost, 0);
export const totalWins = () => heroes().reduce((sum, hero) => sum + (hero.win ?? 0), 0);
