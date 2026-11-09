import { seedHeroes } from '../../store/seed.js';
import { mountHeroGrid } from '../../components/hero-grid/hero-grid.js';
import { mountCurrentHero } from '../../components/current-hero/current-hero.js';
import { watchSpin } from '../../components/hero-wheel/spin-state.js';

try {
  await seedHeroes();
  mountHeroGrid(document.getElementById('hero-grid'));
  mountCurrentHero(document.getElementById('current-hero'));
  watchSpin((spinning) => document.body.classList.toggle('wheel-spinning', spinning));
} catch (error) {
  console.error('Error loading heroes:', error);
  document.querySelector('main').innerHTML = '<p style="color: #e74c3c;">Error loading hero data</p>';
}
