import { subscribe } from '../../store/core.js';
import { currentHero } from '../../store/queries.js';
import { watchSpin } from '../hero-wheel/spin-state.js';

const HERO_ICON_PATH = new URL('../../assets/heroes_images/', import.meta.url).href;
const ROLES_ICON_PATH = new URL('../../assets/roles_icons/', import.meta.url).href;

// Mounts the current-hero view into `el`. Renders from localStorage on mount,
// then again on every store change (the dashboard writes in another page, so
// this arrives via the storage event). `el` is hidden while no hero is current.
export function mountCurrentHero(el) {
  const icon = document.createElement('img');
  icon.className = 'hero-icon';

  const roleIcon = document.createElement('img');
  roleIcon.className = 'role-icon';
  const roleName = document.createElement('span');
  roleName.className = 'role-name';
  const role = document.createElement('div');
  role.className = 'hero-role';
  role.append(roleIcon, roleName);

  const name = document.createElement('div');
  name.className = 'hero-name';

  const streak = document.createElement('div');
  streak.className = 'hero-lost-streak';

  const info = document.createElement('div');
  info.className = 'hero-info';
  info.append(role, name, streak);

  el.classList.add('current-hero');
  el.append(icon, info);

  function Render() {
    if (spinning) return;
    const hero = currentHero();
    el.hidden = !hero;
    if (!hero) return;

    icon.src = HERO_ICON_PATH + hero.image;
    icon.alt = hero.name;
    roleIcon.src = `${ROLES_ICON_PATH}Role_${hero.role}_Circle.svg`;
    roleIcon.alt = hero.role;
    roleName.textContent = hero.role;
    name.textContent = hero.name;
    streak.textContent = `Lost streak: ${hero.currentLostStreak}`;
  }

  // The page slides this view out while the hero wheel spins. Keep the old
  // hero until the spin ends so the new one isn't shown early. watchSpin must
  // subscribe before Render so `spinning` is already set when Render runs.
  let spinning = false;
  watchSpin((isSpinning) => {
    spinning = isSpinning;
    if (!spinning) Render();
  });
  subscribe(Render);
  Render();
}
