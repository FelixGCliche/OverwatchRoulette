import { enqueue, itemFromEvent, onHandled } from '../../store/queue.js';
import {
  connectRelay,
  fetchPendingRequests,
  markFulfilled,
  relayUrl,
  hasRelayParam,
  saveRelayUrl,
  watchSavedRelayUrl,
  heroIncentiveId,
  saveHeroIncentiveId,
  watchHeroIncentiveId,
  uncompleteIncentiveId,
  saveUncompleteIncentiveId,
  watchUncompleteIncentiveId,
} from '../../relay/client.js';
import { $ } from '../../utils/dom.js';

const STATUS_TEXT = {
  connecting: 'Connecting',
  open: 'Live',
  reconnecting: 'Reconnecting',
  closed: 'Not connected',
};

let relay = null;

// Connection URL + incentive ID forms, the status pill, the relay socket
// that feeds the request queue, and the "Refresh requests" button.
//
// Only the dashboard marks requests fulfilled in the dock: the OBS pages
// connect to the relay too, but never accept or decline.
export function mountRelaySettings() {
  $('relay-form').addEventListener('submit', saveUrl);
  $('incentive-form').addEventListener('submit', saveIncentives);
  $('queue-refresh').addEventListener('click', refreshRequests);
  onHandled((item) => {
    if (!item.test) markFulfilled(relayUrl(), [item.eventId]);
  });

  $('hero-incentive').value = heroIncentiveId() ?? '';
  watchHeroIncentiveId((id) => {
    $('hero-incentive').value = id ?? '';
  });
  $('uncomplete-incentive').value = uncompleteIncentiveId() ?? '';
  watchUncompleteIncentiveId((id) => {
    $('uncomplete-incentive').value = id ?? '';
  });

  $('relay-url').value = relayUrl() ?? '';
  connect(relayUrl());
  if (!hasRelayParam()) {
    watchSavedRelayUrl((url) => {
      $('relay-url').value = url ?? '';
      connect(url);
    });
  }
}

// Every page that connects enqueues what it receives; enqueue drops duplicates.
function connect(url) {
  relay?.close();
  relay = connectRelay(url);
  relay.onStatus(renderStatus);
  relay.onEvent((event, kind) => enqueue(itemFromEvent(event, kind)));
  renderStatus(relay.status());
}

function saveUrl(e) {
  e.preventDefault();
  try {
    saveRelayUrl($('relay-url').value);
  } catch {
    alert('Invalid connection URL. It should look like wss://<host>/api/channel/<key>.');
    return;
  }
  connect(relayUrl());
}

// The relay client reads the IDs at each event, so no reconnect is needed.
function saveIncentives(e) {
  e.preventDefault();
  try {
    saveHeroIncentiveId($('hero-incentive').value);
    saveUncompleteIncentiveId($('uncomplete-incentive').value);
  } catch {
    alert('Could not save the incentive IDs.');
    return;
  }
  $('hero-incentive').value = heroIncentiveId() ?? '';
  $('uncomplete-incentive').value = uncompleteIncentiveId() ?? '';
}

// Pulls every redemption the dock hasn't marked fulfilled (not only the
// relay's replay window) and queues it as pending. enqueue skips items
// already queued or handled.
async function refreshRequests() {
  const button = $('queue-refresh');
  const status = $('queue-refresh-status');
  button.disabled = true;
  status.textContent = 'Refreshing…';
  delete status.dataset.error;
  try {
    const results = await fetchPendingRequests(relayUrl());
    const added = results.filter(({ event, kind }) => enqueue(itemFromEvent(event, kind))).length;
    status.textContent = added === 0 ? 'No new requests' : `Added ${added} request${added === 1 ? '' : 's'}`;
  } catch (error) {
    console.warn('[relay:pending]', error);
    status.textContent = error instanceof Error ? error.message : 'Refresh failed.';
    status.dataset.error = '';
  } finally {
    button.disabled = false;
  }
}

function renderStatus(status) {
  $('relay-status').dataset.status = status;
  $('relay-status-text').textContent = STATUS_TEXT[status];
}
