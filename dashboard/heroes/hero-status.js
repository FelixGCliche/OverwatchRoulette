import { heroState } from '../../store/queries.js';

const LABELS = { current: 'Playing now', completed: 'Completed', blocked: 'Blocked', available: 'Available' };

// Text shown under a hero's name. A hero that is both completed and blocked
// reads "Completed" here, while heroState (tile styling) ranks blocked first.
export function statusLabel(hero) {
  if (hero.isCurrent) return LABELS.current;
  if (hero.isCompleted) return LABELS.completed;
  if (hero.isBlocked) return LABELS.blocked;
  return LABELS[heroState(hero)];
}
