import { subscribe } from '../../../store/core.js';
import { heroes } from '../../../store/queries.js';

const HERO_ICON_PATH = `../assets/heroes_images/`;
const ROLES_ICON_PATH = `../assets/roles_icons/`;
const ROLES = ['Tank', 'Damage', 'Support'];

// Mounts the hero grid into `grid`. The store must already be seeded.
// Re-renders on every store change (the dashboard writes from another page,
// so this arrives via the storage event). The images are built once and only
// their status classes are updated afterwards.
export function mountHeroGrid(grid) {
  const items = new Map(); // hero name -> .hero-item element
  let builtNames = [];     // hero names in the order the grid was built from

  grid.classList.add('hero-grid');

  function RenderHeroGrid() {
    const list = heroes();

    const sameHeroes = list.length === builtNames.length && list.every((hero, i) => hero.name === builtNames[i]);
    if (!sameHeroes) BuildHeroGrid(list);

    list.forEach((hero) => {
      const item = items.get(hero.name);
      item.classList.toggle('current', hero.isCurrent);
      item.classList.toggle('blocked', hero.isBlocked);
      item.classList.toggle('completed', hero.isCompleted);
    });

    grid.querySelectorAll('.role-row').forEach(UpdateRoleCounts);
  }

  function BuildHeroGrid(list) {
    grid.textContent = '';
    items.clear();
    builtNames = list.map((hero) => hero.name);

    ROLES.forEach((role) => {
      const row = document.createElement('section');
      row.className = 'role-row';
      row.appendChild(CreateRoleTitle(role));

      const roleHeroes = document.createElement('div');
      roleHeroes.className = 'role-heroes';
      list
        .filter((hero) => hero.role === role)
        .forEach((hero) => {
          const item = CreateHeroItem(hero);
          items.set(hero.name, item);
          roleHeroes.appendChild(item);
        });

      row.appendChild(roleHeroes);
      grid.appendChild(row);
    });
  }

  function UpdateRoleCounts(row) {
    const blocked = row.querySelectorAll('.hero-item.blocked').length;
    const completed = row.querySelectorAll('.hero-item.completed:not(.blocked)').length;
    const available = row.querySelectorAll('.hero-item').length - blocked;

    const count = row.querySelector('.role-count');
    count.textContent = `${completed}/${available}`;
    count.classList.toggle('done', available > 0 && completed >= available);
  }

  function CreateRoleTitle(role) {
    const icon = document.createElement('img');
    icon.className = 'role-icon';
    icon.src = `${ROLES_ICON_PATH}Role_${role}_Circle.svg`;
    icon.alt = role;

    const name = document.createElement('span');
    name.className = 'role-name';
    name.textContent = role;

    const heading = document.createElement('div');
    heading.className = 'role-heading';
    heading.append(name);

    const count = document.createElement('span');
    count.className = 'role-count';

    const title = document.createElement('div');
    title.className = 'role-title';
    title.append(icon, heading, count);
    return title;
  }

  function CreateHeroItem(hero) {
    const item = document.createElement('div');
    item.className = 'hero-item';
    item.appendChild(CreateImage(hero));
    return item;
  }

  function CreateImage(hero) {
    const img = document.createElement('img');
    img.className = 'hero-image';
    img.src = HERO_ICON_PATH + hero.image;
    img.alt = hero.name;
    return img;
  }

  subscribe(RenderHeroGrid);
  RenderHeroGrid();
}
