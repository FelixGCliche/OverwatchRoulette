import { seedHeroes } from '../store/seed.js';
import { subscribe } from '../store/core.js';
import { heroes } from '../store/queries.js';

const HERO_ICON_PATH = `../assets/heroes_images/`;

const grid = document.getElementById('hero-grid');
const items = new Map(); // hero name -> .hero-item element, in grid order

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

  const builtNames = [...items.keys()];
  const sameHeroes = list.length === builtNames.length && list.every((hero, i) => hero.name === builtNames[i]);
  if (!sameHeroes) BuildHeroGrid(list);

  list.forEach((hero) => {
    const item = items.get(hero.name);
    item.classList.toggle('current', hero.isCurrent);
    item.classList.toggle('blocked', hero.isBlocked);
    item.classList.toggle('completed', hero.isCompleted);
  });
}

function BuildHeroGrid(list) {
  grid.textContent = '';
  items.clear();
  list.forEach((hero) => {
    const item = CreateHeroItem(hero);
    items.set(hero.name, item);
    grid.appendChild(item);
  });
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
