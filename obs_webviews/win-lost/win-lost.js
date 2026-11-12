import { bootOverlay } from '../boot.js';
import { mountWinLost } from '../../components/win-lost/win-lost.js';

await bootOverlay(() => mountWinLost(document.getElementById('win-lost')));
