import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl, ActivityIndicator,
} from 'react-native';
import { colors, radius, fonts } from '../lib/theme';
import { supabase } from '../lib/supabase';

function timeAgo(ts) {
  const diff = Date.now() - new Date(ts);
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  return `${days} days ago`;
}

async function getHarbor() {
  const { data, error } = await supabase
    .from('piers_voyages')
    .select('*, piers_users(handle)')
    .eq('status', 'returned')
    .order('completed_at', { ascending: false })
    .limit(40);
  if (error) throw error;
  return data || [];
}

export default function HarborScreen() {
  const [voyages, setVoyages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setVoyages(await getHarbor());
    } catch (e) {
      console.error(e);
    }
  }, []);

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
      <Text style={styles.title}>The Harbor</Text>
      <Text style={styles.sub}>Voyages that made it back.</Text>

      {voyages.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>The harbor is quiet. Be the first to return.</Text>
        </View>
      ) : (
        voyages.map((v) => (
          <View key={v.id} style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.handle}>@{v.piers_users?.handle}</Text>
              <Text style={styles.when}>{timeAgo(v.completed_at)}</Text>
            </View>
            <Text style={styles.goal}>{v.goal}</Text>
            {!!v.reckoning && (
              <View style={styles.reckoningBlock}>
                <Text style={styles.reckoningLabel}>Their reckoning</Text>
                <Text style={styles.reckoningText}>"{v.reckoning}"</Text>
              </View>
            )}
            <Text style={styles.returned}>⚓  Returned</Text>
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
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    gap: 8,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  handle: { fontSize: 12, color: colors.textMid },
  when: { fontSize: 11, color: colors.textDim },
  goal: { fontSize: 16, color: colors.text, lineHeight: 22 },
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
  returned: { fontSize: 11, color: colors.gold },
  empty: { paddingVertical: 40, alignItems: 'center' },
  emptyText: { fontSize: 14, color: colors.textDim, textAlign: 'center' },
});
