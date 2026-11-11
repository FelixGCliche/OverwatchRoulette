import { subscribe } from '../../store/core.js';
import { totalLosses, totalWins } from '../../store/queries.js';

function stat(labelText, valueClass) {
  const label = document.createElement('span');
  label.className = 'stat-label';
  label.textContent = labelText;
  const value = document.createElement('span');
  value.className = `stat-value ${valueClass}`;
  const el = document.createElement('div');
  el.className = 'stat';
  el.append(label, value);
  return { el, value };
}

// Mounts the win-lost view into `el`: total wins and losses across all
// heroes on one line. Renders on mount, then on every store change.
export function mountWinLost(el) {
  const wins = stat('Wins', 'stat-win');
  const losses = stat('Losses', 'stat-lost');

  el.classList.add('win-lost');
  el.append(wins.el, losses.el);

  function Render() {
    wins.value.textContent = String(totalWins());
    losses.value.textContent = String(totalLosses());
  }

  subscribe(Render);
  Render();
}
