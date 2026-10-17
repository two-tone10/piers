import React, { useState } from 'react';
import { Screen, Title, Body, Field, PrimaryButton, Back } from '../components/ui';
import { joinByCode } from '../lib/supabase';

export default function JoinCodeScreen({ navigation }) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function join() {
    if (!code.trim()) return setError('Enter the code.');
    setBusy(true);
    try {
      const id = await joinByCode(code);
      navigation.replace('FriendWeek', { voyageId: id });
    } catch (e) { setError(e.message); setBusy(false); }
  }

  return (
    <Screen footer={<PrimaryButton label="Join" busy={busy} onPress={join} />}>
      <Back navigation={navigation} />
      <Title>Join with a code</Title>
      <Field label="Code" value={code} onChangeText={setCode} autoCapitalize="characters" autoCorrect={false} maxLength={6} />
      {error ? <Body>{error}</Body> : null}
    </Screen>
  );
}
