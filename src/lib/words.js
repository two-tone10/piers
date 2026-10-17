const DAY = 24 * 60 * 60 * 1000;

export const name = (handle) => (handle ? handle.charAt(0).toUpperCase() + handle.slice(1) : 'Someone');

const ORDINALS = ['', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth'];
export const ordinal = (n) => ORDINALS[n] ?? `${n}th`;

export function daysLeft(expiresAt, now) {
  const n = Math.max(Math.ceil((new Date(expiresAt) - new Date(now)) / DAY), 0);
  return n === 1 ? '1 day left' : `${n} days left`;
}

export function witnessLine(members) {
  const names = members.map((m) => name(m.handle));
  if (names.length === 0) return 'No witnesses yet.';
  if (names.length === 1) return `${names[0]} is your witness.`;
  return `${names[0]} and ${names[1]} are your witnesses.`;
}

const PAST = {
  run: 'ran', walk: 'walked', read: 'read', cook: 'cooked', write: 'wrote', call: 'called',
  practice: 'practiced', go: 'went', meditate: 'meditated', study: 'studied', swim: 'swam',
  stretch: 'stretched', draw: 'drew', paint: 'painted', lift: 'lifted', bike: 'biked', cycle: 'cycled',
};

export function doneLabel(goal) {
  const verb = String(goal).trim().split(/\s+/)[0]?.toLowerCase();
  return PAST[verb] ? `I ${PAST[verb]} today` : 'Done today';
}

export function didYou(goal) {
  const g = String(goal).trim().replace(/[.!?]+$/, '');
  return `Did you ${g.charAt(0).toLowerCase()}${g.slice(1)}?`;
}

export const RESULT_LABELS = { yes: 'Yes', partly: 'Partly', no: 'No' };
