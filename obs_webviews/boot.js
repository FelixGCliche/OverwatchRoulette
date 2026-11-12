import { seedHeroes } from '../store/seed.js';
import { showLoadError } from '../utils/dom.js';

// Seeds the hero data, then runs `mount`. Shows an error in <main> if either fails.
export async function bootOverlay(mount) {
  try {
    await seedHeroes();
    await mount();
  } catch (error) {
    console.error('Error loading heroes:', error);
    showLoadError();
  }
}
