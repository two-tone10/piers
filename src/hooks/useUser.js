import { useState, useEffect, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { createUser as createUserRpc, getMe, setSessionToken } from '../lib/supabase';

const USER_KEY = 'piers_user';

export function useUser() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const stored = await SecureStore.getItemAsync(USER_KEY);
        const token = stored ? JSON.parse(stored)?.session_token : null;
        if (token) {
          const data = await getMe(token);
          if (data) {
            setSessionToken(data.session_token);
            setUser(data);
          } else {
            await SecureStore.deleteItemAsync(USER_KEY);
          }
        }
      } catch (_) {}
      setLoading(false);
    })();
  }, []);

  const createUser = useCallback(async (handle) => {
    const data = await createUserRpc(handle.trim().slice(0, 40));
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(data));
    setSessionToken(data.session_token);
    setUser(data);
    return data;
  }, []);

  const clearUser = useCallback(async () => {
    await SecureStore.deleteItemAsync(USER_KEY);
    setSessionToken(null);
    setUser(null);
  }, []);

  return { user, loading, createUser, clearUser };
}
