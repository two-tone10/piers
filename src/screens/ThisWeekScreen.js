import React, { useCallback, useState } from 'react';
import { Alert, Share } from 'react-native';
import { Screen, Group, Title, Count, Body, PrimaryButton, SecondaryButton } from '../components/ui';
import { usePoll } from '../hooks/usePoll';
import { getHome, getVoyageDetail, sendPulse, goWithOne, reportUser, blockUser } from '../lib/supabase';
import { colors } from '../lib/theme';
import { name, ordinal, daysLeft, witnessLine, doneLabel } from '../lib/words';

export default function ThisWeekScreen({ navigation }) {
  const load = useCallback(async () => {
    const home = await getHome();
    const detail = home.my_voyage ? await getVoyageDetail(home.my_voyage.id) : null;
    return { home, detail };
  }, []);
  const { data, error, refresh } = usePoll(load);
  const [busy, setBusy] = useState(false);

  async function act(fn) {
    setBusy(true);
    try { await fn(); await refresh(); } catch (e) { Alert.alert(e.message); }
    setBusy(false);
  }

  if (!data) return <Screen>{error ? <Body>{error}</Body> : null}</Screen>;
  const { home, detail } = data;

  if (home.needs_reckoning) {
    return (
      <Screen footer={<PrimaryButton label="Close the week" onPress={() => navigation.navigate('EndWeek', { voyageId: home.needs_reckoning.id })} />}>
        <Body>This week</Body>
        <Title>The week is over.</Title>
      </Screen>
    );
  }

  if (!detail) {
    return (
      <Screen footer={<PrimaryButton label="Set a goal" onPress={() => navigation.navigate('SetGoal')} />}>
        <Body>This week</Body>
        <Title>No goal yet.</Title>
      </Screen>
    );
  }

  const v = detail.voyage;
  const seats = v.mode === 'solo' ? 1 : 2;
  const members = detail.members;
  const extraDay = detail.supplies.some((s) => s.kind === 'extra_day');
  const note = [...detail.signals].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];

  function reportNote() {
    Alert.alert(`Note from ${name(note.handle)}`, null, [
      { text: 'Report', onPress: () => act(() => reportUser({ userId: note.sender_id, voyageId: v.id, reason: 'note' })) },
      { text: 'Block', style: 'destructive', onPress: () => act(() => blockUser(note.sender_id)) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  if (v.status === 'open') {
    const one = members.length === 1 && seats === 2;
    return (
      <Screen footer={
        <>
          {!v.listed ? <PrimaryButton label="Share the code" onPress={() => Share.share({ message: `Witness my week on Piers. Code: ${v.invite_code}` })} /> : null}
          {one ? (
            <SecondaryButton
              label={`Start with ${name(members[0].handle)} only`}
              busy={busy}
              onPress={() => Alert.alert('Start with one witness?', 'With one witness, there is no extra day.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Start', onPress: () => act(() => goWithOne(v.id)) },
              ])}
            />
          ) : null}
        </>
      }>
        <Body>This week</Body>
        <Title>{v.goal}</Title>
        <Group>
          <Body>{`Waiting for witnesses. ${members.length} of ${seats} joined.`}</Body>
          {!v.listed ? <Body>{`Your code is ${v.invite_code}.`}</Body> : null}
        </Group>
      </Screen>
    );
  }

  return (
    <Screen footer={detail.logged_today
      ? <Body>Logged today.</Body>
      : <PrimaryButton label={doneLabel(v.goal)} busy={busy} onPress={() => act(() => sendPulse({ voyageId: v.id, status: 'done' }))} />}
    >
      <Body>This week</Body>
      <Group gap={16}>
        <Title>{v.goal}</Title>
        {v.obstacle ? <Body color={colors.stop}>{`What might stop me: ${v.obstacle}`}</Body> : null}
      </Group>
      <Group gap={4}>
        <Count>{`${v.log_count} of ${v.target}`}</Count>
        <Body>{daysLeft(v.expires_at, detail.now)}</Body>
      </Group>
      <Group>
        <Body>{witnessLine(members)}</Body>
        {members.filter((m) => m.weeks_together > 1).map((m) => (
          <Body key={m.user_id}>{`${name(m.handle)}'s ${ordinal(m.weeks_together)} week witnessing you.`}</Body>
        ))}
        {extraDay ? <Body>{`${members.map((m) => name(m.handle)).join(' and ')} gave you one extra day.`}</Body> : null}
        {note ? <Body onLongPress={reportNote}>{`${name(note.handle)}: ${note.quote}`}</Body> : null}
      </Group>
    </Screen>
  );
}
