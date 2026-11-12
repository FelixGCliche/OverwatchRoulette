// Matches free text from a donation message to a hero name in the roster.
// Pure: takes the roster names, never reads storage.
//
// Order: exact -> alias -> prefix (unique) -> Levenshtein <= 2 (unique best).
// If the whole message doesn't match, each word and word pair is tried with
// exact and alias only ("please play mercy" -> Mercy). Returns null otherwise.

// MVP-SHORTCUT(MVP-11): hand-written aliases and fuzzy match; unmatched needs manual pick

// Lowercase, accents stripped (NFD), punctuation turned into spaces.
export const normalize = (text) =>
  String(text)
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

// Spaces dropped too, so "soldier 76", "soldier76" and "Soldier: 76" compare equal.
const compact = (text) => normalize(text).replace(/ /g, '');

// Compact alias -> compact hero name. Targets missing from the roster are skipped.
const ALIASES = {
  soldier: 'soldier76',
  soldat: 'soldier76',
  s76: 'soldier76',
  76: 'soldier76',
  lucio: 'lucio',
  torb: 'torbjorn',
  diva: 'dva',
  hana: 'dva',
  jq: 'junkerqueen',
  queen: 'junkerqueen',
  rat: 'junkrat',
  rein: 'reinhardt',
  hog: 'roadhog',
  ball: 'wreckingball',
  hammond: 'wreckingball',
  wrecking: 'wreckingball',
  widow: 'widowmaker',
  mccree: 'cassidy',
  cass: 'cassidy',
  zen: 'zenyatta',
  brig: 'brigitte',
  bap: 'baptiste',
  sym: 'symmetra',
  sym3: 'symmetra',
  doom: 'doomfist',
  rama: 'ramattra',
  lw: 'lifeweaver',
  weaver: 'lifeweaver',
  kiri: 'kiriko',
  sojo: 'sojourn',
  monkey: 'winston',
  cat: 'jetpackcat',
  jetpack: 'jetpackcat',
  phara: 'pharah',
};

const MIN_PREFIX_LENGTH = 3;

// Short words get a tighter distance, so "me" or "abc" don't match a hero.
const maxDistance = (length) => (length < 3 ? 0 : length < 5 ? 1 : 2);

export function levenshtein(a, b) {
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost);
    }
    previous = current;
  }
  return previous[b.length];
}

// Returns the only element of `list`, or null when there are zero or several.
const unique = (list) => (list.length === 1 ? list[0] : null);

function matchExactOrAlias(key, roster) {
  const exact = roster.find((hero) => hero.key === key);
  if (exact) return exact.name;
  const target = ALIASES[key];
  return target ? roster.find((hero) => hero.key === target)?.name ?? null : null;
}

function matchFuzzy(key, roster) {
  if (key.length >= MIN_PREFIX_LENGTH) {
    const prefixed = unique(roster.filter((hero) => hero.key.startsWith(key)));
    if (prefixed) return prefixed.name;
  }

  const scored = roster.map((hero) => ({ name: hero.name, distance: levenshtein(key, hero.key) }));
  const best = Math.min(...scored.map((s) => s.distance));
  if (best > maxDistance(key.length)) return null;
  return unique(scored.filter((s) => s.distance === best))?.name ?? null;
}

// Words and adjacent word pairs, longest first.
function candidates(text) {
  const words = normalize(text).split(' ').filter(Boolean);
  const pairs = words.slice(1).map((word, i) => words[i] + word);
  return [...pairs, ...words];
}

// `names` is the roster (e.g. heroes().map((h) => h.name)). Returns a name
// from `names`, or null.
export function matchHero(text, names) {
  const key = compact(text ?? '');
  if (!key || names.length === 0) return null;
  const roster = names.map((name) => ({ name, key: compact(name) }));

  const whole = matchExactOrAlias(key, roster) ?? matchFuzzy(key, roster);
  if (whole) return whole;

  const found = new Set(candidates(text).map((word) => matchExactOrAlias(word, roster)).filter(Boolean));
  return found.size === 1 ? [...found][0] : null;
}
