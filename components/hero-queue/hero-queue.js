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
  const title = document.createElement('div');
  title.className = 'hero-queue-title';
  title.textContent = 'Up next:';

  const list = document.createElement('ol');
  list.className = 'hero-queue-list';

  const more = document.createElement('div');
  more.className = 'hero-queue-more';

  el.classList.add('hero-queue');
  // Label for the next request; a sibling of the list so it can sit in the
  // grid cell under the other icons.
  const donor = document.createElement('div');
  donor.className = 'hero-queue-donor';

  el.append(title, list, donor, more);

  // Event ids already on screen; only items not in here animate in.
  let shown = null;
  // True while removed items fade out; renders meanwhile wait for it to end.
  let leaving = false;

  function Render() {
    if (leaving) return;
    const items = queue();
    if (FadeOutRemoved(items)) return;

    el.hidden = items.length === 0;
    list.textContent = '';
    if (items.length === 0) return;

    const visible = items.slice(0, MAX_SHOWN);
    donor.textContent = visible[0].donor || 'Anonymous';
    visible.forEach((item) => {
      const row = CreateItem(item, heroByName(item.hero));
      // No animation on the first render, so a page load doesn't replay it.
      if (shown && !shown.has(item.eventId)) row.classList.add('entering');
      list.appendChild(row);
    });
    shown = new Set(visible.map((item) => item.eventId));
    const hiddenCount = items.length - MAX_SHOWN;
    more.hidden = hiddenCount <= 0;
    more.textContent = `+${hiddenCount}`;
  }

  // Fades out the rows on screen whose request left the queue (played or
  // removed), then renders the latest queue. The next request's donor fades
  // with it, and the whole box fades when the queue empties. Returns false
  // when nothing on screen left the queue, so Render can go on.
  function FadeOutRemoved(items) {
    if (el.hidden) return false;
    const ids = new Set(items.map((item) => item.eventId));
    const gone = [...list.children].filter((row) => !ids.has(row.dataset.eventId));
    if (gone.length === 0) return false;

    leaving = true;
    const faded = items.length === 0 ? [el] : gone;
    if (items.length > 0 && gone.includes(list.firstElementChild)) faded.push(donor);
    faded.forEach((node) => node.classList.add('leaving'));
    // Resolves at once when no animation runs (e.g. reduced motion).
    const animations = faded.flatMap((node) => node.getAnimations());
    Promise.all(animations.map((animation) => animation.finished.catch(() => {}))).then(() => {
      faded.forEach((node) => node.classList.remove('leaving'));
      leaving = false;
      Render();
    });
    return true;
  }

  function CreateItem(item, hero) {
    const row = document.createElement('li');
    row.className = 'hero-queue-item';
    row.dataset.eventId = item.eventId;
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
    return row;
  }

  subscribeToQueue(Render);
  subscribeToHeroes(Render);
  Render();
}
