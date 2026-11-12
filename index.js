/** ============================================================
  OVERWATCH HERO ROULETTE
  ============================================================ */

import { seedHeroes } from './store/seed.js';
import { subscribe } from './store/core.js';
import { heroes, currentHero, isAvailable } from './store/queries.js';
import {
  selectHero,
  selectRandomHero,
  toggleBlocked,
  toggleCompleted,
  importHeroes,
  resetHeroes,
  recordWin,
  recordLoss,
} from './store/mutations.js';
import {
  queue,
  pending,
  subscribe as subscribeToQueue,
  enqueue,
  itemFromEvent,
  remove as removeFromQueue,
  setHero as setQueueHero,
  play,
  playNext,
  canPlay,
  canAccept,
  accept,
} from './store/queue.js';
import {
  connectRelay,
  relayUrl,
  hasRelayParam,
  saveRelayUrl,
  watchSavedRelayUrl,
  heroIncentiveId,
  saveHeroIncentiveId,
  watchHeroIncentiveId,
} from './relay/client.js';
import { formatAmount } from './utils/format.js';

const HERO_ICON_PATH = `assets/heroes_images/`;
const ROLES_ICON_PATH = `assets/roles_icons/`;

const ROLES_ICONS = {
  'Damage': 'Role_Damage_Circle.svg',
  'Support': 'Role_Support_Circle.svg',
  'Tank': 'Role_Tank_Circle.svg',
};

// UI-only state. Hero data lives in the store; none of this is persisted.
const ui = {
  query: '',
  filters: { available: false, completed: false, blocked: false },
  role: 'All',
  filterOpen: false,
  menuOpen: false,
  sheet: null, // hero name shown in the dock bottom sheet
};

const $ = (id) => document.getElementById(id);

// ========================================================================
// LAYOUT MODE
// ========================================================================

// compact = mobile width or dock; dock = ?dock in the URL or a very narrow window.
const mobileQuery = window.matchMedia('(max-width: 480px)');
const dockQuery = window.matchMedia('(max-width: 380px)');
const forceDock = new URLSearchParams(location.search).has('dock');

const isDock = () => forceDock || dockQuery.matches;

function ApplyLayout() {
  const dock = isDock();
  document.body.classList.toggle('dock', dock);
  document.body.classList.toggle('compact', dock || mobileQuery.matches);
  if (!dock) CloseSheet(false);
  Render();
}

// ========================================================================
// INITIALIZATION
// ========================================================================

function BindControls() {
  const clicks = {
    'current-hero-win-btn': recordWin,
    'current-hero-lost-btn': recordLoss,
    'select-random': selectRandomHero,
    'banner-random': selectRandomHero,
    'load-json': LoadJSON,
    'save-json': SaveJSON,
    'reset': ResetHeroes,
    'filter-toggle': () => SetFilterOpen(!ui.filterOpen),
    'filter-backdrop': () => SetFilterOpen(false),
    'filter-clear': ClearFilters,
    'more-toggle': () => { ui.menuOpen = !ui.menuOpen; RenderFooter(); },
    'sheet-backdrop': () => CloseSheet(true),
    'queue-play-next': playNext,
  };
  for (const [id, handler] of Object.entries(clicks)) {
    $(id).addEventListener('click', handler);
  }

  $('search').addEventListener('input', (e) => {
    ui.query = e.target.value;
    RenderLists();
  });

  document.querySelectorAll('[data-filter]').forEach((box) => {
    box.addEventListener('change', () => {
      ui.filters[box.dataset.filter] = box.checked;
      Render();
    });
  });

  document.querySelectorAll('.role-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      ui.role = tab.dataset.role;
      Render();
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (ui.sheet) CloseSheet(true);
    else if (ui.filterOpen) SetFilterOpen(false, true);
  });

  $('relay-form').addEventListener('submit', SaveRelayUrl);
  $('incentive-form').addEventListener('submit', SaveHeroIncentive);

  mobileQuery.addEventListener('change', ApplyLayout);
  dockQuery.addEventListener('change', ApplyLayout);
}

