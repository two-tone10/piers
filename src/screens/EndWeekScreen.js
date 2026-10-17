import React, { useCallback, useState } from 'react';
import { Screen, Group, Title, Body, Field, Choice, PrimaryButton } from '../components/ui';
import { usePoll } from '../hooks/usePoll';
import { getVoyageDetail, closeWeek } from '../lib/supabase';
import { name, didYou } from '../lib/words';

const RESULTS = [
  { value: 'yes', label: 'Yes' },
  { value: 'partly', label: 'Partly' },
  { value: 'no', label: 'No' },
];

export default function EndWeekScreen({ route, navigation }) {
  const { voyageId } = route.params;
  const load = useCallback(() => getVoyageDetail(voyageId), [voyageId]);
  const { data } = usePoll(load, 15000);
  const [result, setResult] = useState(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  if (!data) return <Screen />;
  const v = data.voyage;
  const ack = data.members.find((m) => m.acknowledgement);
  const latest = [...data.signals].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  const witnessNote = ack ? { who: ack.handle, body: ack.acknowledgement } : latest ? { who: latest.handle, body: latest.quote } : null;

  async function close() {
    if (!result) return setError('Pick Yes, Partly or No.');
    setBusy(true);
    try { await closeWeek(v.id, result, text); navigation.goBack(); } catch (e) { setError(e.message); setBusy(false); }
  }

  return (
    <Screen footer={<PrimaryButton label="Close the week" busy={busy} onPress={close} />}>
      <Body>The week is over</Body>
      <Group gap={16}>
        <Title>{didYou(v.goal)}</Title>
        <Body>{`You logged ${v.log_count} of ${v.target}.`}</Body>
      </Group>
      <Choice options={RESULTS} value={result} onChange={setResult} />
      <Field label="What happened?" value={text} onChangeText={setText} maxLength={280} multiline />
      {witnessNote ? <Body>{`${name(witnessNote.who)}: ${witnessNote.body}`}</Body> : null}
      {error ? <Body>{error}</Body> : null}
    </Screen>
  );
}
