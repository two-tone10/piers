import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { colors, radius } from '../lib/theme';
import { supabase } from '../lib/supabase';

export default function ReckoningScreen({ route, navigation }) {
  const { voyage } = route.params;
  const returned = voyage.status === 'returned';
  const [reckoning, setReckoning] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    try {
      await supabase
        .from('piers_voyages')
        .update({ reckoning: reckoning.trim() || null, reckoning_at: new Date().toISOString() })
        .eq('id', voyage.id);
      navigation.goBack();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function skip() {
    navigation.goBack();
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>
          {returned ? 'You made it back.' : 'The week expired.'}
        </Text>
        <Text style={styles.sub}>
          {returned
            ? 'Before this voyage archives, write your reckoning. What happened?'
            : 'The week is up. Write what you know now that you didn\'t when you cast off.'}
        </Text>

        <View style={[styles.card, styles.cardGold]}>
          <Text style={styles.fieldLabel}>Your goal was</Text>
          <Text style={styles.goalText}>{voyage.goal}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.fieldLabel}>You named this as your obstacle</Text>
          <Text style={styles.obstacleText}>{voyage.obstacle}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Your reckoning</Text>
          <TextInput
            style={styles.input}
            placeholder={returned
              ? 'What happened? Was the obstacle what you thought?'
              : 'What got in the way? What do you know now?'}
            placeholderTextColor={colors.textDim}
            value={reckoning}
            onChangeText={setReckoning}
            multiline
            maxLength={400}
            textAlignVertical="top"
            autoFocus
          />
          <Text style={styles.count}>{reckoning.length}/400</Text>
        </View>

        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={submit}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color={colors.bg} />
            : <Text style={styles.btnText}>
                {returned ? 'Archive the voyage ⚓' : 'Close the logbook 🌊'}
              </Text>}
        </TouchableOpacity>

        <TouchableOpacity style={styles.skip} onPress={skip}>
          <Text style={styles.skipText}>Skip reckoning</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 24, paddingTop: 60, gap: 18, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: '700', color: colors.text, letterSpacing: -0.5 },
  sub: { fontSize: 14, color: colors.textMid, lineHeight: 20 },
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    gap: 8,
  },
  cardGold: { borderColor: colors.goldBorder, backgroundColor: colors.goldBg },
  fieldLabel: { fontSize: 11, color: colors.textMid, textTransform: 'uppercase', letterSpacing: 0.8 },
  goalText: { fontSize: 17, color: colors.text, lineHeight: 24 },
  obstacleText: { fontSize: 14, color: colors.textMid, lineHeight: 20 },
  input: {
    fontSize: 15, color: colors.text, minHeight: 100, lineHeight: 22,
  },
  count: { fontSize: 11, color: colors.textDim, textAlign: 'right' },
  btn: {
    backgroundColor: colors.gold, borderRadius: radius.md,
    paddingVertical: 16, alignItems: 'center',
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { fontSize: 16, fontWeight: '600', color: colors.bg },
  skip: { alignItems: 'center', paddingVertical: 8 },
  skipText: { fontSize: 13, color: colors.textDim },
});