async function Init() {
  BindControls();

  try {
    await seedHeroes();
    console.log('Heroes loaded:', heroes().length);

    subscribe(Render);
    subscribeToQueue(RenderQueue);
    ApplyLayout();
    // if (!currentHero()) selectRandomHero();

    InitRelay();

  } catch (error) {
    console.error('Error loading hero data:', error);
    const main = document.querySelector('main');
    main.textContent = '';
    const message = document.createElement('p');
    message.style.color = '#e74c3c';
    message.textContent = 'Error loading hero data';
    main.appendChild(message);
  }
}

// Re-runs on every store change (this tab's mutations and other tabs' writes)
// and on every UI-state change. The search input is never re-created, so it
// keeps focus and caret position.
function Render() {
  RenderCurrentHeroHeader();
  RenderFilter();
  RenderLists();
  RenderQueue();
  RenderFooter();
}

function RenderLists() {
  const dock = document.body.classList.contains('dock');
  const shown = VisibleHeroes();

  if (dock) {
    RenderTabs();
    RenderTiles(shown);
    $('hero-list').textContent = '';
  } else {
    RenderHeroList(shown);
    $('hero-tiles').textContent = '';
  }
  RenderSheet();
  $('no-match').hidden = shown.length > 0;
}

// ========================================================================
// FILTERING
// ========================================================================

// Role tab (dock only) AND search text AND status filters. Status filters are
// OR-combined; with none checked every status passes.
function VisibleHeroes() {
  const q = ui.query.trim().toLowerCase();
  const { available, completed, blocked } = ui.filters;
  const anyStatus = available || completed || blocked;
  const roleTab = isDock() ? ui.role : 'All';

  return heroes().filter((hero) => {
    if (roleTab !== 'All' && hero.role !== roleTab) return false;
    if (q && !hero.name.toLowerCase().includes(q)) return false;
    if (!anyStatus) return true;
    return (available && isAvailable(hero))
      || (completed && hero.isCompleted)
      || (blocked && hero.isBlocked);
  });
}

function ClearFilters() {
  ui.filters = { available: false, completed: false, blocked: false };
  Render();
}

function SetFilterOpen(open, returnFocus = false) {
  ui.filterOpen = open;
  RenderFilter();
  if (open) $('filter-menu').querySelector('input').focus();
  else if (returnFocus) $('filter-toggle').focus();
}

function RenderFilter() {
  const all = heroes();
  const counts = {
    available: all.filter(isAvailable).length,
    completed: all.filter((h) => h.isCompleted).length,
    blocked: all.filter((h) => h.isBlocked).length,
  };
  const active = Object.keys(ui.filters).filter((k) => ui.filters[k]);

  document.querySelectorAll('[data-filter]').forEach((box) => {
    box.checked = ui.filters[box.dataset.filter];
  });
  document.querySelectorAll('[data-count]').forEach((el) => {
    el.textContent = counts[el.dataset.count];
  });

  const label = active.length === 0 ? 'Filter'
    : active.length === 1 ? active[0][0].toUpperCase() + active[0].slice(1)
    : `${active.length} filters`;
  $('filter-label').textContent = label;
  $('filter-toggle').classList.toggle('active', active.length > 0);
  $('filter-toggle').setAttribute('aria-expanded', String(ui.filterOpen));
  $('filter-menu').hidden = !ui.filterOpen;
  $('filter-backdrop').hidden = !ui.filterOpen;
}

// ========================================================================
// CURRENT HERO HEADER
// ========================================================================

function RenderCurrentHeroHeader() {
  const hero = currentHero();
  $('current-hero').hidden = !hero;
  $('banner').hidden = !!hero;

  if (!hero) {
    const none = !heroes().some(isAvailable);
    $('banner-text').textContent = none ? 'No more hero to select' : 'No hero selected';
    $('banner-random').disabled = none;
    return;
  }

  const icon = $('current-hero-icon');
  icon.src = HERO_ICON_PATH + hero.image;
  icon.alt = hero.name;

  $('current-hero-role-icon').src = ROLES_ICON_PATH + ROLES_ICONS[hero.role];
  $('current-hero-role-name').textContent = hero.role;
  $('current-hero-name').textContent = hero.name;
  
  // stats
  $('current-hero-lost-streak').textContent = `Lost streak: ${hero.currentLostStreak}`;
  $('current-hero-lost').textContent = `Lost: ${hero.lost}`;
  $('current-hero-win').textContent = `Wins: ${hero.win ?? 0}`;
}

