import { bootOverlay } from '../boot.js';
import { mountHeroGrid } from '../../components/hero-grid/hero-grid.js';
import { mountCurrentHero } from '../../components/current-hero/current-hero.js';
import { mountHeroQueue } from '../../components/hero-queue/hero-queue.js';
import { watchSpin } from '../../components/hero-wheel/spin-state.js';
import { connectQueueRelay } from '../queue-relay.js';

await bootOverlay(() => {
  mountHeroGrid(document.getElementById('hero-grid'));
  mountCurrentHero(document.getElementById('current-hero'));
  mountHeroQueue(document.getElementById('hero-queue'));
  connectQueueRelay();
  watchSpin((spinning) => document.body.classList.toggle('wheel-spinning', spinning));
});
