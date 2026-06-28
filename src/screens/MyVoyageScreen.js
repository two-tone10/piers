import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { colors, radius } from '../lib/theme';
import { sailHome } from '../lib/supabase';

function timeLeft(expiresAt) {
  const diff = new Date(expiresAt) - Date.now();
  if (diff <= 0) return 'Expired';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `${days}d ${hours}h remaining`;
  return `${hours}h remaining`;
}

export default function MyVoyageScreen({ route, navigation }) {
  const { voyage, pierMembers = [] } = route.params;
  const [loading, setLoading] = useState(false);

  function confirmReturn() {
    Alert.alert(
      'Sail home?',
      'Mark this voyage as complete. Your pier will be notified.',
      [
        { text: 'Not yet', style: 'cancel' },
        { text: 'I made it back', style: 'default', onPress: doSailHome },
      ]
    );
  }

  async function doSailHome() {
    setLoading(true);
    try {
      await sailHome(voyage.id);
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }

  const isUnderway = voyage.status === 'underway';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Your voyage</Text>
      <Text style={styles.timer}>{timeLeft(voyage.expires_at)}</Text>

      <View style={[styles.card, styles.cardGold]}>
        <Text style={styles.fieldLabel}>Goal</Text>
        <Text style={styles.goalText}>{voyage.goal}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.fieldLabel}>Biggest obstacle</Text>
        <Text style={styles.obstacleText}>{voyage.obstacle}</Text>
      </View>

      {/* Pier */}
      <Text style={styles.sectionHeader}>Your pier</Text>
      {pierMembers.length === 0 ? (
        <Text style={styles.empty}>Your pier is empty. Others will see your voyage in open water.</Text>
      ) : (
        pierMembers.map((m) => (
          <View key={m.id} style={styles.memberRow}>
            <Text style={styles.memberHandle}>@{m.piers_users?.handle}</Text>
            <Text style={styles.memberJoined}>Standing since {new Date(m.joined_at).toLocaleDateString()}</Text>
          </View>
        ))
      )}

      {pierMembers.length < 2 && (
        <View style={styles.waitingNotice}>
          <Text style={styles.waitingText}>
            ⚓  Waiting for {2 - pierMembers.length} more to stand on your pier
          </Text>
        </View>
      )}

      {isUnderway && (
        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={confirmReturn}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color={colors.bg} />
            : <Text style={styles.btnText}>I made it back ⚓</Text>}
        </TouchableOpacity>
      )}

      <Text style={styles.fine}>
        Your pier cannot interact with your voyage until you return or the week expires.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 24, paddingTop: 60, gap: 16, paddingBottom: 40 },
  back: { marginBottom: 4 },
  backText: { color: colors.textMid, fontSize: 14 },
  title: { fontSize: 28, fontWeight: '700', color: colors.text, letterSpacing: -0.5 },
  timer: { fontSize: 13, color: colors.textMid },
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
  sectionHeader: { fontSize: 16, fontWeight: '600', color: colors.text, marginTop: 8 },
  memberRow: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 2,
  },
  memberHandle: { fontSize: 15, color: colors.text },
  memberJoined: { fontSize: 12, color: colors.textDim },
  waitingNotice: {
    backgroundColor: colors.goldBg,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.goldBorder,
    padding: 14,
  },
  waitingText: { fontSize: 13, color: colors.gold },
  empty: { fontSize: 14, color: colors.textDim, lineHeight: 20 },
  btn: {
    backgroundColor: colors.gold,
    borderRadius: radius.md,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { fontSize: 16, fontWeight: '600', color: colors.bg },
  fine: { fontSize: 12, color: colors.textDim, textAlign: 'center', lineHeight: 18 },
});
