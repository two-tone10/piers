import React, { useCallback } from 'react';
import { Alert } from 'react-native';
import { Screen, Group, Title, Body, SecondaryButton } from '../components/ui';
import { usePoll } from '../hooks/usePoll';
import { getLogbook, devAdvanceDay, devReset, IS_LOCAL } from '../lib/supabase';
import { RESULT_LABELS } from '../lib/words';

export default function HistoryScreen() {
  const load = useCallback(() => getLogbook(), []);
  const { data, refresh } = usePoll(load, 15000);

  async function dev(fn) {
    try { await fn(); await refresh(); } catch (e) { Alert.alert(e.message); }
  }

  return (
    <Screen>
      <Title>History</Title>
      <Group>
        {data && data.length === 0 ? <Body>No past weeks yet.</Body> : null}
        {(data ?? []).map((v) => (
          <Body key={v.id}>{`${v.goal} · ${RESULT_LABELS[v.result] ?? 'Not closed'}`}</Body>
        ))}
      </Group>
      {IS_LOCAL ? (
        <Group>
          <Body>Demo</Body>
          <SecondaryButton label="Skip ahead a day" onPress={() => dev(devAdvanceDay)} />
          <SecondaryButton label="Skip to the end of the week" onPress={() => dev(async () => { for (let i = 0; i < 8; i++) await devAdvanceDay(); })} />
          <SecondaryButton label="Reset the demo" onPress={() => dev(devReset)} />
        </Group>
      ) : null}
    </Screen>
  );
}
