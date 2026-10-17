import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

export function usePoll(load, ms = 5000) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const refresh = useCallback(async () => {
    try { setData(await load()); setError(null); } catch (e) { setError(e.message); }
  }, [load]);
  useFocusEffect(useCallback(() => {
    refresh();
    const id = setInterval(refresh, ms);
    return () => clearInterval(id);
  }, [refresh, ms]));
  return { data, error, refresh };
}
