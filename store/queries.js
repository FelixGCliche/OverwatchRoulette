import { read } from './storage.js';

export const heroes = () => read() ?? [];

export const currentHero = () => heroes().find((hero) => hero.isCurrent) ?? null;

export const isAvailable = (hero) => !hero.isCompleted && !hero.isBlocked;

export const availableHeroes = () => heroes().filter(isAvailable);