// ========================================================================
// HERO CARDS (desktop and mobile)
// ========================================================================

function StatusOf(hero) {
  if (hero.isCurrent) return 'Playing now';
  if (hero.isCompleted) return 'Completed';
  if (hero.isBlocked) return 'Blocked';
  return 'Available';
}

function RenderHeroList(shown) {
  const list = $('hero-list');
  list.textContent = '';
  shown.forEach((hero) => list.appendChild(CreateHeroCard(hero)));
}

function CreateHeroCard(hero) {
  const card = document.createElement('div');
  card.className = 'hero-card';
  if (hero.isCurrent) card.classList.add('current');
  if (hero.isCompleted) card.classList.add('completed');
  if (hero.isBlocked) card.classList.add('blocked');

  const info = document.createElement('div');
  info.className = 'card-info';

  const img = document.createElement('img');
  img.src = HERO_ICON_PATH + hero.image;
  img.alt = '';

  const text = document.createElement('div');
  text.className = 'card-text';
  const name = document.createElement('span');
  name.className = 'card-name';
  name.textContent = hero.name;
  const status = document.createElement('span');
  status.className = 'card-status';
  status.textContent = StatusOf(hero);
  text.append(name, status);
  info.append(img, text);

  const actions = document.createElement('div');
  actions.className = 'card-actions';
  actions.append(
    CreateActionButton('Select', 'btn card-select', () => selectHero(hero.name), hero.isBlocked),
    CreateActionButton(hero.isCompleted ? 'Undo' : 'Complete', 'btn btn-outline', () => toggleCompleted(hero.name)),
    CreateActionButton(hero.isBlocked ? 'Unblock' : 'Block', 'btn btn-outline', () => toggleBlocked(hero.name)),
  );

  card.append(info, actions);
  return card;
}

function CreateActionButton(text, className, onClick, disabled = false) {
  const button = document.createElement('button');
  button.className = className;
  button.textContent = text;
  button.disabled = disabled;
  button.addEventListener('click', onClick);
  return button;
}

// ========================================================================
// DOCK: ROLE TABS, TILES, BOTTOM SHEET
// ========================================================================

function RenderTabs() {
  document.querySelectorAll('.role-tab').forEach((tab) => {
    tab.setAttribute('aria-pressed', String(tab.dataset.role === ui.role));
  });
  const pool = heroes().filter((h) => ui.role === 'All' || h.role === ui.role);
  $('role-progress-count').textContent = `${pool.filter((h) => h.isCompleted).length}/${pool.length}`;
}

function RenderTiles(shown) {
  const grid = $('hero-tiles');
  grid.textContent = '';
  shown.forEach((hero) => grid.appendChild(CreateTile(hero)));
}

function CreateTile(hero) {
  const tile = document.createElement('button');
  tile.className = 'hero-tile';
  tile.dataset.name = hero.name;
  const state = hero.isCurrent ? 'current' : hero.isBlocked ? 'blocked' : hero.isCompleted ? 'completed' : '';
  if (state) tile.classList.add(state);
  const status = StatusOf(hero);
  tile.setAttribute('aria-label', status === 'Available' ? hero.name : `${hero.name}, ${status.toLowerCase()}`);

  const img = document.createElement('img');
  img.src = HERO_ICON_PATH + hero.image;
  img.alt = '';

  const name = document.createElement('span');
  name.className = 'tile-name';
  name.textContent = hero.name;

  const badge = document.createElement('span');
  badge.className = 'tile-badge';
  badge.setAttribute('aria-hidden', 'true');
  badge.textContent = hero.isCurrent ? 'Now' : hero.isBlocked ? '✕' : hero.isCompleted ? '✓' : '';
  badge.hidden = !badge.textContent;

  tile.append(img, name, badge);
  tile.addEventListener('click', () => OpenSheet(hero.name));
  return tile;
}

function OpenSheet(name) {
  ui.sheet = name;
  RenderSheet();
  const select = $('sheet-select');
  (select.disabled ? $('sheet-complete') : select).focus();
}

function CloseSheet(returnFocus) {
  const name = ui.sheet;
  ui.sheet = null;
  RenderSheet();
  if (returnFocus && name) {
    document.querySelector(`.hero-tile[data-name="${CSS.escape(name)}"]`)?.focus();
  }
}

