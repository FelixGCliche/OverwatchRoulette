import { subscribe } from '../../store/core.js';
import { availableHeroes, currentHero, heroByName, heroes } from '../../store/queries.js';
import { watchSpin } from './spin-state.js';
import { heroIconUrl, roleIconUrl } from '../../utils/assets.js';


// Tiles on the reel. Tile 0 is the previously shown hero (the reel starts there)
// and FINAL is the winner; --end in the CSS is derived from FINAL.
const TILE_COUNT = 24;
const FINAL = 22;
const FADE_MS = 600; // keep in sync with spin-fade-out in hero-wheel.css

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
        img.src = heroIconUrl(hero);
        return img;
      }),
    );
  }

  function showHero(hero) {
    reveal.hidden = !hero;
    if (!hero) return;
    roleIcon.src = roleIconUrl(hero.role);
    roleName.textContent = hero.role;
    name.textContent = hero.name;
  }

  function render() {
    const hero = currentHero();
    const nextName = hero?.name ?? null;

    if (nextName === shownName && started) return;

    const previous = heroByName(shownName) ?? null;
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

  // Subscribed before the render listener so the wheel is already visible
  // when the spin animation restarts.
  let hideTimer = null;
  watchSpin((spinning) => {
    clearTimeout(hideTimer);
    if (spinning) {
      scene.classList.remove('leaving');
      root.hidden = false;
    } else if (!root.hidden) {
      scene.classList.add('leaving');
      hideTimer = setTimeout(() => {
        root.hidden = true;
        scene.classList.remove('leaving');
      }, FADE_MS);
    }
  });
  

  render();
  subscribe(render);
}
