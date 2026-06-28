import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl, ActivityIndicator,
} from 'react-native';
import { colors, radius, fonts } from '../lib/theme';
import { supabase } from '../lib/supabase';

function formatDate(ts) {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

async function getLogbook(userId) {
  const { data: voyages, error } = await supabase
    .from('piers_voyages')
    .select('*')
    .eq('user_id', userId)
    .in('status', ['returned', 'lost'])
    .order('created_at', { ascending: false })
    .limit(30);
  if (error) throw error;

  const ids = (voyages || []).map((v) => v.id);
  let ackMap = {};
  if (ids.length > 0) {
    const { data: acks } = await supabase
      .from('piers_pier_members')
      .select('voyage_id, acknowledgement, piers_users(handle)')
      .in('voyage_id', ids)
      .not('acknowledged_at', 'is', null);
    (acks || []).forEach((a) => {
      if (!ackMap[a.voyage_id]) ackMap[a.voyage_id] = [];
      ackMap[a.voyage_id].push(a);
    });
  }

  return (voyages || []).map((v) => ({ ...v, acknowledgements: ackMap[v.id] || [] }));
}

export default function LogbookScreen({ user }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setEntries(await getLogbook(user.id));
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

  const returned = entries.filter((e) => e.status === 'returned');
  const lost = entries.filter((e) => e.status === 'lost');
  const rate = entries.length > 0 ? Math.round((returned.length / entries.length) * 100) : null;

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
      <Text style={styles.title}>Logbook</Text>
      <Text style={styles.sub}>Your record on the water.</Text>

      {rate !== null && (
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statNum}>{entries.length}</Text>
            <Text style={styles.statLabel}>Voyages</Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statNum, { color: colors.gold }]}>{returned.length}</Text>
            <Text style={styles.statLabel}>Returned</Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statNum, { color: colors.rose }]}>{lost.length}</Text>
            <Text style={styles.statLabel}>Lost</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNum}>{rate}%</Text>
            <Text style={styles.statLabel}>Rate</Text>
          </View>
        </View>
      )}

      {entries.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Your logbook is empty. Cast off to begin your record.</Text>
        </View>
      ) : (
        entries.map((v) => (
          <View key={v.id} style={[styles.card, v.status === 'returned' ? styles.cardReturned : styles.cardLost]}>
            <View style={styles.row}>
              <Text style={v.status === 'returned' ? styles.statusReturned : styles.statusLost}>
                {v.status === 'returned' ? '⚓  Returned' : '🌊  Lost'}
              </Text>
              <Text style={styles.date}>{formatDate(v.created_at)}</Text>
            </View>

            <Text style={styles.goal}>{v.goal}</Text>

            <View style={styles.obstacleRow}>
              <Text style={styles.obstacleLabel}>Obstacle named: </Text>
              <Text style={styles.obstacle}>{v.obstacle}</Text>
            </View>

            {!!v.reckoning && (
              <View style={styles.reckoningBlock}>
                <Text style={styles.reckoningLabel}>Your reckoning</Text>
                <Text style={styles.reckoningText}>"{v.reckoning}"</Text>
              </View>
            )}

            {v.acknowledgements.length > 0 && (
              <View style={styles.acksBlock}>
                <Text style={styles.acksLabel}>From the pier</Text>
                {v.acknowledgements.map((a, i) => (
                  <Text key={i} style={styles.ack}>
                    <Text style={styles.ackHandle}>@{a.piers_users?.handle}: </Text>
                    {a.acknowledgement}
                  </Text>
                ))}
              </View>
            )}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingTop: 60, gap: 14, paddingBottom: 40 },
  center: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 28, fontWeight: '700', color: colors.text, letterSpacing: -0.5 },
  sub: { fontSize: 14, color: colors.textMid, marginTop: -6 },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    justifyContent: 'space-around',
  },
  stat: { alignItems: 'center', gap: 2 },
  statNum: { fontSize: 22, fontWeight: '700', color: colors.text },
  statLabel: { fontSize: 11, color: colors.textDim, textTransform: 'uppercase', letterSpacing: 0.5 },
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    gap: 10,
  },
  cardReturned: { borderColor: colors.goldBorder },
  cardLost: { borderColor: colors.roseBorder },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusReturned: { fontSize: 11, color: colors.gold },
  statusLost: { fontSize: 11, color: colors.rose },
  date: { fontSize: 11, color: colors.textDim },
  goal: { fontSize: 16, color: colors.text, lineHeight: 22 },
  obstacleRow: { flexDirection: 'row', flexWrap: 'wrap' },
  obstacleLabel: { fontSize: 12, color: colors.textDim },
  obstacle: { fontSize: 12, color: colors.textMid, flex: 1 },
  reckoningBlock: {
    backgroundColor: colors.goldBg,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.goldBorder,
    padding: 12,
    gap: 4,
  },
  reckoningLabel: { fontSize: 10, color: colors.gold, textTransform: 'uppercase', letterSpacing: 0.8 },
  reckoningText: { fontSize: 13, color: colors.text, lineHeight: 18, fontStyle: 'italic' },
  acksBlock: { gap: 6 },
  acksLabel: { fontSize: 10, color: colors.textDim, textTransform: 'uppercase', letterSpacing: 0.8 },
  ack: { fontSize: 13, color: colors.textMid, lineHeight: 18 },
  ackHandle: { color: colors.blue, fontWeight: '600' },
  empty: { paddingVertical: 40, alignItems: 'center' },
  emptyText: { fontSize: 14, color: colors.textDim, textAlign: 'center', lineHeight: 20 },
});
