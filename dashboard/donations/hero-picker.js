import { heroes } from '../../store/queries.js';
import { setHero } from '../../store/queue.js';

// Searchable hero picker shown on every queue item. It shows the item's hero,
// or prompts for a pick when nothing matched. On focus the box is emptied (the
// current hero stays as the placeholder) so the suggestion list shows every
// hero; typing filters it. Picking a roster name saves it; anything else
// restores the current hero on blur.
export function createHeroPicker(item) {
  const input = document.createElement('input');
  input.type = 'search';
  input.className = 'queue-pick';
  input.setAttribute('list', heroNameList().id);
  input.setAttribute('aria-label', `Hero for ${item.donor}`);
  input.autocomplete = 'off';
  input.spellcheck = false;
  const current = item.hero ?? '';
  input.value = current;
  input.placeholder = current || 'Search hero…';

  const commit = () => {
    const name = heroes().find((h) => h.name.toLowerCase() === input.value.trim().toLowerCase())?.name;
    if (name && name !== item.hero) setHero(item.eventId, name);
    else input.value = current;
  };
  input.addEventListener('focus', () => { input.value = ''; });
  // Clicking the box (even when already focused) opens the full hero list.
  input.addEventListener('click', () => {
    if (input.value !== '' && input.value !== current) return;
    input.value = '';
    try { input.showPicker?.(); } catch { /* picker needs a user gesture; ignore */ }
  });
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
function heroNameList() {
  let list = document.getElementById('hero-names');
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
