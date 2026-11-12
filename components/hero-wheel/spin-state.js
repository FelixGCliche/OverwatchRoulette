import { subscribe } from '../../store/core.js';
import { read, SPIN_KEY } from '../../store/storage.js';

// Reel (5s) -> payline glow (6.4s) -> reveal (6.6s + 1s), then a short hold on
// the revealed hero. Keep in sync with the spin sequence in hero-wheel.css.
export const SPIN_MS = 10000;

const spinId = () => read(SPIN_KEY)?.id ?? null;

// Calls onChange(true) when a spin is requested (see triggerSpin in
// mutations.js) and onChange(false) once the spin has played out. Selecting a
// hero without a spin request doesn't spin. Each OBS page runs its own copy:
// both see the same storage change at the same moment, so their timers stay
// in step. A spin marker present on load is not a new request.
export function watchSpin(onChange) {
  let lastId = spinId();
  let timer = null;

  onChange(false);

  subscribe(() => {
    const id = spinId();
    if (id === lastId) return;
    lastId = id;

    clearTimeout(timer);
    if (id === null) {
      onChange(false);
      return;
    }
    onChange(true);
    timer = setTimeout(() => onChange(false), SPIN_MS);
  });
}
