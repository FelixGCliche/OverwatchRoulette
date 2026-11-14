import { bootOverlay } from '../boot.js';
import { mountHeroQueue } from '../../components/hero-queue/hero-queue.js';
import { connectQueueRelay } from '../queue-relay.js';

await bootOverlay(() => {
  mountHeroQueue(document.getElementById('hero-queue'));
  connectQueueRelay();
});
