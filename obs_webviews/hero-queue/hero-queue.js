import { bootOverlay } from '../boot.js';
import { enqueue, itemFromEvent } from '../../store/queue.js';
import { mountHeroQueue } from '../../components/hero-queue/hero-queue.js';
import { connectRelay, relayUrl, hasRelayParam, watchSavedRelayUrl } from '../../relay/client.js';

// Every page that connects enqueues what it receives; enqueue drops duplicates.
let client = null;

function Connect(url) {
  client?.close();
  client = connectRelay(url);
  client.onEvent((event, kind) => enqueue(itemFromEvent(event, kind)));
}

await bootOverlay(() => {
  mountHeroQueue(document.getElementById('hero-queue'));
  Connect(relayUrl());
  // A ?relay= param pins the URL; otherwise follow the one saved on the dashboard.
  if (!hasRelayParam()) watchSavedRelayUrl(Connect);
});
