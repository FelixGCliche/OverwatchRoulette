import { subscribe } from '../../store/core.js';
import { heroes, heroState } from '../../store/queries.js';
import { selectHero, toggleBlocked, toggleCompleted } from '../../store/mutations.js';
import { heroIconUrl } from '../../utils/assets.js';
import { $, el } from '../../utils/dom.js';
import { onFilterChange, visibleHeroes } from './hero-filter.js';
import { statusLabel } from './hero-status.js';

// Small-viewport hero picker: role tabs, a tile grid and a bottom sheet with
// the actions for the tapped tile. CSS hides all of it on wider viewports.
const state = {
  role: 'All',
  sheet: null, // hero name shown in the bottom sheet
};

export function mountHeroDock() {
  document.querySelectorAll('.role-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      state.role = tab.dataset.role;
      render();
    });
  });

  $('sheet-backdrop').addEventListener('click', () => closeSheet(true));
  bindSheetActions();
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && state.sheet) closeSheet(true);
  });

  subscribe(render);
  onFilterChange(render);
  render();
}

function render() {
  renderTabs();
  renderTiles();
  renderSheet();
}

// ---- role tabs -----------------------------------------------------------

function renderTabs() {
  document.querySelectorAll('.role-tab').forEach((tab) => {
    tab.setAttribute('aria-pressed', String(tab.dataset.role === state.role));
  });
  const pool = heroes().filter((h) => state.role === 'All' || h.role === state.role);
  $('role-progress-count').textContent = `${pool.filter((h) => h.isCompleted).length}/${pool.length}`;
}

// ---- tiles ---------------------------------------------------------------

const BADGES = { current: 'Now', blocked: '✕', completed: '✓', available: '' };

function renderTiles() {
  const shown = visibleHeroes({ role: state.role });
  const tiles = shown.map(createTile);
  if (shown.length === 0) {
    tiles.push(el('div', 'no-match', {
      textContent: 'No heroes match. Clear the search or change the filter.',
    }));
  }
  $('hero-tiles').replaceChildren(...tiles);
}

function createTile(hero) {
  const kind = heroState(hero);
  const status = statusLabel(hero);

  const tile = el('button', 'hero-tile', { type: 'button' });
  tile.dataset.name = hero.name;
  if (kind !== 'available') tile.classList.add(kind);
  tile.setAttribute('aria-label', status === 'Available' ? hero.name : `${hero.name}, ${status.toLowerCase()}`);

  const badge = el('span', 'tile-badge', { textContent: BADGES[kind] });
  badge.setAttribute('aria-hidden', 'true');
  badge.hidden = !badge.textContent;

  tile.append(
    el('img', '', { src: heroIconUrl(hero), alt: '' }),
    el('span', 'tile-name', { textContent: hero.name }),
    badge,
  );
  tile.addEventListener('click', () => openSheet(hero.name));
  return tile;
}

// ---- bottom sheet --------------------------------------------------------

function openSheet(name) {
  state.sheet = name;
  renderSheet();
  const select = $('sheet-select');
  (select.disabled ? $('sheet-complete') : select).focus();
}

function closeSheet(returnFocus) {
  const name = state.sheet;
  state.sheet = null;
  renderSheet();
  if (returnFocus && name) {
    document.querySelector(`.hero-tile[data-name="${CSS.escape(name)}"]`)?.focus();
  }
}

function renderSheet() {
  const hero = state.sheet ? heroes().find((h) => h.name === state.sheet) : null;
  if (!hero) state.sheet = null;
  $('sheet').hidden = !hero;
  $('sheet-backdrop').hidden = !hero;
  if (!hero) return;

  $('sheet-img').src = heroIconUrl(hero);
  $('sheet-name').textContent = hero.name;
  $('sheet-select').disabled = hero.isBlocked;
  $('sheet-complete').textContent = hero.isCompleted ? 'Undo' : 'Complete';
  $('sheet-block').textContent = hero.isBlocked ? 'Unblock' : 'Block';
}

function bindSheetActions() {
  const act = (id, run) => $(id).addEventListener('click', () => {
    const name = state.sheet;
    if (!name) return;
    closeSheet(false);
    run(name);
  });
  act('sheet-select', (name) => selectHero(name, true));
  act('sheet-complete', toggleCompleted);
  act('sheet-block', toggleBlocked);
}
