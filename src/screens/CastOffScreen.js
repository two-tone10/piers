import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { colors, radius } from '../lib/theme';
import { castOff } from '../lib/supabase';

export default function CastOffScreen({ route, navigation, user }) {
  const [goal, setGoal] = useState('');
  const [obstacle, setObstacle] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!goal.trim()) return setError('Name your goal before casting off.');
    if (!obstacle.trim()) return setError('Name your biggest obstacle.');
    setError('');
    setLoading(true);
    try {
      await castOff({ userId: user.id, goal: goal.trim(), obstacle: obstacle.trim() });
      navigation.goBack();
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
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Cast off</Text>
        <Text style={styles.sub}>
          Your goal goes out to sea until two others stand on your pier.
          Be precise. Vague goals drift.
        </Text>

        <View style={styles.field}>
          <Text style={styles.label}>This week I will</Text>
          <TextInput
            style={styles.input}
            placeholder="State your goal clearly and specifically."
            placeholderTextColor={colors.textDim}
            value={goal}
            onChangeText={setGoal}
            multiline
            maxLength={300}
            textAlignVertical="top"
          />
          <Text style={styles.count}>{goal.length}/300</Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>My biggest obstacle is</Text>
          <TextInput
            style={styles.input}
            placeholder="What's most likely to stop you?"
            placeholderTextColor={colors.textDim}
            value={obstacle}
            onChangeText={setObstacle}
            multiline
            maxLength={300}
            textAlignVertical="top"
          />
          <Text style={styles.count}>{obstacle.length}/300</Text>
        </View>

        {!!error && <Text style={styles.error}>{error}</Text>}

        <View style={styles.notice}>
          <Text style={styles.noticeText}>
            Your pier cannot interact with your voyage until you return — or the week expires.
            They can only send signals from the shore.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={submit}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color={colors.bg} />
            : <Text style={styles.btnText}>Set it out to sea ⛵</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 24, paddingTop: 60, gap: 20, paddingBottom: 40 },
  back: { marginBottom: 4 },
  backText: { color: colors.textMid, fontSize: 14 },
  title: { fontSize: 28, fontWeight: '700', color: colors.text, letterSpacing: -0.5 },
  sub: { fontSize: 14, color: colors.textMid, lineHeight: 20 },
  field: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 8,
  },
  label: {
    fontSize: 11, color: colors.gold, textTransform: 'uppercase', letterSpacing: 0.8,
  },
  input: {
    fontSize: 16,
    color: colors.text,
    minHeight: 80,
    lineHeight: 22,
  },
  count: { fontSize: 11, color: colors.textDim, textAlign: 'right' },
  error: { fontSize: 13, color: colors.rose },
  notice: {
    backgroundColor: colors.goldBg,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.goldBorder,
    padding: 14,
  },
  noticeText: { fontSize: 13, color: colors.gold, lineHeight: 18 },
  btn: {
    backgroundColor: colors.gold,
    borderRadius: radius.md,
    paddingVertical: 16,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { fontSize: 16, fontWeight: '600', color: colors.bg },
});
