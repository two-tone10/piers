import { useState, useEffect, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { supabase } from '../lib/supabase';

const USER_KEY = 'piers_user';

export function useUser() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const stored = await SecureStore.getItemAsync(USER_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          // Verify still valid
          const { data } = await supabase
            .from('piers_users')
            .select('*')
            .eq('id', parsed.id)
            .maybeSingle();
          if (data) setUser(data);
          else await SecureStore.deleteItemAsync(USER_KEY);
        }
      } catch (_) {}
      setLoading(false);
    })();
  }, []);

  const createUser = useCallback(async (handle) => {
    const trimmed = handle.trim().slice(0, 40);
    const { data, error } = await supabase
      .from('piers_users')
      .insert({ handle: trimmed })
      .select()
      .single();
    if (error) throw error;
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(data));
    setUser(data);
    return data;
  }, []);

  const clearUser = useCallback(async () => {
    await SecureStore.deleteItemAsync(USER_KEY);
    setUser(null);
  }, []);

  return { user, loading, createUser, clearUser };
}
