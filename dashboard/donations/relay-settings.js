import { enqueue, itemFromEvent } from '../../store/queue.js';
import {
  connectRelay,
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

// Connection URL + incentive ID forms, the status pill, and the relay socket
// that feeds the request queue.
export function mountRelaySettings() {
  $('relay-form').addEventListener('submit', saveUrl);
  $('incentive-form').addEventListener('submit', saveIncentives);

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

function renderStatus(status) {
  $('relay-status').dataset.status = status;
  $('relay-status-text').textContent = STATUS_TEXT[status];
}
