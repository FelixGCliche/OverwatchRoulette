import { seedHeroes } from '../../store/seed.js';
import { mountHeroWheel } from '../../components/hero-wheel/hero-wheel.js';

try {
  await seedHeroes();
  mountHeroWheel(document.getElementById('hero-wheel'));
} catch (error) {
  console.error('Error loading heroes:', error);
  document.querySelector('main').innerHTML = '<p style="color: #e74c3c;">Error loading hero data</p>';
}
