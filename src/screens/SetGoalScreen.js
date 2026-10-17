import React, { useState } from 'react';
import { Screen, Title, Body, Field, Choice, PrimaryButton, Back } from '../components/ui';
import { castOff } from '../lib/supabase';
import { colors } from '../lib/theme';

const DAYS = [
  { value: 3, label: '3 days' },
  { value: 5, label: '5 days' },
  { value: 7, label: 'Every day' },
];
const WHO = [
  { value: 'friends', label: 'Two friends' },
  { value: 'strangers', label: 'Two strangers' },
];

export default function SetGoalScreen({ navigation }) {
  const [goal, setGoal] = useState('');
  const [obstacle, setObstacle] = useState('');
  const [target, setTarget] = useState(3);
  const [who, setWho] = useState('friends');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function sign() {
    if (!goal.trim()) return setError('Write your goal first.');
    setBusy(true);
    try {
      await castOff({ goal: goal.trim(), obstacle: obstacle.trim(), mode: 'pair', listed: who === 'strangers', target });
      navigation.goBack();
    } catch (e) { setError(e.message); setBusy(false); }
  }

  return (
    <Screen footer={<PrimaryButton label="Sign it" busy={busy} onPress={sign} />}>
      <Back navigation={navigation} />
      <Title>One goal for this week.</Title>
      <Field label="What will you do?" value={goal} onChangeText={setGoal} maxLength={140} />
      <Field label="What might stop you?" labelColor={colors.stop} value={obstacle} onChangeText={setObstacle} maxLength={140} />
      <Choice label="How many days?" options={DAYS} value={target} onChange={setTarget} />
      <Choice label="Who will witness it?" options={WHO} value={who} onChange={setWho} />
      {error ? <Body>{error}</Body> : null}
    </Screen>
  );
}
