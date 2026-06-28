import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { colors, radius } from '../lib/theme';

export default function OnboardingScreen({ onCreated }) {
  const [handle, setHandle] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    const trimmed = handle.trim();
    if (!trimmed) return setError('Choose a name for the dock.');
    setError('');
    setLoading(true);
    try {
      await onCreated(trimmed);
    } catch (e) {
      setError(e.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inner}>
        <Text style={styles.wordmark}>Piers</Text>
        <Text style={styles.tagline}>
          Set your goal out to sea.{'\n'}Find two others to stand on your pier.
        </Text>

        <View style={styles.card}>
          <Text style={styles.label}>What should we call you?</Text>
          <TextInput
            style={styles.input}
            placeholder="your handle"
            placeholderTextColor={colors.textDim}
            value={handle}
            onChangeText={setHandle}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={40}
            returnKeyType="done"
            onSubmitEditing={submit}
          />
          {!!error && <Text style={styles.error}>{error}</Text>}
        </View>

        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={submit}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color={colors.bg} />
            : <Text style={styles.btnText}>Step onto the dock →</Text>}
        </TouchableOpacity>

        <Text style={styles.fine}>
          No account. No password. Your handle is stored only on this device.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 24,
  },
  wordmark: {
    fontSize: 42,
    fontWeight: '700',
    color: colors.gold,
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 16,
    color: colors.textMid,
    lineHeight: 24,
  },
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    gap: 12,
  },
  label: {
    fontSize: 13,
    color: colors.textMid,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  input: {
    fontSize: 18,
    color: colors.text,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderStrong,
    paddingVertical: 8,
  },
  error: {
    fontSize: 13,
    color: colors.rose,
  },
  btn: {
    backgroundColor: colors.gold,
    borderRadius: radius.md,
    paddingVertical: 16,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.5 },
  btnText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.bg,
  },
  fine: {
    fontSize: 12,
    color: colors.textDim,
    textAlign: 'center',
    lineHeight: 18,
  },
});
