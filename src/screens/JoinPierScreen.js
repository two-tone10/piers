import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { colors, radius } from '../lib/theme';
import { joinPier } from '../lib/supabase';

export default function JoinPierScreen({ route, navigation, user }) {
  const { voyage } = route.params;
  const [loading, setLoading] = useState(false);

  async function handleJoin() {
    setLoading(true);
    try {
      await joinPier({ voyageId: voyage.id, userId: user.id });
      navigation.goBack();
    } catch (e) {
      Alert.alert('Can\'t stand here', e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
        <Text style={styles.backText}>← Back to open water</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Stand on their pier</Text>
      <Text style={styles.sub}>
        You will watch this voyage from the shore. You can send signals during the week.
        Once they return — or the week expires — you can acknowledge them.
      </Text>

      <View style={[styles.card, styles.cardGold]}>
        <Text style={styles.fieldLabel}>Their goal this week</Text>
        <Text style={styles.goalText}>{voyage.goal}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.fieldLabel}>Their biggest obstacle</Text>
        <Text style={styles.obstacleText}>{voyage.obstacle}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.fieldLabel}>Set out by</Text>
        <Text style={styles.metaText}>@{voyage.piers_users?.handle}</Text>
        <Text style={styles.metaText}>
          Expires {new Date(voyage.expires_at).toLocaleDateString()}
        </Text>
      </View>

      <View style={styles.rulesCard}>
        <Text style={styles.rulesTitle}>Rules of the pier</Text>
        <Text style={styles.rule}>⚓  You can only stand on one pier at a time.</Text>
        <Text style={styles.rule}>⛵  You must have your own voyage out to sea.</Text>
        <Text style={styles.rule}>📡  You can send signals — quotes, words — during the week.</Text>
        <Text style={styles.rule}>🤐  You cannot comment, question, or intervene.</Text>
        <Text style={styles.rule}>🎉  You can acknowledge when they return or the week ends.</Text>
      </View>

      <TouchableOpacity
        style={[styles.btn, loading && styles.btnDisabled]}
        onPress={handleJoin}
        disabled={loading}
      >
        {loading
          ? <ActivityIndicator color={colors.bg} />
          : <Text style={styles.btnText}>Stand on this pier</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 24, paddingTop: 60, gap: 16, paddingBottom: 40 },
  back: { marginBottom: 4 },
  backText: { color: colors.textMid, fontSize: 14 },
  title: { fontSize: 28, fontWeight: '700', color: colors.text, letterSpacing: -0.5 },
  sub: { fontSize: 14, color: colors.textMid, lineHeight: 20 },
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    gap: 8,
  },
  cardGold: { borderColor: colors.goldBorder, backgroundColor: colors.goldBg },
  fieldLabel: {
    fontSize: 11, color: colors.textMid, textTransform: 'uppercase', letterSpacing: 0.8,
  },
  goalText: { fontSize: 18, color: colors.text, lineHeight: 26 },
  obstacleText: { fontSize: 15, color: colors.textMid, lineHeight: 22 },
  metaText: { fontSize: 14, color: colors.text },
  rulesCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    gap: 10,
  },
  rulesTitle: { fontSize: 13, color: colors.textMid, fontWeight: '600', marginBottom: 4 },
  rule: { fontSize: 13, color: colors.textMid, lineHeight: 20 },
  btn: {
    backgroundColor: colors.gold,
    borderRadius: radius.md,
    paddingVertical: 16,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { fontSize: 16, fontWeight: '600', color: colors.bg },
});