function RenderSheet() {
  const hero = ui.sheet && isDock() ? heroes().find((h) => h.name === ui.sheet) : null;
  if (!hero) ui.sheet = null;
  $('sheet').hidden = !hero;
  $('sheet-backdrop').hidden = !hero;
  if (!hero) return;

  $('sheet-img').src = HERO_ICON_PATH + hero.image;
  $('sheet-name').textContent = hero.name;
  $('sheet-select').disabled = hero.isBlocked;
  $('sheet-complete').textContent = hero.isCompleted ? 'Undo' : 'Complete';
  $('sheet-block').textContent = hero.isBlocked ? 'Unblock' : 'Block';
}

function BindSheetActions() {
  const act = (id, run) => $(id).addEventListener('click', () => {
    const name = ui.sheet;
    if (!name) return;
    CloseSheet(false);
    run(name);
  });
  act('sheet-select', (name) => selectHero(name, true));
  act('sheet-complete', toggleCompleted);
  act('sheet-block', toggleBlocked);
}
BindSheetActions();

// ========================================================================
// HERO REQUEST QUEUE (donations via the relay)
// ========================================================================

const RELAY_STATUS_TEXT = {
  connecting: 'Connecting',
  open: 'Live',
  reconnecting: 'Reconnecting',
  closed: 'Not connected',
};

let relay = null;

// Every page that connects enqueues what it receives; enqueue drops duplicates.
function ConnectRelay(url) {
  relay?.close();
  relay = connectRelay(url);
  relay.onStatus(RenderRelayStatus);
  relay.onEvent((event) => enqueue(itemFromEvent(event)));
  RenderRelayStatus(relay.status());
}

function InitRelay() {
  $('hero-incentive').value = heroIncentiveId() ?? '';
  watchHeroIncentiveId((id) => {
    $('hero-incentive').value = id ?? '';
  });
  $('relay-url').value = relayUrl() ?? '';
  ConnectRelay(relayUrl());
  if (!hasRelayParam()) {
    watchSavedRelayUrl((url) => {
      $('relay-url').value = url ?? '';
      ConnectRelay(url);
    });
  }
}

function SaveRelayUrl(e) {
  e.preventDefault();
  try {
    saveRelayUrl($('relay-url').value);
  } catch {
    alert('Invalid connection URL. It should look like wss://<host>/api/channel/<key>.');
    return;
  }
  ConnectRelay(relayUrl());
}

// The relay client reads the ID at each event, so no reconnect is needed.
function SaveHeroIncentive(e) {
  e.preventDefault();
  try {
    saveHeroIncentiveId($('hero-incentive').value);
  } catch {
    alert('Could not save the hero request incentive ID.');
    return;
  }
  $('hero-incentive').value = heroIncentiveId() ?? '';
}

function RenderRelayStatus(status) {
  $('relay-status').dataset.status = status;
  $('relay-status-text').textContent = RELAY_STATUS_TEXT[status];
}

// Pending requests sit above the queue until accepted or declined; only the
// accepted queue reaches the overlay.
function RenderQueue() {
  const items = queue();
  const waiting = pending();

  const pendingList = $('queue-pending');
  pendingList.textContent = '';
  waiting.forEach((item) => pendingList.appendChild(CreateQueueItem(item)));
  $('queue-pending-count').textContent = `(${waiting.length})`;
  $('queue-pending-section').hidden = waiting.length === 0;

  const list = $('queue-list');
  list.textContent = '';
  items.forEach((item) => list.appendChild(CreateQueueItem(item)));
  $('queue-empty').hidden = items.length > 0 || waiting.length > 0;
  $('queue-play-next').disabled = !items.some(canPlay);
}

