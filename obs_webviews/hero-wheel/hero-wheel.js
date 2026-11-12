import { bootOverlay } from '../boot.js';
import { mountHeroWheel } from '../../components/hero-wheel/hero-wheel.js';

await bootOverlay(() => mountHeroWheel(document.getElementById('hero-wheel')));
