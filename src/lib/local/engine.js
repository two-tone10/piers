import { loadWorld, saveWorld } from './store';
import {
  BOT_HANDLES, BOT_GOALS, BOT_PULSE_NOTES, BOT_WORDS, SHORE_GREETINGS, SHORE_REPLIES,
  SHORE_PROPOSE_LINES, BOT_SUPPLIES, BOT_SIGNALS, BOT_ACKS,
} from './content';

const SEC = 1000;
const MIN = 60 * SEC;
const DAY = 24 * 60 * MIN;
const WEEK = 7 * DAY;
const MAX_WATCHING = 10;
const PULSE_KEYS = ['making_progress', 'pushing_through', 'stayed_the_course', 'rough_one'];

let W = null;
let loading = null;
let saveTimer = null;

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const rand = (a, b) => a + Math.random() * (b - a);
const uid = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
  const r = (Math.random() * 16) | 0;
  return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
});
const code = () => Array.from({ length: 6 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('');
const now = () => Date.now() + (W?.offset || 0);
const iso = (t) => new Date(t).toISOString();
const dayKey = (t) => iso(t).slice(0, 10);
const fail = (msg) => { throw new Error(msg); };

function emptyWorld() {
  return {
    v: 1, offset: 0, users: {}, voyages: [], members: [], signals: [], pulses: [],
    responses: [], shore: [], supplies: [], blocks: [], reports: [], events: [],
  };
}

async function ensure() {
  if (W) return;
  if (!loading) loading = loadWorld().then((w) => { W = w?.v === 1 ? w : emptyWorld(); });
  await loading;
}

function persist() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { saveWorld(W).catch(() => {}); }, 400);
}

// ── Lookups ───────────────────────────────────────────────────────────────────

const user = (id) => W.users[id];
const handleOf = (id) => user(id)?.handle ?? 'someone';
const voyage = (id) => W.voyages.find((v) => v.id === id);
const membersOf = (vid) => W.members.filter((m) => m.voyage_id === vid);
const memberOf = (vid, u) => W.members.find((m) => m.voyage_id === vid && m.user_id === u);
const seats = (v) => (v.mode === 'solo' ? 1 : 2);
const ended = (v) => v.status === 'returned' || v.status === 'lost';
const active = (v) => v.status === 'open' || v.status === 'underway';
const isBot = (id) => !!user(id)?.bot;
const blocked = (a, b) => W.blocks.some((x) => (x.blocker === a && x.blocked === b) || (x.blocker === b && x.blocked === a));
const watchCount = (u) => W.members.filter((m) => m.user_id === u && active(voyage(m.voyage_id) || {})).length;
const coPeer = (vid, u) => membersOf(vid).find((m) => m.user_id !== u)?.user_id;
const later = (ms, type, data) => W.events.push({ at: now() + ms, type, ...data });

function uidFromToken(token) {
  const u = Object.values(W.users).find((x) => x.session_token === token && !x.bot);
  return u?.id ?? fail('Not signed in.');
}

function userJson(u) {
  return { id: u.id, handle: u.handle, session_token: u.session_token, open_to_watch: !!u.open_to_watch, created_at: u.created_at };
}

function voyageJson(v) {
  const { reckoning, ...rest } = v;
  return { ...rest, handle: handleOf(v.user_id), member_count: membersOf(v.id).length };
}

// ── World building ────────────────────────────────────────────────────────────

function bot() {
  const used = new Set(Object.values(W.users).map((u) => u.handle));
  const free = BOT_HANDLES.filter((h) => !used.has(h));
  if (free.length) {
    const u = { id: uid(), handle: free[0], bot: true, created_at: iso(now()) };
    W.users[u.id] = u;
    return u;
  }
  return null;
}

function bots() {
  return Object.values(W.users).filter((u) => u.bot);
}

function freeBot(exclude = []) {
  const busy = new Set(W.voyages.filter(active).map((v) => v.user_id));
  const candidates = bots().filter((b) => !exclude.includes(b.id) && !busy.has(b.id));
  return candidates.length ? pick(candidates) : bot();
}

