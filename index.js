/** ============================================================
  OVERWATCH HERO ROULETTE: control panel entry point.
  Each panel lives in dashboard/ and owns its own DOM and state;
  this file only seeds the data and mounts them.
  ============================================================ */

import { seedHeroes } from './store/seed.js';
import { showLoadError } from './utils/dom.js';
import { mountCurrentHeroHeader } from './dashboard/heroes/current-hero-header.js';
import { mountHeroFilter } from './dashboard/heroes/hero-filter.js';
import { mountHeroList } from './dashboard/heroes/hero-list.js';
import { mountHeroDock } from './dashboard/heroes/hero-dock.js';
import { mountQueuePanel } from './dashboard/donations/queue-panel.js';
import { mountRelaySettings } from './dashboard/donations/relay-settings.js';
import { mountFooter } from './dashboard/footer.js';

async function init() {
  try {
    await seedHeroes();

    mountCurrentHeroHeader();
    // The dock mounts before the filter so Escape closes the sheet first.
    mountHeroDock();
    mountHeroFilter();
    mountHeroList();
    mountQueuePanel();
    mountRelaySettings();
    mountFooter();
  } catch (error) {
    console.error('Error loading hero data:', error);
    showLoadError();
  }
}

document.addEventListener('DOMContentLoaded', init);
