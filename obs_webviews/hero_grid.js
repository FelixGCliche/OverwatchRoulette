const HERO_ICON_PATH = `../assets/heroes_images/`;

let heroes;

const heroUpdateChannel = new BroadcastChannel('hero-update');
heroUpdateChannel.onmessage = (event) => {
    const hero = event.data;
    console.log("Received:", hero);
    const heroIndex = GetHeroIndex(hero.name)
    const item = document.querySelector(`.hero-item:nth-child(${heroIndex + 1})`);
    if (item) {
      item.classList.toggle('current', hero.isCurrent);
      item.classList.toggle('blocked', hero.isBlocked);
      item.classList.toggle('completed', hero.isCompleted);
    }
};

// ========================================================================
// INITIALIZATION
// ========================================================================

async function Init() {
  const main = document.querySelector('main');
  
  try {
    const response = await fetch('./../assets/heroes.json');
    
    if (!response.ok) throw new Error(`Failed to load heroes: ${response.statusText}`);
    
    heroes = await response.json();
    console.log('Heroes loaded:', heroes.length);

    RenderHeroGrid();
    
  } catch (error) {
    console.error('Error loading heroes:', error);
    main.innerHTML = '<p style="color: #e74c3c;">Error loading hero data</p>';
  }
}

// ========================================================================
// HERO GRID
// ========================================================================

function RenderHeroGrid() {
  grid = document.getElementById('hero-grid');
  
  heroes.forEach((hero, index) => {
    grid.appendChild(CreateHeroItem(hero, index));
  });
}

function CreateHeroItem(hero, heroIndex) {
  const item = document.createElement('div');
  item.className = 'hero-item';
  if (hero.isBlocked) item.classList.add('blocked');
  if (hero.isCompleted) item.classList.add('completed');
  

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
// UTILITY
// ========================================================================

function GetHeroIndex(name){
  return heroes.findIndex((element) => element.name === name);
}

// ========================================================================
// ENTRY POINT
// ========================================================================

document.addEventListener('DOMContentLoaded', Init);