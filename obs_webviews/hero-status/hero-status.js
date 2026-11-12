import { bootOverlay } from '../boot.js';
import { mountHeroGrid } from '../../components/hero-grid/hero-grid.js';
import { mountCurrentHero } from '../../components/current-hero/current-hero.js';
import { watchSpin } from '../../components/hero-wheel/spin-state.js';

await bootOverlay(() => {
  mountHeroGrid(document.getElementById('hero-grid'));
  mountCurrentHero(document.getElementById('current-hero'));
  watchSpin((spinning) => document.body.classList.toggle('wheel-spinning', spinning));
});
