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

// ── Piers API helpers ─────────────────────────────────────────────────────────

export async function dbGet(table, query = '') {
  const { data, error } = await supabase.from(table).select('*').match(query);
  if (error) throw error;
  return data;
}

async function rpc(table, method, body, opts = {}) {
  const res = await supabase.from(table)[method](body, opts);
  if (res.error) throw res.error;
  return res.data;
}

export async function castOff({ userId, goal, obstacle }) {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const data = await rpc('piers_voyages', 'insert', {
    user_id: userId,
    goal,
    obstacle,
    status: 'open',
    expires_at: expiresAt,
  }, { returning: 'representation' });
  return data?.[0];
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

export async function getPierMembers(voyageId) {
  const { data, error } = await supabase
    .from('piers_pier_members')
    .select('*, piers_users(handle)')
    .eq('voyage_id', voyageId);
  if (error) throw error;
  return data || [];
}

export async function getSignals(voyageId) {
  const { data, error } = await supabase
    .from('piers_signals')
    .select('*, piers_users(handle)')
    .eq('voyage_id', voyageId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function joinPier({ voyageId, userId }) {
  const { data: existing, error: checkErr } = await supabase
    .from('piers_pier_members')
    .select('id')
    .eq('user_id', userId)
    .is('acknowledged_at', null)
    .maybeSingle();
  if (checkErr) throw checkErr;
  if (existing) throw new Error('You are already standing on a pier. You can only watch one voyage at a time.');

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

export async function sailHome(voyageId) {
  const { error } = await supabase
    .from('piers_voyages')
    .update({ status: 'returned', completed_at: new Date().toISOString() })
    .eq('id', voyageId);
  if (error) throw error;
}

export async function sendSignal({ voyageId, senderId, quote, author }) {
  const { error } = await supabase
    .from('piers_signals')
    .insert({ voyage_id: voyageId, sender_id: senderId, quote, author: author || null });
  if (error) throw error;
}

export async function acknowledge({ voyageId, userId, text }) {
  const { error } = await supabase
    .from('piers_pier_members')
    .update({ acknowledged_at: new Date().toISOString(), acknowledgement: text })
    .eq('voyage_id', voyageId)
    .eq('user_id', userId);
  if (error) throw error;
}

export async function getActiveMembership(userId) {
  const { data, error } = await supabase
    .from('piers_pier_members')
    .select('*, piers_voyages(*)')
    .eq('user_id', userId)
    .is('acknowledged_at', null)
    .maybeSingle();
  if (error) throw error;
  return data;
}

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
    const fakeUser = FAKE_USERS[i];
    const fakeVoyage = FAKE_VOYAGES[i];
    const { data: user } = await supabase
      .from('piers_users')
      .upsert({ handle: fakeUser.handle }, { onConflict: 'handle' })
      .select()
      .single();
    if (!user) continue;
    const { data: voyage } = await supabase
      .from('piers_voyages')
      .insert({ user_id: user.id, goal: fakeVoyage.goal, obstacle: fakeVoyage.obstacle, status: 'open', expires_at: expiresAt })
      .select()
      .single();
    if (voyage) results.push(voyage);
  }
  return results;
}

export async function seedPierMembers(voyageId) {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  for (let i = 3; i < 5; i++) {
    const fakeUser = FAKE_USERS[i];
    const { data: user } = await supabase
      .from('piers_users')
      .upsert({ handle: fakeUser.handle }, { onConflict: 'handle' })
      .select()
      .single();
    if (!user) continue;
    // Give them a voyage so they qualify to join a pier
    await supabase
      .from('piers_voyages')
      .insert({ user_id: user.id, goal: FAKE_VOYAGES[i % FAKE_VOYAGES.length].goal, obstacle: FAKE_VOYAGES[i % FAKE_VOYAGES.length].obstacle, status: 'open', expires_at: expiresAt })
      .select();
    await supabase
      .from('piers_pier_members')
      .upsert({ voyage_id: voyageId, user_id: user.id }, { onConflict: 'voyage_id,user_id' });
  }
  // Push voyage to underway
  await supabase
    .from('piers_voyages')
    .update({ status: 'underway' })
    .eq('id', voyageId);
}
