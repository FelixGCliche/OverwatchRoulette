import { subscribe } from '../../store/core.js';
import { heroes, isAvailable } from '../../store/queries.js';
import { $ } from '../../utils/dom.js';

// UI-only filter state (search text + status filters). Not persisted.
const state = {
  query: '',
  filters: { available: false, completed: false, blocked: false },
  open: false,
};
const listeners = new Set();

// Lists subscribe here to re-render when the search or a filter changes.
export const onFilterChange = (listener) => listeners.add(listener);

function changed() {
  renderFilter();
  listeners.forEach((listener) => listener());
}

// Search text AND status filters, optionally narrowed to one role. Status
// filters are OR-combined; with none checked every status passes.
export function visibleHeroes({ role = 'All' } = {}) {
  const q = state.query.trim().toLowerCase();
  const { available, completed, blocked } = state.filters;
  const anyStatus = available || completed || blocked;

  return heroes().filter((hero) => {
    if (role !== 'All' && hero.role !== role) return false;
    if (q && !hero.name.toLowerCase().includes(q)) return false;
    if (!anyStatus) return true;
    return (available && isAvailable(hero))
      || (completed && hero.isCompleted)
      || (blocked && hero.isBlocked);
  });
}

function clearFilters() {
  state.filters = { available: false, completed: false, blocked: false };
  changed();
}

function setOpen(open, returnFocus = false) {
  state.open = open;
  renderFilter();
  if (open) $('filter-menu').querySelector('input').focus();
  else if (returnFocus) $('filter-toggle').focus();
}

function renderFilter() {
  const all = heroes();
  const counts = {
    available: all.filter(isAvailable).length,
    completed: all.filter((h) => h.isCompleted).length,
    blocked: all.filter((h) => h.isBlocked).length,
  };
  const active = Object.keys(state.filters).filter((k) => state.filters[k]);

  document.querySelectorAll('[data-filter]').forEach((box) => {
    box.checked = state.filters[box.dataset.filter];
  });
  document.querySelectorAll('[data-count]').forEach((el) => {
    el.textContent = counts[el.dataset.count];
  });

  const label = active.length === 0 ? 'Filter'
    : active.length === 1 ? active[0][0].toUpperCase() + active[0].slice(1)
    : `${active.length} filters`;
  $('filter-label').textContent = label;
  $('filter-toggle').classList.toggle('active', active.length > 0);
  $('filter-toggle').setAttribute('aria-expanded', String(state.open));
  $('filter-menu').hidden = !state.open;
  $('filter-backdrop').hidden = !state.open;
}

// Search box and filter menu. The search input is never re-created, so it
// keeps focus and caret position.
export function mountHeroFilter() {
  $('search').addEventListener('input', (e) => {
    state.query = e.target.value;
    changed();
  });

  $('filter-toggle').addEventListener('click', () => setOpen(!state.open));
  $('filter-backdrop').addEventListener('click', () => setOpen(false));
  $('filter-clear').addEventListener('click', clearFilters);

  document.querySelectorAll('[data-filter]').forEach((box) => {
    box.addEventListener('change', () => {
      state.filters[box.dataset.filter] = box.checked;
      changed();
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && state.open) setOpen(false, true);
  });

  subscribe(renderFilter);
  renderFilter();
}
