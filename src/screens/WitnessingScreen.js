import React, { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { Screen, Group, Title, Body, ListItem, PrimaryButton, SecondaryButton } from '../components/ui';
import { usePoll } from '../hooks/usePoll';
import { getHome, joinRandom, MAX_WATCHING } from '../lib/supabase';
import { name } from '../lib/words';

export default function WitnessingScreen({ navigation }) {
  const load = useCallback(() => getHome(), []);
  const { data, refresh } = usePoll(load);
  const [busy, setBusy] = useState(false);

  async function stranger() {
    setBusy(true);
    try {
      const id = await joinRandom();
      await refresh();
      navigation.navigate('FriendWeek', { voyageId: id });
    } catch (e) { Alert.alert(e.message); }
    setBusy(false);
  }

  const list = data?.watching ?? [];
  return (
    <Screen footer={
      <>
        <PrimaryButton label="Witness a stranger" busy={busy} onPress={stranger} />
        <SecondaryButton label="Join with a code" onPress={() => navigation.navigate('JoinCode')} />
      </>
    }>
      <Group gap={8}>
        <Title>Witnessing</Title>
        <Body>{`${data?.watch_count ?? 0} of ${MAX_WATCHING}`}</Body>
      </Group>
      <Group gap={4}>
        {list.length === 0 && data ? <Body>No one yet.</Body> : null}
        {list.map((v) => (
          <ListItem key={v.id} onPress={() => navigation.navigate('FriendWeek', { voyageId: v.id })}>
            {`${name(v.handle)} · ${v.goal} · ${v.log_count} of ${v.target}${v.waiting_on_me ? ' · needs you' : ''}`}
          </ListItem>
        ))}
      </Group>
    </Screen>
  );
}
