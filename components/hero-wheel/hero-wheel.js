import { subscribe } from '../../store/core.js';
import { availableHeroes, currentHero, heroes } from '../../store/queries.js';

const HERO_ICON_PATH = new URL('../../assets/heroes_images/', import.meta.url).href;
const ROLES_ICON_PATH = new URL('../../assets/roles_icons/', import.meta.url).href;

// Tiles on the reel. Tile 0 is the previously shown hero (the reel starts there)
// and FINAL is the winner; --end in the CSS is derived from FINAL.
const TILE_COUNT = 24;
const FINAL = 22;
const LONG_NAME = 9;

function pickFiller(pool, avoid, count) {
  const out = [];
  let prev = null;
  for (let i = 0; i < count; i++) {
    let hero;
    do {
      hero = pool[Math.floor(Math.random() * pool.length)];
    } while (pool.length > 2 && (hero.name === avoid || hero.name === prev));
    out.push(hero);
    prev = hero.name;
  }
  return out;
}

export function mountHeroWheel(root) {
  root.innerHTML = `
    <div class="hero-spin">
      <div class="spin-panel">
        <div class="spin-window">
          <div class="spin-strip"></div>
          <div class="spin-shade"></div>
        </div>
        <div class="spin-payline"></div>
      </div>
      <div class="spin-reveal" hidden>
        <div class="spin-role">
          <img class="spin-role-icon" alt="">
          <span class="spin-role-name"></span>
        </div>
        <div class="spin-name"></div>
      </div>
    </div>`;

  const scene = root.querySelector('.hero-spin');
  const strip = root.querySelector('.spin-strip');
  const reveal = root.querySelector('.spin-reveal');
  const roleIcon = root.querySelector('.spin-role-icon');
  const roleName = root.querySelector('.spin-role-name');
  const name = root.querySelector('.spin-name');

  let shownName = null;
  let started = false;

  function buildStrip(winner, previous) {
    const pool = availableHeroes().length > 2 ? availableHeroes() : heroes();
    const tiles = pickFiller(pool, winner.name, TILE_COUNT);
    if (previous) tiles[0] = previous;
    tiles[FINAL] = winner;

    strip.replaceChildren(
      ...tiles.map((hero) => {
        const img = document.createElement('img');
        img.className = 'spin-tile';
        img.alt = '';
        img.src = HERO_ICON_PATH + hero.image;
        return img;
      }),
    );
  }

  function showHero(hero) {
    reveal.hidden = !hero;
    if (!hero) return;
    roleIcon.src = `${ROLES_ICON_PATH}Role_${hero.role}_Circle.svg`;
    roleName.textContent = hero.role;
    name.textContent = hero.name;
    name.classList.toggle('long', hero.name.length > LONG_NAME);
  }

  function render() {
    const hero = currentHero();
    const nextName = hero?.name ?? null;

    if (nextName === shownName && started) return;

    const previous = heroes().find((h) => h.name === shownName) ?? null;
    shownName = nextName;
    const firstRender = !started;
    started = true;

    // Restart the CSS animation chain (spin -> glow -> reveal) from scratch.
    scene.classList.remove('spinning');

    if (!hero) {
      strip.replaceChildren();
      showHero(null);
      return;
    }

    buildStrip(hero, previous);
    showHero(hero);

    if (!firstRender) {
      void scene.offsetWidth; // flush so re-adding the class restarts the animations
      scene.classList.add('spinning');
    }
  }

  render();
  subscribe(render);
}