function peerBot(vid, exclude = []) {
  const taken = new Set([voyage(vid).user_id, ...membersOf(vid).map((m) => m.user_id), ...exclude]);
  const candidates = bots().filter((b) => !taken.has(b.id));
  return candidates.length ? pick(candidates) : bot();
}

function newVoyage(ownerId, { goal, obstacle, mode = 'pair', listed = true }) {
  const t = now();
  const v = {
    id: uid(), user_id: ownerId, goal, obstacle, status: 'open', mode, listed,
    invite_code: code(), created_at: iso(t), expires_at: iso(t + WEEK), started_at: null,
    claimed_at: null, completed_at: null, rest_days_used: 0, reckoning: null, reckoning_at: null,
  };
  W.voyages.push(v);
  return v;
}

function addMember(v, u) {
  W.members.push({ id: uid(), voyage_id: v.id, user_id: u, joined_at: iso(now()), acknowledged_at: null, acknowledgement: null });
}

function spawnBotVoyage({ mode } = {}) {
  const owner = freeBot();
  if (!owner) return null;
  const taken = new Set(W.voyages.filter(active).map((v) => v.goal));
  const g = pick(BOT_GOALS.filter((x) => !taken.has(x.goal)).concat(BOT_GOALS).slice(0, BOT_GOALS.length));
  const v = newVoyage(owner.id, { ...g, mode: mode || (Math.random() < 0.25 ? 'solo' : 'pair') });
  if (v.mode === 'pair' && Math.random() < 0.7) {
    const p = peerBot(v.id);
    if (p) addMember(v, p.id);
  }
  const me = Object.values(W.users).find((u) => !u.bot && u.open_to_watch);
  if (me && watchCount(me.id) < MAX_WATCHING && membersOf(v.id).length < seats(v) && Math.random() < 0.5) {
    addMember(v, me.id);
    onJoined(v, me.id);
  }
  maybeStart(v);
  return v;
}

