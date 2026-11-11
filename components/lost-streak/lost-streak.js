import { subscribe } from '../../store/core.js';
import { totalLosses } from '../../store/queries.js';

// Mounts the lost-streak view into `el`: total losses across all heroes.
// Renders on mount, then on every store change.
export function mountLostStreak(el) {
  const label = document.createElement('span');
  label.className = 'lost-streak-label';
  label.textContent = 'Lost streak:';

  const count = document.createElement('span');
  count.className = 'lost-streak-count';

  el.classList.add('lost-streak');
  el.append(label, count);

  function Render() {
    count.textContent = String(totalLosses());
  }

  subscribe(Render);
  Render();
}
