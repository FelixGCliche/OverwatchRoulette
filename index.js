/** ============================================================
  OVERWATCH HERO ROULETTE
  ============================================================ */

const HERO_ICON_PATH = `assets/heroes_images/`;
const ROLES_ICON_PATH = `assets/roles_icons/`;

const ROLES_ICONS = {
  'Damage': 'Role_Damage_Circle.svg',
  'Support': 'Role_Support_Circle.svg',
  'Tank': 'Role_Tank_Circle.svg',
};

let heroes;
let currentHero = null;

// ========================================================================
// BROADCAST CHANNELS
// ========================================================================
const currentHeroChannel = new BroadcastChannel('current-hero');
function SendCurrentHeroBroadcast() {
  currentHeroChannel.postMessage(currentHero);
}

const heroUpdateChannel = new BroadcastChannel('hero-update');
function SendHeroUpdateBroadcast(hero) {
  heroUpdateChannel.postMessage(hero);
}

// ========================================================================
// INITIALIZATION
// ========================================================================

function BindButtons() {
  const handlers = {
    'current-hero-win': CurrentHeroWin,
    'current-hero-lost': CurrentHeroLost,
    'select-random': SelectRandomHero,
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
    const response = await fetch('./assets/heroes.json');
    
    if (!response.ok) throw new Error(`Failed to load heroes: ${response.statusText}`);
    
    heroes = await response.json();
    console.log('Heroes loaded:', heroes.length);
    
    RenderHeroList();
    SelectRandomHero();
    
  } catch (error) {
    console.error('Error loading heroes:', error);
    main.innerHTML = '<p style="color: #e74c3c;">Error loading hero data</p>';
  }
}

// ========================================================================
// CURRENT HERO HEADER
// ========================================================================

