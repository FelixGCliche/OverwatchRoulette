import { subscribe } from '../../store/core.js';
import { currentHero, heroes, isAvailable } from '../../store/queries.js';
import { selectRandomHero, recordWin, recordLoss } from '../../store/mutations.js';
import { heroIconUrl, roleIconUrl } from '../../utils/assets.js';
import { $ } from '../../utils/dom.js';

// Current hero card with win/loss buttons, or a "select a hero" banner.
export function mountCurrentHeroHeader() {
  $('current-hero-win-btn').addEventListener('click', recordWin);
  $('current-hero-lost-btn').addEventListener('click', recordLoss);
  $('banner-random').addEventListener('click', selectRandomHero);

  subscribe(render);
  render();
}

function render() {
  const hero = currentHero();
  $('current-hero').hidden = !hero;
  $('banner').hidden = !!hero;

  if (!hero) {
    const none = !heroes().some(isAvailable);
    $('banner-text').textContent = none ? 'No more hero to select' : 'No hero selected';
    $('banner-random').disabled = none;
    return;
  }

  const icon = $('current-hero-icon');
  icon.src = heroIconUrl(hero);
  icon.alt = hero.name;

  $('current-hero-role-icon').src = roleIconUrl(hero.role);
  $('current-hero-role-name').textContent = hero.role;
  $('current-hero-name').textContent = hero.name;

  $('current-hero-lost-streak').textContent = `Lost streak: ${hero.currentLostStreak}`;
  $('current-hero-lost').textContent = `Lost: ${hero.lost}`;
  $('current-hero-win').textContent = `Wins: ${hero.win ?? 0}`;
}
