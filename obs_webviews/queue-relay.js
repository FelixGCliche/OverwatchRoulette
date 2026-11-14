import { enqueue, itemFromEvent } from '../store/queue.js';
import { connectRelay, relayUrl, hasRelayParam, watchSavedRelayUrl } from '../relay/client.js';

// Connects to the donation relay and enqueues what it receives. Every overlay
// page showing the queue does this; enqueue drops duplicates. A ?relay= param
// pins the URL; otherwise this follows the one saved on the dashboard.
export function connectQueueRelay() {
  let client = null;

  function Connect(url) {
    client?.close();
    client = connectRelay(url);
    client.onEvent((event, kind) => enqueue(itemFromEvent(event, kind)));
  }

  Connect(relayUrl());
  if (!hasRelayParam()) watchSavedRelayUrl(Connect);
}