function seedWorld() {
  for (let i = 0; i < 8; i++) bot();
  spawnBotVoyage({ mode: 'pair' });
  spawnBotVoyage({ mode: 'pair' });
  spawnBotVoyage({ mode: 'solo' });
  for (let i = 0; i < 2; i++) {
    const v = spawnBotVoyage({ mode: 'pair' });
    if (!v) continue;
    while (membersOf(v.id).length < 2) addMember(v, peerBot(v.id).id);
    maybeStart(v);
    if (i === 0) {
      v.status = 'returned';
      v.completed_at = iso(now() - 2 * DAY);
    }
  }
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────

function maybeStart(v) {
  if (v.status !== 'open' || membersOf(v.id).length < seats(v)) return;
  const t = now();
  v.status = 'underway';
  v.started_at = iso(t);
  v.expires_at = iso(t + WEEK);
  if (isBot(v.user_id)) {
    later(v.mode === 'solo' ? rand(3, 6) * MIN : rand(2, 5) * DAY, 'bot_claim', { voyage: v.id });
  } else if (v.mode === 'pair') {
    later(rand(40, 70) * SEC, 'bot_signal', { voyage: v.id });
    later(rand(1.5, 2.5) * MIN, 'bot_propose', { voyage: v.id, supply: BOT_SUPPLIES[0] });
    later(rand(4, 6) * MIN, 'bot_propose', { voyage: v.id, supply: BOT_SUPPLIES[3] });
    later(rand(8, 12) * MIN, 'bot_propose', { voyage: v.id, supply: pick([BOT_SUPPLIES[1], BOT_SUPPLIES[2]]) });
  } else {
    later(rand(40, 70) * SEC, 'bot_signal', { voyage: v.id });
  }
}

function onJoined(v, u) {
  const other = coPeer(v.id, u);
  if (other && isBot(other) && v.mode === 'pair') {
    later(rand(6, 12) * SEC, 'bot_shore', { voyage: v.id, from: other, body: pick(SHORE_GREETINGS) });
    later(rand(40, 80) * SEC, 'bot_propose', { voyage: v.id, from: other, supply: pick(BOT_SUPPLIES.slice(0, 3)) });
  }
  if (v.status === 'open' && membersOf(v.id).length < seats(v)) {
    later(rand(15, 40) * SEC, 'bot_join', { voyage: v.id });
  }
}

function finish(v) {
  v.status = 'returned';
  v.completed_at = iso(now());
  v.claimed_at = null;
  if (!isBot(v.user_id)) {
    membersOf(v.id).filter((m) => isBot(m.user_id)).forEach((m) => later(rand(15, 45) * SEC, 'bot_ack', { voyage: v.id, from: m.user_id }));
  }
}

function deliver(s) {
  s.status = 'delivered';
  s.delivered_at = iso(now());
  if (s.kind === 'extra_day') {
    const v = voyage(s.voyage_id);
    v.expires_at = iso(new Date(v.expires_at).getTime() + DAY);
  }
}

function propose(v, from, { kind, body = null, url = null }) {
  const s = {
    id: uid(), voyage_id: v.id, kind, body, url, status: 'proposed', proposed_by: from, cosigned_by: null,
    created_at: iso(now()), delivered_at: null, opened_at: null,
  };
  W.supplies.push(s);
  return s;
}

const handlers = {
  bot_join({ voyage: id }) {
    const v = voyage(id);
    if (!v || v.status !== 'open' || membersOf(id).length >= seats(v)) return;
    const b = peerBot(id);
    if (!b) return;
    addMember(v, b.id);
    const human = membersOf(id).find((m) => !isBot(m.user_id));
    maybeStart(v);
    if (human && v.mode === 'pair') onJoined(v, human.user_id);
  },
  bot_claim({ voyage: id }) {
    const v = voyage(id);
    if (!v || v.status !== 'underway') return;
    if (v.mode === 'solo') {
      v.claimed_at = iso(now());
      const peer = membersOf(id)[0];
      if (peer && isBot(peer.user_id)) later(20 * SEC, 'bot_confirm', { voyage: id });
    } else finish(v);
  },
  bot_confirm({ voyage: id }) {
    const v = voyage(id);
    if (v && v.status === 'underway' && v.claimed_at) finish(v);
  },
  bot_signal({ voyage: id }) {
    const v = voyage(id);
    const m = v && membersOf(id).find((x) => isBot(x.user_id));
    if (!m || ended(v)) return;
    const q = pick(BOT_SIGNALS);
    W.signals.push({ id: uid(), voyage_id: id, sender_id: m.user_id, quote: q.quote, author: q.author, created_at: iso(now()) });
  },
  bot_respond({ pulse: pid, from }) {
    if (W.responses.some((r) => r.pulse_id === pid && r.sender_id === from)) return;
    W.responses.push({ id: uid(), pulse_id: pid, sender_id: from, word: pick(BOT_WORDS), created_at: iso(now()) });
  },
  bot_shore({ voyage: id, from, body }) {
    const v = voyage(id);
    if (!v || !memberOf(id, from)) return;
    W.shore.push({ id: uid(), voyage_id: id, sender_id: from, body, created_at: iso(now()) });
  },
  bot_propose({ voyage: id, from, supply }) {
    const v = voyage(id);
    if (!v || v.mode !== 'pair' || ended(v)) return;
    const peers = membersOf(id).map((m) => m.user_id);
    if (peers.length < 2) return;
    const proposer = from || peers.find(isBot);
    if (!proposer || !peers.includes(proposer)) return;
    if (W.supplies.some((s) => s.voyage_id === id && s.kind === supply.kind && s.status !== 'declined')) return;
    const s = propose(v, proposer, supply);
    const other = peers.find((p) => p !== proposer);
    if (isBot(other)) later(rand(10, 30) * SEC, 'bot_cosign', { supply: s.id, from: other });
    else W.shore.push({ id: uid(), voyage_id: id, sender_id: proposer, body: SHORE_PROPOSE_LINES[s.kind], created_at: iso(now()) });
  },
  bot_cosign({ supply: sid, from }) {
    const s = W.supplies.find((x) => x.id === sid);
    if (!s || s.status !== 'proposed' || ended(voyage(s.voyage_id))) return;
    s.cosigned_by = from;
    deliver(s);
  },
  bot_ack({ voyage: id, from }) {
    const m = memberOf(id, from);
    if (!m || m.acknowledged_at) return;
    m.acknowledged_at = iso(now());
    m.acknowledgement = pick(BOT_ACKS);
  },
};

function tick() {
  const t = now();
  for (const v of W.voyages) {
    if (active(v) && new Date(v.expires_at).getTime() < t) {
      v.status = 'lost';
      if (!isBot(v.user_id)) finish(v), (v.status = 'lost'), (v.completed_at = null);
    }
  }
  W.events.sort((a, b) => a.at - b.at);
  while (W.events.length && W.events[0].at <= t) {
    const e = W.events.shift();
    try { handlers[e.type]?.(e); } catch (_) {}
  }
  const today = dayKey(t);
  for (const v of W.voyages) {
    if (v.status !== 'underway' || !isBot(v.user_id)) continue;
    if (W.pulses.some((p) => p.voyage_id === v.id && p.date_key === today)) continue;
    const p = { id: uid(), voyage_id: v.id, status: pick(PULSE_KEYS), note: pick(BOT_PULSE_NOTES), date_key: today, created_at: iso(t) };
    W.pulses.push(p);
    membersOf(v.id).filter((m) => isBot(m.user_id)).forEach((m) => later(rand(20, 120) * SEC, 'bot_respond', { pulse: p.id, from: m.user_id }));
  }
  const openBots = W.voyages.filter((v) => v.status === 'open' && v.listed && isBot(v.user_id) && membersOf(v.id).length < seats(v));
  for (let i = openBots.length; i < 3; i++) spawnBotVoyage();
  prune();
}

function prune() {
  const cutoff = now() - 21 * DAY;
  const drop = new Set(W.voyages.filter((v) => isBot(v.user_id) && ended(v) && new Date(v.completed_at || v.expires_at).getTime() < cutoff
    && !membersOf(v.id).some((m) => !isBot(m.user_id) && !m.acknowledged_at)).map((v) => v.id));
  if (!drop.size) return;
  const pulseIds = new Set(W.pulses.filter((p) => drop.has(p.voyage_id)).map((p) => p.id));
  W.voyages = W.voyages.filter((v) => !drop.has(v.id));
  for (const k of ['members', 'signals', 'pulses', 'shore', 'supplies']) W[k] = W[k].filter((x) => !drop.has(x.voyage_id));
  W.responses = W.responses.filter((r) => !pulseIds.has(r.pulse_id));
}

// ── Guards ────────────────────────────────────────────────────────────────────

function ownVoyage(me, id) {
  const v = voyage(id) ?? fail('Pier not found.');
  if (v.user_id !== me) fail('That isn\'t your goal.');
  return v;
}

function peerVoyage(me, id) {
  const v = voyage(id) ?? fail('Pier not found.');
  if (!memberOf(id, me)) fail('You\'re not on this pier.');
  return v;
}

function join(me, v) {
  if (v.user_id === me) fail('You can\'t stand on your own pier.');
  if (memberOf(v.id, me)) fail('You\'re already on this pier.');
  if (blocked(me, v.user_id)) fail('You can\'t join this pier.');
  if (v.status !== 'open' || membersOf(v.id).length >= seats(v)) fail('That pier is full.');
  if (watchCount(me) >= MAX_WATCHING) fail(`You're on ${MAX_WATCHING} piers. That's the limit until one ends.`);
  addMember(v, me);
  maybeStart(v);
  onJoined(v, me);
  return v.id;
}

// ── RPCs ──────────────────────────────────────────────────────────────────────

const rpcs = {
  piers_create_user({ p_handle }) {
    const h = String(p_handle || '').trim().slice(0, 40) || fail('Pick a handle.');
    if (Object.values(W.users).some((u) => u.handle.toLowerCase() === h.toLowerCase())) fail('That handle is taken.');
    if (!bots().length) seedWorld();
    const u = { id: uid(), handle: h, session_token: uid(), open_to_watch: false, created_at: iso(now()) };
    W.users[u.id] = u;
    return userJson(u);
  },
  piers_me({ p_token }) {
    const u = Object.values(W.users).find((x) => x.session_token === p_token && !x.bot);
    return u ? userJson(u) : null;
  },
  piers_set_open_to_watch({ p_token, p_on }) {
    const u = user(uidFromToken(p_token));
    u.open_to_watch = !!p_on;
    return userJson(u);
  },

  piers_cast_off({ p_token, p_goal, p_obstacle, p_mode, p_listed }) {
    const me = uidFromToken(p_token);
    if (W.voyages.some((v) => v.user_id === me && active(v))) fail('You already have a goal out.');
    if (!p_goal?.trim()) fail('Name your goal.');
    const v = newVoyage(me, { goal: p_goal.trim(), obstacle: p_obstacle?.trim() || null, mode: p_mode === 'solo' ? 'solo' : 'pair', listed: p_listed !== false });
    later(rand(12, 25) * SEC, 'bot_join', { voyage: v.id });
    if (v.mode === 'pair') later(rand(50, 90) * SEC, 'bot_join', { voyage: v.id });
    return voyageJson(v);
  },
  piers_go_with_one({ p_token, p_voyage }) {
    const v = ownVoyage(uidFromToken(p_token), p_voyage);
    if (v.status !== 'open' || membersOf(v.id).length !== 1) fail('You need exactly one peer to go with one.');
    v.mode = 'solo';
    maybeStart(v);
  },
  piers_set_listed({ p_token, p_voyage, p_listed }) {
    ownVoyage(uidFromToken(p_token), p_voyage).listed = !!p_listed;
  },
  piers_claim_done({ p_token, p_voyage }) {
    const v = ownVoyage(uidFromToken(p_token), p_voyage);
    if (v.status !== 'underway') fail('Your week hasn\'t started.');
    if (v.mode === 'solo') {
      v.claimed_at = iso(now());
      const peer = membersOf(v.id)[0];
      if (peer && isBot(peer.user_id)) later(rand(15, 30) * SEC, 'bot_confirm', { voyage: v.id });
    } else finish(v);
  },
  piers_confirm_done({ p_token, p_voyage, p_confirm }) {
    const v = peerVoyage(uidFromToken(p_token), p_voyage);
    if (v.mode !== 'solo' || v.status !== 'underway' || !v.claimed_at) fail('Nothing to confirm.');
    if (p_confirm) finish(v);
    else v.claimed_at = null;
  },
  piers_send_pulse({ p_token, p_voyage, p_status, p_note }) {
    const v = ownVoyage(uidFromToken(p_token), p_voyage);
    if (v.status !== 'underway') fail('Pulses open once your week starts.');
    const today = dayKey(now());
    if (W.pulses.some((p) => p.voyage_id === v.id && p.date_key === today)) fail('You already sent today\'s pulse.');
    if (p_status === 'rest_day') {
      if (restsLeft(v) <= 0) fail('No rest days left. Your peers can send one.');
      v.rest_days_used += 1;
    }
    const p = { id: uid(), voyage_id: v.id, status: p_status, note: p_note || null, date_key: today, created_at: iso(now()) };
    W.pulses.push(p);
    membersOf(v.id).filter((m) => isBot(m.user_id)).forEach((m) => later(rand(8, 40) * SEC, 'bot_respond', { pulse: p.id, from: m.user_id }));
  },
  piers_reckon({ p_token, p_voyage, p_text }) {
    const v = ownVoyage(uidFromToken(p_token), p_voyage);
    v.reckoning = p_text || null;
    v.reckoning_at = iso(now());
  },
  piers_open_supply({ p_token, p_supply }) {
    const me = uidFromToken(p_token);
    const s = W.supplies.find((x) => x.id === p_supply);
    if (s && voyage(s.voyage_id)?.user_id === me && !s.opened_at) s.opened_at = iso(now());
  },

  piers_join({ p_token, p_voyage }) {
    join(uidFromToken(p_token), voyage(p_voyage) ?? fail('Pier not found.'));
  },
  piers_join_code({ p_token, p_code }) {
    const c = String(p_code || '').trim().toUpperCase();
    const v = W.voyages.find((x) => x.invite_code === c && x.status === 'open') ?? fail('No open pier with that code.');
    return join(uidFromToken(p_token), v);
  },
  piers_join_random({ p_token }) {
    const me = uidFromToken(p_token);
    const pool = W.voyages.filter((v) => v.status === 'open' && v.listed && v.user_id !== me && !memberOf(v.id, me)
      && !blocked(me, v.user_id) && membersOf(v.id).length < seats(v));
    if (!pool.length) fail('No open piers right now.');
    return join(me, pick(pool));
  },
  piers_send_signal({ p_token, p_voyage, p_quote, p_author }) {
    const me = uidFromToken(p_token);
    const v = peerVoyage(me, p_voyage);
    if (ended(v)) fail('This week is over.');
    W.signals.push({ id: uid(), voyage_id: v.id, sender_id: me, quote: p_quote, author: p_author || null, created_at: iso(now()) });
  },
  piers_respond_pulse({ p_token, p_pulse, p_word }) {
    const me = uidFromToken(p_token);
    const p = W.pulses.find((x) => x.id === p_pulse) ?? fail('Pulse not found.');
    peerVoyage(me, p.voyage_id);
    if (W.responses.some((r) => r.pulse_id === p.id && r.sender_id === me)) fail('You already answered.');
    W.responses.push({ id: uid(), pulse_id: p.id, sender_id: me, word: p_word, created_at: iso(now()) });
  },
  piers_acknowledge({ p_token, p_voyage, p_text }) {
    const me = uidFromToken(p_token);
    const v = peerVoyage(me, p_voyage);
    if (!ended(v)) fail('You can acknowledge them when the week ends.');
    const m = memberOf(v.id, me);
    m.acknowledged_at = iso(now());
    m.acknowledgement = p_text;
  },
  piers_shore_send({ p_token, p_voyage, p_body }) {
    const me = uidFromToken(p_token);
    const v = peerVoyage(me, p_voyage);
    if (v.mode !== 'pair') fail('The Shore needs two peers.');
    const body = String(p_body || '').trim().slice(0, 500) || fail('Say something.');
    W.shore.push({ id: uid(), voyage_id: v.id, sender_id: me, body, created_at: iso(now()) });
    const other = coPeer(v.id, me);
    if (other && isBot(other)) {
      const wantsSupply = /send|give|rest|call|note|link|day|help/i.test(body);
      if (wantsSupply && !ended(v)) later(rand(8, 15) * SEC, 'bot_propose', { voyage: v.id, from: other, supply: pick(BOT_SUPPLIES) });
      else later(rand(6, 14) * SEC, 'bot_shore', { voyage: v.id, from: other, body: pick(SHORE_REPLIES) });
    }
  },
  piers_supply_propose({ p_token, p_voyage, p_kind, p_body, p_url }) {
    const me = uidFromToken(p_token);
    const v = peerVoyage(me, p_voyage);
    if (v.mode !== 'pair') fail('Supplies take two peers. This pier went with one.');
    if (ended(v)) fail('This week is over.');
    if ((p_kind === 'call' || p_kind === 'sealed_note') && !p_body?.trim()) fail('Add a few words.');
    if (p_kind === 'link' && !/^https?:\/\//i.test(p_url || '')) fail('Add a full link starting with https://');
    const s = propose(v, me, { kind: p_kind, body: p_body?.trim() || null, url: p_url?.trim() || null });
    const other = coPeer(v.id, me);
    if (other && isBot(other)) {
      later(rand(8, 18) * SEC, 'bot_cosign', { supply: s.id, from: other });
      later(rand(5, 8) * SEC, 'bot_shore', { voyage: v.id, from: other, body: 'Signing yours now.' });
    }
    return s.id;
  },
  piers_supply_cosign({ p_token, p_supply }) {
    const me = uidFromToken(p_token);
    const s = W.supplies.find((x) => x.id === p_supply) ?? fail('Supply not found.');
    const v = peerVoyage(me, s.voyage_id);
    if (s.proposed_by === me) fail('The other peer has to sign.');
    if (s.status !== 'proposed') fail('Already handled.');
    if (ended(v)) fail('This week is over.');
    s.cosigned_by = me;
    deliver(s);
  },
  piers_supply_decline({ p_token, p_supply }) {
    const me = uidFromToken(p_token);
    const s = W.supplies.find((x) => x.id === p_supply) ?? fail('Supply not found.');
    peerVoyage(me, s.voyage_id);
    if (s.status === 'proposed') s.status = 'declined';
  },

  piers_report({ p_token, p_target, p_voyage, p_message, p_reason }) {
    W.reports.push({ id: uid(), reporter: uidFromToken(p_token), target: p_target, voyage_id: p_voyage, message_id: p_message, reason: p_reason, created_at: iso(now()) });
  },
  piers_block({ p_token, p_target }) {
    const me = uidFromToken(p_token);
    if (!blocked(me, p_target)) W.blocks.push({ blocker: me, blocked: p_target, created_at: iso(now()) });
    W.members = W.members.filter((m) => {
      if (m.user_id !== me) return true;
      const v = voyage(m.voyage_id);
      return !(active(v) && (v.user_id === p_target || coPeer(v.id, me) === p_target));
    });
  },

  piers_home({ p_token }) {
    const me = uidFromToken(p_token);
    const mine = W.voyages.filter((v) => v.user_id === me);
    const current = mine.find(active);
    const reck = mine.filter((v) => ended(v) && !v.reckoning_at).pop();
    const watching = W.members.filter((m) => m.user_id === me).map((m) => ({ m, v: voyage(m.voyage_id) }))
      .filter(({ m, v }) => v && (active(v) || !m.acknowledged_at))
      .sort((a, b) => b.v.created_at.localeCompare(a.v.created_at))
      .map(({ m, v }) => ({
        ...voyageJson(v),
        acknowledged: !!m.acknowledged_at,
        waiting_on_me: W.supplies.filter((s) => s.voyage_id === v.id && s.status === 'proposed' && s.proposed_by !== me).length
          + (v.mode === 'solo' && v.claimed_at && v.status === 'underway' ? 1 : 0)
          + (ended(v) && !m.acknowledged_at ? 1 : 0),
      }));
    const open = W.voyages.filter((v) => v.status === 'open' && v.listed && v.user_id !== me && !memberOf(v.id, me)
      && !blocked(me, v.user_id) && membersOf(v.id).length < seats(v)).slice(0, 40).map(voyageJson);
    return {
      me: userJson(user(me)),
      my_voyage: current ? voyageJson(current) : null,
      needs_reckoning: reck ? voyageJson(reck) : null,
      watch_count: watchCount(me),
      watching,
      open,
    };
  },
  piers_voyage_detail({ p_token, p_voyage }) {
    const me = uidFromToken(p_token);
    const v = voyage(p_voyage) ?? fail('Pier not found.');
    const role = v.user_id === me ? 'pursuer' : memberOf(v.id, me) ? 'peer' : (v.status === 'open' && v.listed ? 'visitor' : null);
    if (!role) fail('You can\'t see this pier.');
    const over = ended(v);
    const vis = role === 'visitor';
    const pulses = vis ? [] : W.pulses.filter((p) => p.voyage_id === v.id).sort((a, b) => b.date_key.localeCompare(a.date_key)).map((p) => ({
      ...p,
      responses: W.responses.filter((r) => r.pulse_id === p.id).map((r) => ({ sender_id: r.sender_id, handle: handleOf(r.sender_id), word: r.word })),
    }));
    const supplies = W.supplies.filter((s) => s.voyage_id === v.id);
    return {
      role,
      voyage: { ...voyageJson(v), ...(role === 'pursuer' ? { reckoning: v.reckoning } : {}) },
      rest_days_left: restsLeft(v),
      members: vis ? [] : membersOf(v.id).map((m) => ({
        user_id: m.user_id, handle: handleOf(m.user_id), joined_at: m.joined_at,
        acknowledged_at: m.acknowledged_at, acknowledgement: m.acknowledgement,
      })),
      signals: vis ? [] : W.signals.filter((s) => s.voyage_id === v.id).map((s) => ({ ...s, handle: handleOf(s.sender_id) })),
      pulses,
      supplies: role === 'peer'
        ? supplies.map((s) => ({ ...s, proposer: handleOf(s.proposed_by), cosigner: s.cosigned_by ? handleOf(s.cosigned_by) : null }))
        : role === 'pursuer'
          ? supplies.filter((s) => s.status === 'delivered').map((s) => ({
            id: s.id, kind: s.kind, url: s.url, status: s.status,
            body: s.kind === 'sealed_note' && !over ? null : s.body,
            sealed: s.kind === 'sealed_note' && !over,
            from: `${handleOf(s.proposed_by)} + ${handleOf(s.cosigned_by)}`,
            delivered_at: s.delivered_at, opened_at: s.opened_at,
          }))
          : [],
      shore: role === 'peer'
        ? W.shore.filter((m) => m.voyage_id === v.id && !blocked(me, m.sender_id)).map((m) => ({ ...m, handle: handleOf(m.sender_id) }))
        : null,
    };
  },
  piers_harbor({ p_token }) {
    const me = uidFromToken(p_token);
    return W.voyages.filter((v) => v.status === 'returned' && v.user_id !== me && !blocked(me, v.user_id))
      .sort((a, b) => (b.completed_at || '').localeCompare(a.completed_at || '')).slice(0, 30)
      .map((v) => ({ id: v.id, goal: v.goal, handle: handleOf(v.user_id), completed_at: v.completed_at, mode: v.mode }));
  },
  piers_logbook({ p_token }) {
    const me = uidFromToken(p_token);
    return W.voyages.filter((v) => v.user_id === me && ended(v))
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map((v) => ({
        ...v,
        acknowledgements: membersOf(v.id).filter((m) => m.acknowledgement).map((m) => ({ handle: handleOf(m.user_id), acknowledgement: m.acknowledgement })),
        supply_count: W.supplies.filter((s) => s.voyage_id === v.id && s.status === 'delivered').length,
      }));
  },

  piers_dev_seed({ p_token }) {
    uidFromToken(p_token);
    for (let i = 0; i < 3; i++) spawnBotVoyage();
  },
  piers_dev_fill({ p_token }) {
    const me = uidFromToken(p_token);
    const v = W.voyages.find((x) => x.user_id === me && x.status === 'open') ?? fail('Set a goal first.');
    while (membersOf(v.id).length < seats(v)) addMember(v, peerBot(v.id).id);
    maybeStart(v);
  },
  piers_dev_advance({ p_token }) {
    uidFromToken(p_token);
    W.offset += DAY;
  },
  piers_dev_reset() {
    W = emptyWorld();
    seedWorld();
  },
};

function restsLeft(v) {
  return Math.max(W.supplies.filter((s) => s.voyage_id === v.id && s.kind === 'rest_day' && s.status === 'delivered').length - v.rest_days_used, 0);
}

export async function localRpc(fn, args = {}) {
  await ensure();
  const handler = rpcs[fn] ?? fail(`Unknown call: ${fn}`);
  tick();
  const result = handler(args);
  persist();
  return result ?? null;
}
