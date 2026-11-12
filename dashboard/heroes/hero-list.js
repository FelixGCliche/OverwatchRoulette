import { subscribe } from '../../store/core.js';
import { selectHero, toggleBlocked, toggleCompleted } from '../../store/mutations.js';
import { heroIconUrl } from '../../utils/assets.js';
import { $, el, createActionButton } from '../../utils/dom.js';
import { onFilterChange, visibleHeroes } from './hero-filter.js';
import { statusLabel } from './hero-status.js';

// Hero cards with Select / Complete / Block buttons. CSS hides this list on
// small viewports, where hero-dock shows tiles instead.
export function mountHeroList() {
  subscribe(render);
  onFilterChange(render);
  render();
}

function render() {
  const shown = visibleHeroes();
  $('hero-list').replaceChildren(...shown.map(createHeroCard));
  $('no-match').hidden = shown.length > 0;
}

function createHeroCard(hero) {
  const card = el('div', 'hero-card');
  card.classList.toggle('current', !!hero.isCurrent);
  card.classList.toggle('completed', !!hero.isCompleted);
  card.classList.toggle('blocked', !!hero.isBlocked);

  const info = el('div', 'card-info', {},
    el('img', '', { src: heroIconUrl(hero), alt: '' }),
    el('div', 'card-text', {},
      el('span', 'card-name', { textContent: hero.name }),
      el('span', 'card-status', { textContent: statusLabel(hero) }),
    ),
  );

  const actions = el('div', 'card-actions', {},
    createActionButton('Select', 'btn card-select', () => selectHero(hero.name), hero.isBlocked),
    createActionButton(hero.isCompleted ? 'Undo' : 'Complete', 'btn btn-outline', () => toggleCompleted(hero.name)),
    createActionButton(hero.isBlocked ? 'Unblock' : 'Block', 'btn btn-outline', () => toggleBlocked(hero.name)),
  );

  card.append(info, actions);
  return card;
}