function RenderCurrentHeroHeader() {
  const banner = document.getElementById('banner');
  const currentHeroDisplay = document.getElementById('current-hero');

  //Toggle between current hero or the banner
  if (!currentHero) {
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

  currentHeroIcon.src = HERO_ICON_PATH + currentHero.image;
  currentHeroIcon.alt = currentHero.name;

  currentHeroRoleIcon.src = ROLES_ICON_PATH + ROLES_ICONS[currentHero.role];
  currentHeroIcon.alt = currentHero.role;

  currentHeroName.innerText = currentHero.name;
}

function CurrentHeroWin(){
  const currentHeroIndex = GetCurrentHeroIndex();
  ToggleCompleted(currentHeroIndex);
  heroes[currentHeroIndex].win = heroes[currentHeroIndex].win + 1;
  SelectRandomHero();
}

function CurrentHeroLost(){
  const currentHeroIndex = GetCurrentHeroIndex();
  heroes[currentHeroIndex].lost = heroes[currentHeroIndex].lost + 1;
}

// ========================================================================
// HERO LIST
// ========================================================================

function RenderHeroList() {
  const list = document.getElementById('hero-list');
  //Delete all childrens
  list.textContent = '';
  
  heroes.forEach((hero, index) => {
    list.appendChild(CreateHeroItem(hero, index));
  });
}

function CreateHeroItem(hero, heroIndex) {
  const item = document.createElement('div');
  item.className = 'hero-item';
  if (hero.isBlocked) item.classList.add('blocked');
  if (hero.isCompleted) item.classList.add('completed');
  
  const infoCell = document.createElement('div');
  infoCell.className = 'hero-info';
  infoCell.appendChild(CreateImage(hero));
  //infoCell.appendChild(CreateRoleIcon(hero));
  infoCell.appendChild(CreateName(hero));
  
  const btnCell = CreateButtonContainer(hero, heroIndex);
  
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

function CreateButtonContainer(hero, heroIndex) {
  const container = document.createElement('div');
  container.style.display = 'flex';
  container.style.gap = '10px';
  
  ['Select', 'Complete', 'Block'].forEach((text, i) => {
    const cell = document.createElement('div');
    cell.className = `button-cell ${['select-btn', 'complete-btn', 'block-btn'][i]}`;
    
    const button = document.createElement('button');
    button.textContent = text;
    
    // Disable select button if hero is completed or blocked
    const isDisabled = i === 0 && (hero.isCompleted || hero.isBlocked); // i=0 is Select
    if (isDisabled) {
      button.disabled = true;
      button.style.opacity = '0.5';
    }
    
    button.onclick = () => OnButtonClick(heroIndex, i); 
    
    cell.appendChild(button);
    container.appendChild(cell);
  });
  
  return container;
}

// ========================================================================
// HERO BUTTON ACTIONS
// ========================================================================

function OnButtonClick(heroIndex, buttonIndex) {
  const action = ['select-btn', 'complete-btn', 'block-btn'][buttonIndex];
  
  switch (action) {
    case 'select-btn':
      if (heroes[heroIndex].isCompleted || heroes[heroIndex].isBlocked) {return;}
      ToggleSelected(heroIndex);
      break;
    case 'complete-btn':
      ToggleCompleted(heroIndex);
      break;
    case 'block-btn':
      ToggleBlocked(heroIndex);
      break;
  }
}

function ToggleBlocked(heroIndex) {
  heroes[heroIndex].isBlocked = !heroes[heroIndex].isBlocked;
  
  UpdateVisualState(heroIndex);
  SendHeroUpdateBroadcast(heroes[heroIndex]);
}

function ToggleCompleted(heroIndex) {
  heroes[heroIndex].isCompleted = !heroes[heroIndex].isCompleted;

  UpdateVisualState(heroIndex);
  SendHeroUpdateBroadcast(heroes[heroIndex]);
}

function ToggleSelected(heroIndex) {
  const lastCurrentHeroIndex = GetCurrentHeroIndex();
  if (lastCurrentHeroIndex != -1) {
    heroes[GetCurrentHeroIndex()].isCurrent = false;
    SendHeroUpdateBroadcast(heroes[GetCurrentHeroIndex()]);
  }

  currentHero = heroes[heroIndex];
  heroes[heroIndex].isCurrent = true; 

  RenderCurrentHeroHeader();
  SendCurrentHeroBroadcast();
  SendHeroUpdateBroadcast(heroes[heroIndex]);
}

// ========================================================================
// FOOTER ACTIONS
// ========================================================================

function SelectRandomHero() {
  // Get list of available heroes (not completed, not blocked)
  const availableHeroes = heroes.filter(hero => 
    !hero.isCompleted && !hero.isBlocked
  );
  
  if (availableHeroes.length === 0) {
    currentHero = null;
    RenderCurrentHeroHeader();
    console.log('No heroes available to select');
    return;
  }
  
  const randomIndex = Math.floor(Math.random() * availableHeroes.length);
  hero = availableHeroes[randomIndex];
  ToggleSelected(GetHeroIndex(hero.name));
}

function SaveJSON() {
  const heroData = JSON.stringify(heroes, null, 2);
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
    
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const data = JSON.parse(event.target.result);
        
        if (!Array.isArray(data)) throw new Error('Invalid hero list');
        
        heroes = data;
        console.log('Heroes loaded:', heroes.length);
        RenderHeroList();
        SelectRandomHero();
      };
      
      reader.onerror = () => {
        console.error('Failed to read file');
      };
      
      reader.readAsText(file);
    } catch (error) {
      console.error('Error loading hero data:', error);
      alert('Failed to parse hero data. Please check the file format.');
    }
  };
  
  fileInput.click();
}

// ========================================================================
// UTILITY
// ========================================================================

function GetHeroIndex(name){
  return heroes.findIndex((element) => element.name === name);
}

function GetCurrentHeroIndex(){
  if ( currentHero){
    return GetHeroIndex(currentHero.name);
  }
  return -1;
}

function UpdateVisualState(heroIndex) {
  const item = document.querySelector(`.hero-item:nth-child(${heroIndex + 1})`);
  if (item) {
    item.classList.toggle('blocked', heroes[heroIndex].isBlocked);
    item.classList.toggle('completed', heroes[heroIndex].isCompleted);
  }
}

// ========================================================================
// ENTRY POINT
// ========================================================================

document.addEventListener('DOMContentLoaded', Init);


