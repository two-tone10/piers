import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const KEY = 'piers_world';
const CHUNK = 1800;

export async function loadWorld() {
  try {
    if (Platform.OS === 'web') {
      const raw = globalThis.localStorage?.getItem(KEY);
      return raw ? JSON.parse(raw) : null;
    }
    const n = Number(await SecureStore.getItemAsync(`${KEY}_n`));
    if (!n) return null;
    const parts = await Promise.all(Array.from({ length: n }, (_, i) => SecureStore.getItemAsync(`${KEY}_${i}`)));
    return JSON.parse(parts.join(''));
  } catch (_) {
    return null;
  }
}

export async function saveWorld(world) {
  const raw = JSON.stringify(world);
  if (Platform.OS === 'web') {
    globalThis.localStorage?.setItem(KEY, raw);
    return;
  }
  const prev = Number(await SecureStore.getItemAsync(`${KEY}_n`)) || 0;
  const n = Math.ceil(raw.length / CHUNK);
  for (let i = 0; i < n; i++) {
    await SecureStore.setItemAsync(`${KEY}_${i}`, raw.slice(i * CHUNK, (i + 1) * CHUNK));
  }
  await SecureStore.setItemAsync(`${KEY}_n`, String(n));
  for (let i = n; i < prev; i++) await SecureStore.deleteItemAsync(`${KEY}_${i}`);
}
