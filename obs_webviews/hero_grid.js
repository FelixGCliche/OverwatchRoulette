import { seedHeroes } from '../store/seed.js';
import { subscribe } from '../store/core.js';
import { heroes } from '../store/queries.js';

const HERO_ICON_PATH = `../assets/heroes_images/`;
const ROLES_ICON_PATH = `../assets/roles_icons/`;
const ROLES = ['Tank', 'Damage', 'Support'];
const ROLES_ICONS = {
  'Damage': 'Role_Damage_Circle.svg',
  'Support': 'Role_Support_Circle.svg',
  'Tank': 'Role_Tank_Circle.svg'
};

const grid = document.getElementById('hero-grid');
const items = new Map(); // hero name -> .hero-item element
let builtNames = [];     // hero names in the order the grid was built from

// ========================================================================
// INITIALIZATION
// ========================================================================

async function Init() {
  const main = document.querySelector('main');

  try {
    await seedHeroes();
    console.log('Heroes loaded:', heroes().length);

    subscribe(RenderHeroGrid);
    RenderHeroGrid();

  } catch (error) {
    console.error('Error loading heroes:', error);
    main.innerHTML = '<p style="color: #e74c3c;">Error loading hero data</p>';
  }
}

// ========================================================================
// HERO GRID
// ========================================================================

// Re-runs on every store change (the dashboard writes from another page, so
// this arrives via the storage event). The images are built once and only
// their status classes are updated afterwards.
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

  UpdateRoleCounts();
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

// Completed heroes over all non-blocked heroes, per role row.
function UpdateRoleCounts() {
  document.querySelectorAll('.role-row').forEach((row) => {
    const items = row.querySelectorAll('.hero-item');
    const completed = row.querySelectorAll('.hero-item.completed').length;
    const available = items.length - row.querySelectorAll('.hero-item.blocked').length;
    const blocked = row.querySelectorAll('.hero-item.blocked').length;
    const blockedLabel = row.querySelector('.role-blocked');
    blockedLabel.textContent = `${blocked} blocked`;
    blockedLabel.classList.toggle('has-blocked', blocked > 0);

    const count = row.querySelector('.role-count');
    count.textContent = `${completed}/${available}`;
    count.classList.toggle('done', available > 0 && completed >= available);
  });
}

function CreateRoleTitle(role) {
  const title = document.createElement('div');
  title.className = 'role-title';

  const icon = document.createElement('img');
  icon.className = 'role-icon';
  icon.src = ROLES_ICON_PATH + ROLES_ICONS[role];
  icon.alt = role;

  const heading = document.createElement('div');
  heading.className = 'role-heading';

  const label = document.createElement('span');
  label.className = 'role-name';
  label.textContent = role;

  const blocked = document.createElement('span');
  blocked.className = 'role-blocked';

  heading.appendChild(label);
  heading.appendChild(blocked);

  title.appendChild(icon);
  const count = document.createElement('span');
  count.className = 'role-count';

  title.appendChild(heading);
  title.appendChild(count);
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
  img.style.maxWidth = '128px';
  img.style.height = 'auto';
  return img;
}

// ========================================================================
// ENTRY POINT
// ========================================================================

document.addEventListener('DOMContentLoaded', Init);
