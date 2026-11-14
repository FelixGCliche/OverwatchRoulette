import { subscribe as subscribeToHeroes } from '../../store/core.js';
import { heroByName } from '../../store/queries.js';
import { queue, subscribe as subscribeToQueue } from '../../store/queue.js';
import { heroIconUrl } from '../../utils/assets.js';


// Upcoming requests shown at once; the rest is summarized as "+N".
const MAX_SHOWN = 3;

// Mounts the hero request queue into `el`: a row of hero icons, each labelled
// with the donor's name (incentives are a fixed price, so the amount is not
// shown). Renders from localStorage on mount, then again on every queue or
// hero change (the dashboard and the relay write from other pages, so this
// also arrives via the storage event). Only accepted requests are shown;
// pending ones stay on the dashboard. `el` is hidden while the queue is empty.
export function mountHeroQueue(el) {
  const list = document.createElement('ol');
  list.className = 'hero-queue-list';

  const more = document.createElement('div');
  more.className = 'hero-queue-more';

  el.classList.add('hero-queue');
  el.append(list, more);

  // Event ids already on screen; only items not in here animate in.
  let shown = null;

  function Render() {
    const items = queue();
    el.hidden = items.length === 0;
    list.textContent = '';
    if (items.length === 0) return;

    const visible = items.slice(0, MAX_SHOWN);
    visible.forEach((item, index) => {
      const row = CreateItem(item, heroByName(item.hero), index === 0);
      // No animation on the first render, so a page load doesn't replay it.
      if (shown && !shown.has(item.eventId)) row.classList.add('entering');
      list.appendChild(row);
    });
    shown = new Set(visible.map((item) => item.eventId));
    const hiddenCount = items.length - MAX_SHOWN;
    more.hidden = hiddenCount <= 0;
    more.textContent = `+${hiddenCount}`;
  }

  function CreateItem(item, hero, isNext) {
    const row = document.createElement('li');
    row.className = 'hero-queue-item';
    row.classList.toggle('unmatched', !hero);

    const icon = document.createElement(hero ? 'img' : 'div');
    icon.className = 'hero-queue-icon';
    if (hero) {
      icon.src = heroIconUrl(hero);
      icon.alt = hero.name;
    } else {
      // The raw message is not shown on stream; the streamer picks the hero.
      icon.textContent = '?';
    }

    row.append(icon);
    // Only the next request is labelled with its donor.
    if (isNext) {
      const donor = document.createElement('div');
      donor.className = 'hero-queue-donor';
      donor.textContent = item.donor || 'Anonymous';
      row.append(donor);
    }
    return row;
  }

  subscribeToQueue(Render);
  subscribeToHeroes(Render);
  Render();
}
