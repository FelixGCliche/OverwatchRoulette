import { subscribe } from '../../store/core.js';
import { currentHero } from '../../store/queries.js';

// Reel (5s) -> payline glow (6.4s) -> reveal (6.6s + 1s), then a short hold on
// the revealed hero. Keep in sync with the spin sequence in hero-wheel.css.
export const SPIN_MS = 10000;

// Calls onChange(true) when a new hero is selected and onChange(false) once the
// spin has played out. Each OBS page runs its own copy: both see the same
// storage change at the same moment, so their timers stay in step.
// The hero present on load is not a new selection, so it doesn't spin.
export function watchSpin(onChange) {
  let shownName = currentHero()?.name ?? null;
  let timer = null;

  onChange(false);

  subscribe(() => {
    const nextName = currentHero()?.name ?? null;
    if (nextName === shownName) return;
    shownName = nextName;

    clearTimeout(timer);
    if (nextName === null) {
      onChange(false);
      return;
    }
    onChange(true);
    timer = setTimeout(() => onChange(false), SPIN_MS);
  });
}
