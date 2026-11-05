/** ============================================================
  OVERWATCH HERO ROULETTE
  ============================================================ */

import { seedHeroes } from './store/seed.js';
import { subscribe } from './store/core.js';
import { heroes, currentHero } from './store/queries.js';
import {
  selectHero,
  selectRandomHero,
  toggleBlocked,
  toggleCompleted,
  importHeroes,
  recordWin,
  recordLoss,
} from './store/mutations.js';

const HERO_ICON_PATH = `assets/heroes_images/`;
const ROLES_ICON_PATH = `assets/roles_icons/`;

const ROLES_ICONS = {
  'Damage': 'Role_Damage_Circle.svg',
  'Support': 'Role_Support_Circle.svg',
  'Tank': 'Role_Tank_Circle.svg',
};

// ========================================================================
// INITIALIZATION
// ========================================================================

function BindButtons() {
  const handlers = {
    'current-hero-win': recordWin,
    'current-hero-lost': recordLoss,
    'select-random': selectRandomHero,
    'load-json': LoadJSON,
    'save-json': SaveJSON,
  };

  for (const [id, handler] of Object.entries(handlers)) {
    document.getElementById(id).addEventListener('click', handler);
  }
}

async function Init() {
  const main = document.querySelector('main');
  BindButtons();

  try {
    await seedHeroes();
    console.log('Heroes loaded:', heroes().length);

    subscribe(Render);
    Render();
    if (!currentHero()) selectRandomHero();

  } catch (error) {
    console.error('Error loading heroes:', error);
    main.innerHTML = '<p style="color: #e74c3c;">Error loading hero data</p>';
  }
}

// ========================================================================
// CURRENT HERO HEADER
// ========================================================================

// Re-runs on every store change (this tab's mutations and other tabs' writes).
function Render() {
  RenderCurrentHeroHeader();
  RenderHeroList();
}

function RenderCurrentHeroHeader() {
  const banner = document.getElementById('banner');
  const currentHeroDisplay = document.getElementById('current-hero');
  const hero = currentHero();

  //Toggle between current hero or the banner
  if (!hero) {
    banner.style.display = "flex";
    currentHeroDisplay.style.display = "none";
    return;
  }else{
    currentHeroDisplay.style.display = "flex"
    banner.style.display = "none";
  }

  const currentHeroIcon = document.getElementById('current-hero-icon');
  const currentHeroRoleIcon = document.getElementById('current-hero-role-icon');
  const currentHeroName = document.getElementById('current-hero-name');

  currentHeroIcon.src = HERO_ICON_PATH + hero.image;
  currentHeroIcon.alt = hero.name;

  currentHeroRoleIcon.src = ROLES_ICON_PATH + ROLES_ICONS[hero.role];
  currentHeroIcon.alt = hero.role;

  currentHeroName.innerText = hero.name;
}

// ========================================================================
// HERO LIST
// ========================================================================

function RenderHeroList() {
  const list = document.getElementById('hero-list');
  //Delete all childrens
  list.textContent = '';
  
  heroes().forEach((hero) => {
    list.appendChild(CreateHeroItem(hero));
  });
}

function CreateHeroItem(hero) {
  const item = document.createElement('div');
  item.className = 'hero-item';
  if (hero.isBlocked) item.classList.add('blocked');
  if (hero.isCompleted) item.classList.add('completed');
  
  const infoCell = document.createElement('div');
  infoCell.className = 'hero-info';
  infoCell.appendChild(CreateImage(hero));
  //infoCell.appendChild(CreateRoleIcon(hero));
  infoCell.appendChild(CreateName(hero));
  
  const btnCell = CreateButtonContainer(hero);
  
  item.appendChild(infoCell);
  item.appendChild(btnCell);
  
  return item;
}

function CreateImage(hero) {
  const img = document.createElement('img');
  img.src = HERO_ICON_PATH + hero.image;
  img.alt = hero.name;
  img.style.maxWidth = '32px';
  img.style.height = 'auto';
  return img;
}

function CreateRoleIcon(hero) {
  const cell = document.createElement('div');
  cell.className = 'role-cell';
  
  const src = ROLES_ICONS[hero.role] || '';
  const img = document.createElement('img');
  img.src = HERO_ICON_PATH + ROLES_ICONS[hero.role];
  img.alt = hero.role;
  img.style.maxWidth = '24px';
  img.style.height = 'auto';
  
  cell.appendChild(img);
  return cell;
}

function CreateName(hero) {
  const div = document.createElement('div');
  div.className = 'name-cell';
  div.textContent = hero.name;
  return div;
}

// ========================================================================
// HERO BUTTON CONTAINER
// ========================================================================

const HERO_ACTIONS = [
  { text: 'Select', className: 'select-btn', run: selectHero },
  { text: 'Complete', className: 'complete-btn', run: toggleCompleted },
  { text: 'Block', className: 'block-btn', run: toggleBlocked },
];

function CreateButtonContainer(hero) {
  const container = document.createElement('div');
  container.style.display = 'flex';
  container.style.gap = '10px';

  HERO_ACTIONS.forEach(({ text, className, run }) => {
    const cell = document.createElement('div');
    cell.className = `button-cell ${className}`;

    const button = document.createElement('button');
    button.textContent = text;

    // Disable select button if hero is completed or blocked
    const isDisabled = run === selectHero && (hero.isCompleted || hero.isBlocked);
    if (isDisabled) {
      button.disabled = true;
      button.style.opacity = '0.5';
    }

    button.onclick = () => run(hero.name);

    cell.appendChild(button);
    container.appendChild(cell);
  });

  return container;
}

// ========================================================================
// FOOTER ACTIONS
// ========================================================================

function SaveJSON() {
  const heroData = JSON.stringify(heroes(), null, 2);
  const blob = new Blob([heroData], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = 'OverwatchRoulette.json';
  link.click();
  link.remove();
  
  setTimeout(() => URL.revokeObjectURL(url), 100);
  console.log('JSON saved');
}

function LoadJSON() {
  if (!confirm('You will lose your current data. Continue?')) return;

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.json';
  
  fileInput.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      // Parsing and validation happen inside the async callback, so the
      // try/catch has to live here to catch them.
      try {
        const data = JSON.parse(event.target.result);
        importHeroes(data);
        selectRandomHero();
        console.log('Heroes loaded:', data.length);
      } catch (error) {
        console.error('Error loading hero data:', error);
        alert('Failed to parse hero data. Please check the file format.');
      }
    };

    reader.onerror = () => {
      console.error('Failed to read file');
    };

    reader.readAsText(file);
  };
  
  fileInput.click();
}

// ========================================================================
// ENTRY POINT
// ========================================================================

document.addEventListener('DOMContentLoaded', Init);


