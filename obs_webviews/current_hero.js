import { subscribe } from '../store/core.js';
import { currentHero } from '../store/queries.js';

const HERO_ICON_PATH = '../assets/heroes_images/';

const icon = document.getElementById('hero-icon');

// Renders from localStorage on load, then again on every store change
// (the dashboard writes in another page, so this arrives via the storage event).
function Render() {
  const hero = currentHero();
  icon.hidden = !hero;
  if (hero) icon.src = HERO_ICON_PATH + hero.image;
  else icon.removeAttribute('src');
}

subscribe(Render);
Render();
