import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TouchableWithoutFeedback,
  StyleSheet, RefreshControl, ActivityIndicator, Alert, Modal,
} from 'react-native';
import { colors, radius } from '../lib/theme';
import {
  getMyVoyage, getOpenVoyages, getPierMembers,
  getActiveMembership, getSignals, seedOpenVoyages, seedPierMembers,
} from '../lib/supabase';

export default function HomeScreen({ user, navigation }) {
  const [myVoyage, setMyVoyage] = useState(null);
  const [pierMembers, setPierMembers] = useState([]);
  const [openVoyages, setOpenVoyages] = useState([]);
  const [membership, setMembership] = useState(null);
  const [signals, setSignals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [devVisible, setDevVisible] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const longPressTimer = useRef(null);

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

  // Refresh when navigating back to home
  useEffect(() => {
    const unsub = navigation.addListener('focus', () => load());
    return unsub;
  }, [navigation, load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const startLongPress = () => {
    longPressTimer.current = setTimeout(() => setDevVisible(true), 800);
  };
  const cancelLongPress = () => clearTimeout(longPressTimer.current);

  async function devSeedVoyages() {
    setSeeding(true);
    try {
      await seedOpenVoyages();
      await load();
      setDevVisible(false);
    } catch (e) {
      Alert.alert('Seed failed', e.message);
    } finally {
      setSeeding(false);
    }
  }

  async function devFillPier() {
    if (!myVoyage) return Alert.alert('No voyage', 'Cast off first, then fill your pier.');
    setSeeding(true);
    try {
      await seedPierMembers(myVoyage.id);
      await load();
      setDevVisible(false);
    } catch (e) {
      Alert.alert('Fill failed', e.message);
    } finally {
      setSeeding(false);
    }
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={colors.gold} /></View>;
  }

  const needsReckoning = myVoyage && ['returned', 'lost'].includes(myVoyage.status) && !myVoyage.reckoning_at;

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}
      >
        <TouchableWithoutFeedback onPressIn={startLongPress} onPressOut={cancelLongPress}>
          <View>
            <Text style={styles.wordmark}>Piers</Text>
            <Text style={styles.handle}>@{user.handle}</Text>
          </View>
        </TouchableWithoutFeedback>

        {/* Reckoning prompt */}
        {needsReckoning && (
          <TouchableOpacity
            style={[styles.card, styles.cardRose]}
            onPress={() => navigation.navigate('Reckoning', { voyage: myVoyage })}
          >
            <Text style={styles.sectionLabel}>
              {myVoyage.status === 'returned' ? 'You made it back' : 'The week expired'}
            </Text>
            <Text style={styles.voyageGoal}>{myVoyage.goal}</Text>
            <Text style={styles.goldLink}>Write your reckoning →</Text>
          </TouchableOpacity>
        )}

        {/* My Voyage */}
        {!needsReckoning && myVoyage && (
          <TouchableOpacity
            style={[styles.card, styles.cardGold]}
            onPress={() => navigation.navigate('MyVoyage', { voyage: myVoyage, pierMembers })}
          >
            <Text style={styles.sectionLabel}>Your voyage</Text>
            <Text style={styles.voyageGoal}>{myVoyage.goal}</Text>
            <Text style={styles.statusChip}>
              {myVoyage.status === 'open'
                ? `⚓  Waiting for pier  (${pierMembers.length}/2)`
                : '⛵  Underway'}
            </Text>
            <Text style={styles.cardHint}>Tap to view your pier →</Text>
          </TouchableOpacity>
        )}

        {/* No voyage */}
        {!myVoyage && (
          <TouchableOpacity
            style={[styles.card, styles.cardDashed]}
            onPress={() => navigation.navigate('CastOff')}
          >
            <Text style={styles.castOffPrompt}>Set a voyage out to sea</Text>
            <Text style={styles.castOffSub}>Name your goal. Name your obstacle. Cast off.</Text>
            <Text style={styles.goldLink}>Cast off →</Text>
          </TouchableOpacity>
        )}

        {/* Active pier membership */}
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

        {/* Open water */}
        <Text style={styles.sectionHeader}>Open water</Text>
        <Text style={styles.sectionSub}>Voyages waiting for a pier.</Text>

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

      {/* Dev panel */}
      <Modal visible={devVisible} transparent animationType="fade">
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setDevVisible(false)}>
          <View style={styles.devPanel}>
            <Text style={styles.devTitle}>Dev Tools</Text>
            <Text style={styles.devSub}>Long-press the wordmark to open this.</Text>

            <TouchableOpacity style={styles.devBtn} onPress={devSeedVoyages} disabled={seeding}>
              {seeding ? <ActivityIndicator color={colors.bg} /> : <Text style={styles.devBtnText}>Seed 3 open voyages</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={[styles.devBtn, styles.devBtnBlue]} onPress={devFillPier} disabled={seeding}>
              {seeding ? <ActivityIndicator color={colors.bg} /> : <Text style={styles.devBtnText}>Fill my pier (2 fake members)</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={styles.devCancel} onPress={() => setDevVisible(false)}>
              <Text style={styles.devCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingTop: 60, gap: 16, paddingBottom: 40 },
  center: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' },
  wordmark: { fontSize: 32, fontWeight: '700', color: colors.gold, letterSpacing: -0.5 },
  handle: { fontSize: 13, color: colors.textMid, marginTop: -2 },
  sectionHeader: { fontSize: 18, fontWeight: '600', color: colors.text, marginTop: 8 },
  sectionSub: { fontSize: 13, color: colors.textMid, lineHeight: 18, marginTop: -8 },
  sectionLabel: { fontSize: 11, color: colors.textMid, textTransform: 'uppercase', letterSpacing: 0.8 },
  card: {
    backgroundColor: colors.bgCard, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, padding: 20, gap: 8,
  },
  cardGold: { borderColor: colors.goldBorder, backgroundColor: colors.goldBg },
  cardBlue: { borderColor: colors.blueBorder, backgroundColor: colors.blueBg },
  cardRose: { borderColor: colors.roseBorder, backgroundColor: colors.roseBg },
  cardDashed: { borderStyle: 'dashed', borderColor: colors.borderStrong },
  voyageHandle: { fontSize: 12, color: colors.textMid },
  voyageGoal: { fontSize: 16, color: colors.text, lineHeight: 22 },
  statusChip: { fontSize: 12, color: colors.gold },
  cardHint: { fontSize: 12, color: colors.textDim, marginTop: 4 },
  castOffPrompt: { fontSize: 18, fontWeight: '600', color: colors.text },
  castOffSub: { fontSize: 13, color: colors.textMid, lineHeight: 18 },
  goldLink: { fontSize: 13, color: colors.gold, marginTop: 4 },
  empty: { fontSize: 14, color: colors.textDim, textAlign: 'center', paddingVertical: 24 },
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  devPanel: {
    backgroundColor: colors.bgCard, borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg, padding: 24, gap: 12,
    borderWidth: 1, borderColor: colors.border,
  },
  devTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  devSub: { fontSize: 12, color: colors.textDim, marginTop: -4 },
  devBtn: {
    backgroundColor: colors.gold, borderRadius: radius.md,
    paddingVertical: 14, alignItems: 'center',
  },
  devBtnBlue: { backgroundColor: colors.blue },
  devBtnText: { fontSize: 15, fontWeight: '600', color: colors.bg },
  devCancel: { alignItems: 'center', paddingVertical: 8 },
  devCancelText: { fontSize: 14, color: colors.textDim },
});
