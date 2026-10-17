import React, { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { Screen, Group, Row, Title, Count, Body, Field, PrimaryButton, SecondaryButton, Back } from '../components/ui';
import { usePoll } from '../hooks/usePoll';
import {
  getVoyageDetail, sendSignal, proposeSupply, cosignSupply, declineSupply, acknowledge, reportUser, blockUser,
} from '../lib/supabase';
import { name, ordinal, daysLeft } from '../lib/words';

export default function FriendWeekScreen({ route, navigation, user }) {
  const { voyageId } = route.params;
  const load = useCallback(() => getVoyageDetail(voyageId), [voyageId]);
  const { data, error, refresh } = usePoll(load);
  const [note, setNote] = useState('');
  const [sent, setSent] = useState(null);
  const [busy, setBusy] = useState(false);

  async function act(fn) {
    setBusy(true);
    try { await fn(); await refresh(); } catch (e) { Alert.alert(e.message); }
    setBusy(false);
  }

  if (!data) return <Screen><Back navigation={navigation} />{error ? <Body>{error}</Body> : null}</Screen>;

  const v = data.voyage;
  const them = name(v.handle);
  const over = v.status === 'returned' || v.status === 'lost';
  const me = data.members.find((m) => m.user_id === user.id);
  const other = data.members.find((m) => m.user_id !== user.id);
  const request = data.supplies.find((s) => s.kind === 'extra_day' && s.status !== 'declined');

  function report() {
    Alert.alert(`Report or block ${them}?`, null, [
      { text: 'Report', onPress: () => act(() => reportUser({ userId: v.user_id, voyageId: v.id, reason: 'goal' })) },
      { text: 'Block', style: 'destructive', onPress: () => act(async () => { await blockUser(v.user_id); navigation.goBack(); }) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  let requestView = null;
  if (!over && v.status === 'underway' && v.mode === 'pair' && other) {
    if (!request) {
      requestView = <SecondaryButton label="Offer one extra day" busy={busy} onPress={() => act(() => proposeSupply({ voyageId: v.id, kind: 'extra_day' }))} />;
    } else if (request.status === 'proposed' && request.proposed_by !== user.id) {
      requestView = (
        <Group>
          <Body>{`${name(request.proposer)} wants to give ${them} one extra day.`}</Body>
          <Row>
            <PrimaryButton flex label="Agree" busy={busy} onPress={() => act(() => cosignSupply(request.id))} />
            <SecondaryButton flex label="Not yet" onPress={() => act(() => declineSupply(request.id))} />
          </Row>
        </Group>
      );
    } else if (request.status === 'proposed') {
      requestView = <Body>{`You offered one extra day. Waiting for ${name(other.handle)}.`}</Body>;
    } else {
      requestView = <Body>{`${them} has one extra day.`}</Body>;
    }
  }

  return (
    <Screen footer={<SecondaryButton label={`Report ${them}`} onPress={report} />}>
      <Back navigation={navigation} />
      <Body>{`You're ${them}'s witness`}</Body>
      <Title>{v.goal}</Title>
      <Group gap={4}>
        <Count>{`${v.log_count} of ${v.target}`}</Count>
        <Body>{over ? 'The week is over.' : v.status === 'open' ? 'Starts when both witnesses join.' : daysLeft(v.expires_at, data.now)}</Body>
        {me?.weeks_together > 1 ? <Body>{`Your ${ordinal(me.weeks_together)} week witnessing ${them}.`}</Body> : null}
      </Group>
      {over ? (
        me?.acknowledged_at ? <Body>{`You told ${them}: ${me.acknowledgement}`}</Body> : (
          <Group>
            <Field label={`Tell ${them} how you saw their week`} value={note} onChangeText={setNote} maxLength={200} />
            <PrimaryButton label="Send" busy={busy} onPress={() => note.trim() && act(async () => { await acknowledge({ voyageId: v.id, text: note.trim() }); setNote(''); })} />
          </Group>
        )
      ) : (
        <Group>
          <Field label={`Send ${them} a note`} value={note} onChangeText={setNote} maxLength={140} />
          <SecondaryButton label="Send" busy={busy} onPress={() => note.trim() && act(async () => {
            await sendSignal({ voyageId: v.id, quote: note.trim(), author: null });
            setSent(note.trim()); setNote('');
          })} />
          {sent ? <Body>{`Sent: ${sent}`}</Body> : null}
        </Group>
      )}
      {requestView}
    </Screen>
  );
}
