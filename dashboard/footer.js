import { heroes } from '../store/queries.js';
import { selectRandomHero, importHeroes, resetHeroes } from '../store/mutations.js';
import { $ } from '../utils/dom.js';

// Footer actions: random pick, the "More" menu (small viewports), and
// JSON save / load / reset.
let menuOpen = false;

export function mountFooter() {
  $('select-random').addEventListener('click', selectRandomHero);
  $('more-toggle').addEventListener('click', () => {
    menuOpen = !menuOpen;
    renderMenu();
  });
  $('save-json').addEventListener('click', saveJSON);
  $('load-json').addEventListener('click', loadJSON);
  $('reset').addEventListener('click', reset);
  renderMenu();
}

function renderMenu() {
  $('more-actions').classList.toggle('open', menuOpen);
  $('more-toggle').textContent = menuOpen ? 'Close' : 'More';
  $('more-toggle').setAttribute('aria-expanded', String(menuOpen));
}

function saveJSON() {
  const heroData = JSON.stringify(heroes(), null, 2);
  const blob = new Blob([heroData], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = 'OverwatchRoulette.json';
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 100);
  console.log('JSON saved');
}

function loadJSON() {
  if (!confirm('You will lose your current data. Continue?')) return;

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.json';

  fileInput.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      // Parsing and validation happen inside the async callback, so the
      // try/catch has to live here to catch them.
      try {
        const data = JSON.parse(event.target.result);
        importHeroes(data);
        console.log('Heroes loaded:', data.length);
      } catch (error) {
        console.error('Error loading hero data:', error);
        alert('Failed to parse hero data. Please check the file format.');
      }
    };
    reader.onerror = () => {
      console.error('Failed to read file');
    };
    reader.readAsText(file);
  };

  fileInput.click();
}

// Restores every hero from assets/heroes.json, discarding all progress.
async function reset() {
  if (!confirm('You will lose your current data. Continue?')) return;

  try {
    await resetHeroes();
  } catch (error) {
    console.error('Error resetting heroes:', error);
    alert('Failed to reset heroes. Please check that assets/heroes.json is reachable.');
  }
}
