import { read } from './storage.js';

export const heroes = () => read() ?? [];

export const currentHero = () => heroes().find((hero) => hero.isCurrent) ?? null;
export const currentLostStreak = () => currentHero()?.currentLostStreak ?? 0;

export const isAvailable = (hero) => !hero.isCompleted && !hero.isBlocked;

export const availableHeroes = () => heroes().filter(isAvailable);

export const totalLosses = () => heroes().reduce((sum, hero) => sum + hero.lost, 0);
export const totalWins = () => heroes().reduce((sum, hero) => sum + hero.win, 0);
