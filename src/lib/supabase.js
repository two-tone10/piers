import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const ExpoSecureStoreAdapter = {
  getItem: (key) => SecureStore.getItemAsync(key),
  setItem: (key, value) => SecureStore.setItemAsync(key, value),
  removeItem: (key) => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// ── Pulse constants ───────────────────────────────────────────────────────────

export const PULSE_OPTIONS = [
  { key: 'making_progress', label: 'Making progress.' },
  { key: 'pushing_through', label: 'Pushing through.' },
  { key: 'stayed_the_course', label: 'Stayed the course.' },
  { key: 'rough_one', label: 'Had a rough one.' },
];

export const RESPONSE_WORDS = [
  'Proud.', 'Keep going.', 'Strength.', 'I see you.',
  'Steady.', "You've got this.", 'Still here.', 'Onwards.',
  'Real.', 'Good.', 'Hold on.', 'Together.',
];

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

// ── Goals ─────────────────────────────────────────────────────────────────────

export async function castOff({ userId, goal, obstacle }) {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('piers_voyages')
    .insert({ user_id: userId, goal, obstacle, status: 'open', expires_at: expiresAt })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getOpenVoyages(excludeUserId) {
  const { data, error } = await supabase
    .from('piers_voyages')
    .select('*, piers_users(handle)')
    .eq('status', 'open')
    .neq('user_id', excludeUserId)
    .order('created_at', { ascending: true })
    .limit(40);
  if (error) throw error;
  return data || [];
}

export async function getMyVoyage(userId) {
  const { data, error } = await supabase
    .from('piers_voyages')
    .select('*')
    .eq('user_id', userId)
    .in('status', ['open', 'underway'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function sailHome(voyageId) {
  const { error } = await supabase
    .from('piers_voyages')
    .update({ status: 'returned', completed_at: new Date().toISOString() })
    .eq('id', voyageId);
  if (error) throw error;
}

// ── Pier members ──────────────────────────────────────────────────────────────

export async function getPierMembers(voyageId) {
  const { data, error } = await supabase
    .from('piers_pier_members')
    .select('*, piers_users(handle)')
    .eq('voyage_id', voyageId);
  if (error) throw error;
  return data || [];
}

export async function joinPier({ voyageId, userId }) {
  // Allow up to 3 concurrent pier memberships
  const { data: existing, error: checkErr } = await supabase
    .from('piers_pier_members')
    .select('id')
    .eq('user_id', userId)
    .is('acknowledged_at', null);
  if (checkErr) throw checkErr;
  if (existing?.length >= 3) {
    throw new Error('You are already supporting three people. That\'s the limit — acknowledge one first.');
  }

  const { error } = await supabase
    .from('piers_pier_members')
    .insert({ voyage_id: voyageId, user_id: userId });
  if (error) throw error;

  const { data: members } = await supabase
    .from('piers_pier_members')
    .select('id')
    .eq('voyage_id', voyageId);

  if (members?.length >= 2) {
    await supabase
      .from('piers_voyages')
      .update({ status: 'underway' })
      .eq('id', voyageId);
  }
}

export async function getActiveMemberships(userId) {
  const { data, error } = await supabase
    .from('piers_pier_members')
    .select('*, piers_voyages(*, piers_users(handle))')
    .eq('user_id', userId)
    .is('acknowledged_at', null)
    .limit(3);
  if (error) throw error;
  return data || [];
}

export async function acknowledge({ voyageId, userId, text }) {
  const { error } = await supabase
    .from('piers_pier_members')
    .update({ acknowledged_at: new Date().toISOString(), acknowledgement: text })
    .eq('voyage_id', voyageId)
    .eq('user_id', userId);
  if (error) throw error;
}

// ── Signals (quotes/inspiration) ──────────────────────────────────────────────

export async function getSignals(voyageId) {
  const { data, error } = await supabase
    .from('piers_signals')
    .select('*, piers_users(handle)')
    .eq('voyage_id', voyageId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function sendSignal({ voyageId, senderId, quote, author }) {
  const { error } = await supabase
    .from('piers_signals')
    .insert({ voyage_id: voyageId, sender_id: senderId, quote, author: author || null });
  if (error) throw error;
}

// ── Pulses ────────────────────────────────────────────────────────────────────

export async function sendPulse({ voyageId, status }) {
  const { error } = await supabase
    .from('piers_pulses')
    .upsert(
      { voyage_id: voyageId, status, date_key: todayKey() },
      { onConflict: 'voyage_id,date_key' }
    );
  if (error) throw error;
}

export async function getPulses(voyageId) {
  const { data, error } = await supabase
    .from('piers_pulses')
    .select('*, piers_pulse_responses(*, piers_users(handle))')
    .eq('voyage_id', voyageId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function respondToPulse({ pulseId, senderId, word }) {
  const { error } = await supabase
    .from('piers_pulse_responses')
    .upsert(
      { pulse_id: pulseId, sender_id: senderId, word },
      { onConflict: 'pulse_id,sender_id' }
    );
  if (error) throw error;
}

// ── History ───────────────────────────────────────────────────────────────────

export async function getPastVoyages(userId) {
  const { data, error } = await supabase
    .from('piers_voyages')
    .select('*')
    .eq('user_id', userId)
    .in('status', ['returned', 'lost'])
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) throw error;
  return data || [];
}

// ── Dev seeder ────────────────────────────────────────────────────────────────

const FAKE_USERS = [
  { handle: 'marco_d' },
  { handle: 'suli_w' },
  { handle: 'priya_k' },
  { handle: 'cam_r' },
  { handle: 'nadia_t' },
];

const FAKE_VOYAGES = [
  { goal: 'Finish the first draft of my short story — all three scenes written by Sunday.', obstacle: 'I keep editing as I go instead of just getting words on the page.' },
  { goal: 'Call my dad three times this week. Not text — actually call.', obstacle: 'I always find an excuse when the moment comes.' },
  { goal: 'Run four times this week, minimum 20 minutes each.', obstacle: 'Morning motivation. I never want to start.' },
  { goal: 'Spend zero money on things I don\'t need. No impulse buys, no apps, no food delivery.', obstacle: 'Stress-buying when work gets hard.' },
  { goal: 'Read for 30 minutes every night before bed instead of scrolling.', obstacle: 'My phone is always within reach and it\'s too easy to grab.' },
];

export async function seedOpenVoyages() {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const results = [];
  for (let i = 0; i < 3; i++) {
    const { data: user } = await supabase
      .from('piers_users')
      .upsert({ handle: FAKE_USERS[i].handle }, { onConflict: 'handle' })
      .select().single();
    if (!user) continue;
    const { data: voyage } = await supabase
      .from('piers_voyages')
      .insert({ user_id: user.id, goal: FAKE_VOYAGES[i].goal, obstacle: FAKE_VOYAGES[i].obstacle, status: 'open', expires_at: expiresAt })
      .select().single();
    if (voyage) results.push(voyage);
  }
  return results;
}

export async function seedPierMembers(voyageId) {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  for (let i = 3; i < 5; i++) {
    const { data: user } = await supabase
      .from('piers_users')
      .upsert({ handle: FAKE_USERS[i].handle }, { onConflict: 'handle' })
      .select().single();
    if (!user) continue;
    await supabase.from('piers_voyages').insert({
      user_id: user.id, goal: FAKE_VOYAGES[i % FAKE_VOYAGES.length].goal,
      obstacle: FAKE_VOYAGES[i % FAKE_VOYAGES.length].obstacle, status: 'open', expires_at: expiresAt,
    });
    await supabase.from('piers_pier_members')
      .upsert({ voyage_id: voyageId, user_id: user.id }, { onConflict: 'voyage_id,user_id' });
  }
  await supabase.from('piers_voyages').update({ status: 'underway' }).eq('id', voyageId);
}
