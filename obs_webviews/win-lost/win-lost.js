import { seedHeroes } from '../../store/seed.js';
import { mountWinLost } from '../../components/win-lost/win-lost.js';

try {
  await seedHeroes();
  mountWinLost(document.getElementById('win-lost'));
} catch (error) {
  console.error('Error loading heroes:', error);
  document.querySelector('main').innerHTML = '<p style="color: #e74c3c;">Error loading hero data</p>';
}
