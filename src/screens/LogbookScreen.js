import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl, ActivityIndicator,
} from 'react-native';
import { colors, radius, fonts } from '../lib/theme';
import { getLogbook } from '../lib/supabase';

function formatDate(ts) {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}


export default function LogbookScreen({ user }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try { setEntries(await getLogbook()); }
    catch (e) { console.error(e); }
  }, [user.id]);

  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const returned = entries.filter((e) => e.status === 'returned');
  const lost = entries.filter((e) => e.status === 'lost');
  const rate = entries.length > 0 ? Math.round((returned.length / entries.length) * 100) : null;

  if (loading) {
    return <View style={s.center}><ActivityIndicator color={colors.gold} /></View>;
  }

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}
    >
      <View style={s.heading}>
        <Text style={s.title}>Logbook</Text>
        <Text style={s.sub}>Your record on the water.</Text>
      </View>

      {rate !== null && (
        <View style={s.statsCard}>
          <View style={s.stat}>
            <Text style={s.statNum}>{entries.length}</Text>
            <Text style={s.statLabel}>Voyages</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.stat}>
            <Text style={[s.statNum, { color: colors.gold }]}>{returned.length}</Text>
            <Text style={s.statLabel}>Returned</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.stat}>
            <Text style={[s.statNum, { color: colors.rose }]}>{lost.length}</Text>
            <Text style={s.statLabel}>Lost</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.stat}>
            <Text style={s.statNum}>{rate}%</Text>
            <Text style={s.statLabel}>Rate</Text>
          </View>
        </View>
      )}

      {entries.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyText}>Your logbook is empty.{'\n'}Cast off to begin your record.</Text>
        </View>
      ) : (
        <View style={s.list}>
          {entries.map((v, idx) => {
            const isReturned = v.status === 'returned';
            const accentColor = isReturned ? colors.gold : colors.rose;
            return (
              <View
                key={v.id}
                style={[s.card, idx < entries.length - 1 && s.cardBorder]}
              >
                <View style={[s.accentBar, { backgroundColor: accentColor }]} />
                <View style={s.cardBody}>
                  <View style={s.cardTop}>
                    <View style={[s.statusChip, { borderColor: accentColor + '55' }]}>
                      <Text style={[s.statusChipText, { color: accentColor }]}>
                        {isReturned ? 'Returned' : 'Lost'}
                      </Text>
                    </View>
                    <Text style={s.date}>{formatDate(v.created_at)}</Text>
                  </View>

                  <Text style={s.goal}>{v.goal}</Text>

                  <View style={s.obstacleRow}>
                    <Text style={s.obstacleLabel}>Obstacle: </Text>
                    <Text style={s.obstacle}>{v.obstacle}</Text>
                  </View>

                  {!!v.reckoning && (
                    <View style={s.reckoningBlock}>
                      <View style={[s.reckoningBar, { backgroundColor: accentColor + '55' }]} />
                      <View style={s.reckoningContent}>
                        <Text style={[s.reckoningLabel, { color: accentColor }]}>Your reckoning</Text>
                        <Text style={s.reckoningText}>"{v.reckoning}"</Text>
                      </View>
                    </View>
                  )}

                  {v.acknowledgements.length > 0 && (
                    <View style={s.acksBlock}>
                      <Text style={s.acksLabel}>From the pier</Text>
                      {v.acknowledgements.map((a, i) => (
                        <Text key={i} style={s.ack}>
                          <Text style={s.ackHandle}>@{a.handle} </Text>
                          {a.acknowledgement}
                        </Text>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 22, paddingTop: 64, gap: 24, paddingBottom: 48 },
  center: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' },

  heading: { gap: 6 },
  title: { fontFamily: fonts.bold, fontSize: 32, color: colors.text, letterSpacing: -0.5 },
  sub: { fontFamily: fonts.light, fontSize: 14, color: colors.textMid },

  statsCard: {
    flexDirection: 'row',
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.borderStrong,
    paddingVertical: 18, paddingHorizontal: 8,
    alignItems: 'center',
  },
  stat: { flex: 1, alignItems: 'center', gap: 4 },
  statNum: { fontFamily: fonts.bold, fontSize: 24, color: colors.text },
  statLabel: { fontFamily: fonts.regular, fontSize: 10, color: colors.textDim, textTransform: 'uppercase', letterSpacing: 0.6 },
  statDivider: { width: 1, height: 32, backgroundColor: colors.border },

  list: {
    borderWidth: 1, borderColor: colors.borderStrong,
    borderRadius: radius.md, backgroundColor: colors.bgCard,
    overflow: 'hidden',
  },
  card: {
    flexDirection: 'row',
  },
  cardBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  accentBar: { width: 3 },
  cardBody: { flex: 1, padding: 20, gap: 12 },

  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusChip: {
    borderWidth: 1, borderRadius: 99,
    paddingHorizontal: 9, paddingVertical: 3,
  },
  statusChipText: { fontFamily: fonts.semiBold, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.8 },
  date: { fontFamily: fonts.regular, fontSize: 11, color: colors.textDim },

  goal: { fontFamily: fonts.regular, fontSize: 17, color: colors.text, lineHeight: 24 },

  obstacleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 2 },
  obstacleLabel: { fontFamily: fonts.semiBold, fontSize: 12, color: colors.textDim },
  obstacle: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMid, flex: 1 },

  reckoningBlock: { flexDirection: 'row', gap: 12 },
  reckoningBar: { width: 2, borderRadius: 1, alignSelf: 'stretch' },
  reckoningContent: { flex: 1, gap: 5 },
  reckoningLabel: { fontFamily: fonts.semiBold, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.9 },
  reckoningText: { fontFamily: fonts.italic, fontSize: 14, color: colors.text, lineHeight: 22 },

  acksBlock: { gap: 6 },
  acksLabel: { fontFamily: fonts.semiBold, fontSize: 10, color: colors.textDim, textTransform: 'uppercase', letterSpacing: 0.8 },
  ack: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMid, lineHeight: 20 },
  ackHandle: { fontFamily: fonts.semiBold, color: colors.blue },

  empty: { paddingVertical: 60, alignItems: 'center' },
  emptyText: { fontFamily: fonts.light, fontSize: 16, color: colors.textDim, textAlign: 'center', lineHeight: 26 },
});
