import { subscribe } from '../../../store/core.js';
import { currentHero } from '../../../store/queries.js';

const HERO_ICON_PATH = '../assets/heroes_images/';

// Mounts the current-hero view into `el`. Renders from localStorage on mount,
// then again on every store change (the dashboard writes in another page, so
// this arrives via the storage event).
export function mountCurrentHero(el) {
  const icon = document.createElement('img');
  icon.className = 'hero-icon';
  el.appendChild(icon);

  function Render() {
    const hero = currentHero();
    icon.hidden = !hero;
    if (hero) icon.src = HERO_ICON_PATH + hero.image;
    else icon.removeAttribute('src');
  }

  subscribe(Render);
  Render();
}
