import { subscribe } from '../../store/core.js';
import { heroByName } from '../../store/queries.js';
import {
  queue,
  pending,
  subscribe as subscribeToQueue,
  remove as removeFromQueue,
  play,
  playNext,
  canPlay,
  canAccept,
  kindOf,
  accept,
} from '../../store/queue.js';
import { heroIconUrl } from '../../utils/assets.js';
import { $, el, createActionButton } from '../../utils/dom.js';
import { formatAmount } from '../../utils/format.js';
import { createHeroPicker } from './hero-picker.js';

// Pending requests sit above the queue until accepted or declined; only the
// accepted queue reaches the overlay.
export function mountQueuePanel() {
  $('queue-play-next').addEventListener('click', playNext);

  subscribeToQueue(render);
  subscribe(render); // rows show hero icons, which come from the roster
  render();
}

function render() {
  const items = queue();
  const waiting = pending();

  $('queue-pending').replaceChildren(...waiting.map(createQueueItem));
  $('queue-pending-count').textContent = `(${waiting.length})`;
  $('queue-pending-section').hidden = waiting.length === 0;

  $('queue-list').replaceChildren(...items.map(createQueueItem));
  $('queue-empty').hidden = items.length > 0 || waiting.length > 0;
  $('queue-play-next').disabled = !items.some(canPlay);
}

function createQueueItem(item) {
  const hero = heroByName(item.hero);
  const isPending = item.status === 'pending';
  const isUncomplete = kindOf(item) === 'uncomplete';

  const row = el('li', 'queue-item');
  row.classList.toggle('unmatched', !hero);
  row.classList.toggle('pending', isPending);

  const icon = hero
    ? el('img', 'queue-icon', { src: heroIconUrl(hero), alt: '' })
    : el('div', 'queue-icon', { textContent: '?' });
  if (!hero) icon.setAttribute('aria-hidden', 'true');

  const name = el('span', 'queue-name', { textContent: hero ? hero.name : 'No match' });
  if (isUncomplete) name.appendChild(el('span', 'queue-test queue-uncomplete', { textContent: 'Un-complete' }));
  if (item.test) name.appendChild(el('span', 'queue-test', { textContent: 'Test' }));

  const text = el('div', 'queue-text', {},
    name,
    el('span', 'queue-message', { textContent: item.rawText ? `“${item.rawText}”` : 'No message' }),
    el('span', 'queue-donor', {
      textContent: [item.donor, formatAmount(item.amount)].filter(Boolean).join(' · '),
    }),
  );

  const actions = el('div', 'queue-actions', {}, createHeroPicker(item));
  if (isPending) {
    actions.append(
      createActionButton(isUncomplete ? 'Un-complete' : 'Accept', 'btn queue-play', () => accept(item.eventId), !canAccept(item)),
      createActionButton('Decline', 'btn btn-outline', () => removeFromQueue(item.eventId)),
    );
  } else {
    actions.append(
      createActionButton('Play', 'btn queue-play', () => play(item.eventId), !canPlay(item)),
      createActionButton('Remove', 'btn btn-outline', () => removeFromQueue(item.eventId)),
    );
  }

  row.append(icon, text, actions);
  return row;
}
