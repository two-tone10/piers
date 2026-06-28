import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, RefreshControl, ActivityIndicator,
} from 'react-native';
import { colors, radius } from '../lib/theme';
import {
  getMyVoyage, getOpenVoyages, getPierMembers,
  getActiveMembership, getSignals,
} from '../lib/supabase';

export default function HomeScreen({ user, navigation }) {
  const [myVoyage, setMyVoyage] = useState(null);
  const [pierMembers, setPierMembers] = useState([]);
  const [openVoyages, setOpenVoyages] = useState([]);
  const [membership, setMembership] = useState(null);
  const [signals, setSignals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [voyage, open, mem] = await Promise.all([
        getMyVoyage(user.id),
        getOpenVoyages(user.id),
        getActiveMembership(user.id),
      ]);
      setMyVoyage(voyage);
      setOpenVoyages(open);
      setMembership(mem);

      if (voyage) {
        const members = await getPierMembers(voyage.id);
        setPierMembers(members);
      }
      if (mem?.piers_voyages) {
        const s = await getSignals(mem.piers_voyages.id);
        setSignals(s);
      }
    } catch (e) {
      console.error(e);
    }
  }, [user.id]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}
    >
      <Text style={styles.wordmark}>Piers</Text>
      <Text style={styles.handle}>@{user.handle}</Text>

      {/* My Voyage */}
      {myVoyage ? (
        <TouchableOpacity
          style={[styles.card, styles.cardGold]}
          onPress={() => navigation.navigate('MyVoyage', { voyage: myVoyage, pierMembers })}
        >
          <Text style={styles.sectionLabel}>Your voyage</Text>
          <Text style={styles.voyageGoal}>{myVoyage.goal}</Text>
          <View style={styles.row}>
            <Text style={styles.statusChip}>
              {myVoyage.status === 'open' ? `⚓  Waiting for pier  (${pierMembers.length}/2)` : '⛵  Underway'}
            </Text>
          </View>
          <Text style={styles.cardHint}>Tap to view your pier →</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[styles.card, styles.cardDashed]}
          onPress={() => navigation.navigate('CastOff')}
        >
          <Text style={styles.castOffPrompt}>Set a voyage out to sea</Text>
          <Text style={styles.castOffSub}>Name your goal. Name your obstacle. Cast off.</Text>
          <Text style={styles.goldLink}>Cast off →</Text>
        </TouchableOpacity>
      )}

      {/* Active Pier Membership */}
      {membership?.piers_voyages && (
        <TouchableOpacity
          style={[styles.card, styles.cardBlue]}
          onPress={() => navigation.navigate('PierWatch', { membership, signals })}
        >
          <Text style={styles.sectionLabel}>You're standing on a pier</Text>
          <Text style={styles.voyageGoal}>{membership.piers_voyages.goal}</Text>
          <Text style={styles.cardHint}>Tap to send a signal or acknowledge →</Text>
        </TouchableOpacity>
      )}

      {/* Open Voyages */}
      <Text style={styles.sectionHeader}>Open water</Text>
      <Text style={styles.sectionSub}>
        Voyages waiting for a pier. Stand on one to watch them cross.
      </Text>

      {openVoyages.length === 0 ? (
        <Text style={styles.empty}>No voyages out yet. Be the first to cast off.</Text>
      ) : (
        openVoyages.map((v) => (
          <TouchableOpacity
            key={v.id}
            style={styles.card}
            onPress={() => navigation.navigate('JoinPier', { voyage: v })}
          >
            <Text style={styles.voyageHandle}>@{v.piers_users?.handle}</Text>
            <Text style={styles.voyageGoal}>{v.goal}</Text>
            <Text style={styles.goldLink}>Stand on their pier →</Text>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingTop: 60, gap: 16, paddingBottom: 40 },
  center: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' },
  wordmark: { fontSize: 32, fontWeight: '700', color: colors.gold, letterSpacing: -0.5 },
  handle: { fontSize: 13, color: colors.textMid, marginTop: -4 },
  sectionHeader: { fontSize: 18, fontWeight: '600', color: colors.text, marginTop: 8 },
  sectionSub: { fontSize: 13, color: colors.textMid, lineHeight: 18, marginTop: -8 },
  sectionLabel: {
    fontSize: 11, color: colors.textMid, textTransform: 'uppercase', letterSpacing: 0.8,
  },
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    gap: 8,
  },
  cardGold: { borderColor: colors.goldBorder, backgroundColor: colors.goldBg },
  cardBlue: { borderColor: colors.blueBorder, backgroundColor: colors.blueBg },
  cardDashed: { borderStyle: 'dashed', borderColor: colors.borderStrong },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  voyageHandle: { fontSize: 12, color: colors.textMid },
  voyageGoal: { fontSize: 16, color: colors.text, lineHeight: 22 },
  statusChip: { fontSize: 12, color: colors.gold },
  cardHint: { fontSize: 12, color: colors.textDim, marginTop: 4 },
  castOffPrompt: { fontSize: 18, fontWeight: '600', color: colors.text },
  castOffSub: { fontSize: 13, color: colors.textMid, lineHeight: 18 },
  goldLink: { fontSize: 13, color: colors.gold, marginTop: 4 },
  empty: { fontSize: 14, color: colors.textDim, textAlign: 'center', paddingVertical: 24 },
});
