import { seedHeroes } from '../../store/seed.js';
import { mountLostStreak } from '../../components/lost-streak/lost-streak.js';

try {
  await seedHeroes();
  mountLostStreak(document.getElementById('lost-streak'));
} catch (error) {
  console.error('Error loading heroes:', error);
  document.querySelector('main').innerHTML = '<p style="color: #e74c3c;">Error loading hero data</p>';
}
