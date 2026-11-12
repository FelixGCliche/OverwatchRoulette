import { subscribe as subscribeToHeroes } from '../../store/core.js';
import { heroes } from '../../store/queries.js';
import { queue, subscribe as subscribeToQueue } from '../../store/queue.js';
import { formatAmount } from '../../utils/format.js';

const HERO_ICON_PATH = new URL('../../assets/heroes_images/', import.meta.url).href;

// Upcoming requests shown at once; the rest is summarized as "+N more".
const MAX_SHOWN = 3;

// Mounts the hero request queue into `el`. Renders from localStorage on mount,
// then again on every queue or hero change (the dashboard and the relay write
// from other pages, so this also arrives via the storage event). Only accepted
// requests are shown; pending ones stay on the dashboard. `el` is hidden while
// the queue is empty.
export function mountHeroQueue(el) {
  const title = document.createElement('div');
  title.className = 'hero-queue-title';
  title.textContent = 'Hero requests';

  const list = document.createElement('ol');
  list.className = 'hero-queue-list';

  const more = document.createElement('div');
  more.className = 'hero-queue-more';

  el.classList.add('hero-queue');
  el.append(title, list, more);

  function Render() {
    const items = queue();
    el.hidden = items.length === 0;
    list.textContent = '';
    if (items.length === 0) return;

    const roster = heroes();
    items.slice(0, MAX_SHOWN).forEach((item) => {
      list.appendChild(CreateItem(item, roster.find((h) => h.name === item.hero)));
    });
    const hiddenCount = items.length - MAX_SHOWN;
    more.hidden = hiddenCount <= 0;
    more.textContent = `+${hiddenCount} more`;
  }

  function CreateItem(item, hero) {
    const row = document.createElement('li');
    row.className = 'hero-queue-item';
    row.classList.toggle('unmatched', !hero);

    const icon = document.createElement(hero ? 'img' : 'div');
    icon.className = 'hero-queue-icon';
    if (hero) {
      icon.src = HERO_ICON_PATH + hero.image;
      icon.alt = hero.name;
    } else {
      icon.textContent = '?';
    }

    const name = document.createElement('div');
    name.className = 'hero-queue-name';
    // The raw message is not shown on stream; the streamer picks the hero.
    name.textContent = hero ? hero.name : 'Hero to pick';

    const donor = document.createElement('div');
    donor.className = 'hero-queue-donor';
    donor.textContent = [item.donor, formatAmount(item.amount)].filter(Boolean).join(' · ');

    const text = document.createElement('div');
    text.className = 'hero-queue-text';
    text.append(name, donor);

    row.append(icon, text);

    if (item.test) {
      const badge = document.createElement('span');
      badge.className = 'hero-queue-test';
      badge.textContent = 'Test';
      row.appendChild(badge);
    }
    return row;
  }

  subscribeToQueue(Render);
  subscribeToHeroes(Render);
  Render();
}
