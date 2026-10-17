import React, { useState } from 'react';
import { Screen, Title, Body, Field, PrimaryButton } from '../components/ui';

export default function OnboardingScreen({ onCreated }) {
  const [handle, setHandle] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function start() {
    if (!handle.trim()) return setError('Enter your name.');
    setBusy(true);
    try { await onCreated(handle.trim()); } catch (e) { setError(e.message); setBusy(false); }
  }

  return (
    <Screen footer={<PrimaryButton label="Start" busy={busy} onPress={start} />}>
      <Title>Set one goal for the week. Two people witness it. At the end, you say how it went.</Title>
      <Field label="Your name" value={handle} onChangeText={setHandle} autoCorrect={false} maxLength={40} />
      {error ? <Body>{error}</Body> : null}
    </Screen>
  );
}
