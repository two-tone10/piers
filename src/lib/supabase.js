import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { localRpc } from './local/engine';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Local, on-device world with simulated peers unless EXPO_PUBLIC_PIERS_BACKEND=supabase.
export const IS_LOCAL = process.env.EXPO_PUBLIC_PIERS_BACKEND !== 'supabase';

const ExpoSecureStoreAdapter = {
  getItem: (key) => SecureStore.getItemAsync(key),
  setItem: (key, value) => SecureStore.setItemAsync(key, value),
  removeItem: (key) => SecureStore.deleteItemAsync(key),
};

export const supabase = IS_LOCAL ? null : createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

async function call(fn, args) {
  if (IS_LOCAL) return localRpc(fn, args);
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new Error(error.message);
  return data;
}

// ── Pulse constants ───────────────────────────────────────────────────────────

export const PULSE_OPTIONS = [
  { key: 'making_progress', label: 'Making progress.' },
  { key: 'pushing_through', label: 'Pushing through.' },
  { key: 'stayed_the_course', label: 'Stayed the course.' },
  { key: 'rough_one', label: 'Had a rough one.' },
];

export const PULSE_LABELS = {
  ...Object.fromEntries(PULSE_OPTIONS.map((o) => [o.key, o.label])),
  rest_day: 'Rest day.',
};

export const RESPONSE_WORDS = [
  'Proud.', 'Keep going.', 'Strength.', 'I see you.',
  'Steady.', "You've got this.", 'Still here.', 'Onwards.',
  'Real.', 'Good.', 'Hold on.', 'Together.',
];

let sessionToken = null;

export function setSessionToken(token) {
  sessionToken = token || null;
}

const rpc = (fn, args = {}) => call(fn, { p_token: sessionToken, ...args });

export const MAX_WATCHING = 10;

export const SUPPLY_KINDS = [
  { key: 'extra_day', label: '+1 day', hint: 'Adds a day to their week.' },
  { key: 'rest_day', label: 'Rest day', hint: 'One day off. No gap in their pulse.' },
  { key: 'call', label: 'Call', hint: 'Offer a time to talk.', field: 'body', placeholder: 'e.g. Free Thu 7pm' },
  { key: 'sealed_note', label: 'Sealed note', hint: 'Opens when they finish.', field: 'body', placeholder: 'What you want them to read at the end' },
  { key: 'link', label: 'Link', hint: 'A tool, a read, a playlist.', field: 'url', placeholder: 'https://' },
];

export function supplyLabel(kind) {
  return SUPPLY_KINDS.find((k) => k.key === kind)?.label ?? kind;
}

// ── Identity ──────────────────────────────────────────────────────────────────

export const createUser = (handle) => call('piers_create_user', { p_handle: handle });
export const getMe = (token) => call('piers_me', { p_token: token });

export const setOpenToWatch = (on) => rpc('piers_set_open_to_watch', { p_on: on });

// ── Reads ─────────────────────────────────────────────────────────────────────

export const getHome = () => rpc('piers_home');
export const getVoyageDetail = (voyageId) => rpc('piers_voyage_detail', { p_voyage: voyageId });
export const getHarbor = () => rpc('piers_harbor');
export const getLogbook = () => rpc('piers_logbook');

// ── Pursuer ───────────────────────────────────────────────────────────────────

export const castOff = ({ goal, obstacle, mode, listed }) =>
  rpc('piers_cast_off', { p_goal: goal, p_obstacle: obstacle, p_mode: mode, p_listed: listed });
export const goWithOne = (voyageId) => rpc('piers_go_with_one', { p_voyage: voyageId });
export const setListed = (voyageId, listed) => rpc('piers_set_listed', { p_voyage: voyageId, p_listed: listed });
export const claimDone = (voyageId) => rpc('piers_claim_done', { p_voyage: voyageId });
export const sendPulse = ({ voyageId, status, note }) =>
  rpc('piers_send_pulse', { p_voyage: voyageId, p_status: status, p_note: note || null });
export const reckon = (voyageId, text) => rpc('piers_reckon', { p_voyage: voyageId, p_text: text });
export const openSupply = (supplyId) => rpc('piers_open_supply', { p_supply: supplyId });

// ── Peers ─────────────────────────────────────────────────────────────────────

export const joinPier = (voyageId) => rpc('piers_join', { p_voyage: voyageId });
export const joinByCode = (code) => rpc('piers_join_code', { p_code: code });
export const joinRandom = () => rpc('piers_join_random');
export const confirmDone = (voyageId, confirm) => rpc('piers_confirm_done', { p_voyage: voyageId, p_confirm: confirm });
export const sendSignal = ({ voyageId, quote, author }) =>
  rpc('piers_send_signal', { p_voyage: voyageId, p_quote: quote, p_author: author || null });
export const respondToPulse = ({ pulseId, word }) => rpc('piers_respond_pulse', { p_pulse: pulseId, p_word: word });
export const acknowledge = ({ voyageId, text }) => rpc('piers_acknowledge', { p_voyage: voyageId, p_text: text });
export const sendShore = (voyageId, body) => rpc('piers_shore_send', { p_voyage: voyageId, p_body: body });
export const proposeSupply = ({ voyageId, kind, body, url }) =>
  rpc('piers_supply_propose', { p_voyage: voyageId, p_kind: kind, p_body: body || null, p_url: url || null });
export const cosignSupply = (supplyId) => rpc('piers_supply_cosign', { p_supply: supplyId });
export const declineSupply = (supplyId) => rpc('piers_supply_decline', { p_supply: supplyId });

// ── Safety ────────────────────────────────────────────────────────────────────

export const reportUser = ({ userId, voyageId, messageId, reason }) =>
  rpc('piers_report', { p_target: userId, p_voyage: voyageId || null, p_message: messageId || null, p_reason: reason || null });
export const blockUser = (userId) => rpc('piers_block', { p_target: userId });

// ── Dev ───────────────────────────────────────────────────────────────────────

export const devSeed = () => rpc('piers_dev_seed');
export const devFill = () => rpc('piers_dev_fill');
export const devAdvanceDay = () => rpc('piers_dev_advance');
export const devReset = () => rpc('piers_dev_reset');

export function todayKey() {
  return new Date().toISOString().slice(0, 10);
}