function CreateQueueItem(item) {
  const hero = heroes().find((h) => h.name === item.hero);

  const row = document.createElement('li');
  const isPending = item.status === 'pending';
  row.className = 'queue-item';
  row.classList.toggle('unmatched', !hero);
  row.classList.toggle('pending', isPending);

  const icon = document.createElement(hero ? 'img' : 'div');
  icon.className = 'queue-icon';
  if (hero) {
    icon.src = HERO_ICON_PATH + hero.image;
    icon.alt = '';
  } else {
    icon.textContent = '?';
    icon.setAttribute('aria-hidden', 'true');
  }

  const text = document.createElement('div');
  text.className = 'queue-text';
  const name = document.createElement('span');
  name.className = 'queue-name';
  name.textContent = hero ? hero.name : 'No match';
  if (item.test) {
    const badge = document.createElement('span');
    badge.className = 'queue-test';
    badge.textContent = 'Test';
    name.appendChild(badge);
  }
  const message = document.createElement('span');
  message.className = 'queue-message';
  message.textContent = item.rawText ? `“${item.rawText}”` : 'No message';
  const donor = document.createElement('span');
  donor.className = 'queue-donor';
  donor.textContent = [item.donor, formatAmount(item.amount)].filter(Boolean).join(' · ');
  text.append(name, message, donor);

  const actions = document.createElement('div');
  actions.className = 'queue-actions';
  actions.appendChild(CreateHeroPicker(item));
  if (isPending) {
    actions.append(
      CreateActionButton('Accept', 'btn queue-play', () => accept(item.eventId), !canAccept(item)),
      CreateActionButton('Decline', 'btn btn-outline', () => removeFromQueue(item.eventId)),
    );
  } else {
    actions.append(
      CreateActionButton('Play', 'btn queue-play', () => play(item.eventId), !canPlay(item)),
      CreateActionButton('Remove', 'btn btn-outline', () => removeFromQueue(item.eventId)),
    );
  }

  row.append(icon, text, actions);
  return row;
}

// Searchable hero picker shown on every item. It shows the item's hero, or
// prompts for a pick when nothing matched. On focus the box is emptied (the
// current hero stays as the placeholder) so the suggestion list shows every
// hero; typing filters it. Picking a roster name saves it; anything else
// restores the current hero on blur.
function CreateHeroPicker(item) {
  const input = document.createElement('input');
  input.type = 'search';
  input.className = 'queue-pick';
  input.setAttribute('list', HeroNameList().id);
  input.setAttribute('aria-label', `Hero for ${item.donor}`);
  input.autocomplete = 'off';
  input.spellcheck = false;
  const current = item.hero ?? '';
  input.value = current;
  input.placeholder = current || 'Search hero…';

  const commit = () => {
    const name = heroes().find((h) => h.name.toLowerCase() === input.value.trim().toLowerCase())?.name;
    if (name && name !== item.hero) setQueueHero(item.eventId, name);
    else input.value = current;
  };
  input.addEventListener('focus', () => { input.value = ''; });
  input.addEventListener('change', commit);
  // Choosing a suggestion replaces the text in one step; save it right away.
  input.addEventListener('input', (e) => {
    if (e.inputType === 'insertReplacementText' || e.inputType === undefined) commit();
  });
  input.addEventListener('blur', () => { if (input.value !== current) commit(); });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') input.blur();
    if (e.key === 'Escape') { input.value = current; input.blur(); }
  });
  return input;
}

// One shared <datalist> of roster names for every hero picker.
function HeroNameList() {
  let list = $('hero-names');
  if (!list) {
    list = document.createElement('datalist');
    list.id = 'hero-names';
    document.body.appendChild(list);
  }
  const names = heroes().map((h) => h.name);
  if (list.options.length !== names.length || [...list.options].some((o, i) => o.value !== names[i])) {
    list.textContent = '';
    names.forEach((n) => list.appendChild(new Option(n, n)));
  }
  return list;
}

// ========================================================================
// FOOTER ACTIONS
// ========================================================================

function RenderFooter() {
  $('more-actions').classList.toggle('open', ui.menuOpen);
  $('more-toggle').textContent = ui.menuOpen ? 'Close' : 'More';
  $('more-toggle').setAttribute('aria-expanded', String(ui.menuOpen));
}

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

// Restores every hero from assets/heroes.json, discarding all progress.
async function ResetHeroes() {
  if (!confirm('You will lose your current data. Continue?')) return;

  try {
    await resetHeroes();
  } catch (error) {
    console.error('Error resetting heroes:', error);
    alert('Failed to reset heroes. Please check that assets/heroes.json is reachable.');
  }
}

// ========================================================================
// ENTRY POINT
// ========================================================================

document.addEventListener('DOMContentLoaded', Init);
