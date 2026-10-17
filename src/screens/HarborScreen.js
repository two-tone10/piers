import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator,
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

export default function HarborScreen({ navigation }) {
  const [voyages, setVoyages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try { setVoyages(await getHarbor()); }
    catch (e) { console.error(e); }
  }, []);

  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

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
        <Text style={s.title}>The Harbor</Text>
        <Text style={s.sub}>Voyages that made it back.</Text>
      </View>

      {voyages.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyTitle}>The harbor is quiet.</Text>
          <Text style={s.emptyBody}>
            Completed voyages appear here. When someone returns from a week's goal,
            their reckoning is recorded in the harbor.
          </Text>
          <View style={s.emptyActions}>
            <TouchableOpacity
              style={s.emptyBtn}
              onPress={() => navigation.navigate('CastOff')}
            >
              <Text style={s.emptyBtnText}>Set your own goal →</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('Home')}>
              <Text style={s.emptyLink}>Find a pier to stand on</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={s.list}>
          {voyages.map((v, idx) => (
            <View key={v.id} style={[s.card, idx < voyages.length - 1 && s.cardBorder]}>
              <View style={s.cardTop}>
                <Text style={s.handle}>@{v.piers_users?.handle}</Text>
                <Text style={s.when}>{timeAgo(v.completed_at)}</Text>
              </View>

              <Text style={s.goal}>{v.goal}</Text>

              {!!v.reckoning && (
                <View style={s.reckoningBlock}>
                  <View style={s.reckoningBar} />
                  <View style={s.reckoningContent}>
                    <Text style={s.reckoningLabel}>Their reckoning</Text>
                    <Text style={s.reckoningText}>"{v.reckoning}"</Text>
                  </View>
                </View>
              )}

              <Text style={s.returnedLabel}>Returned</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 22, paddingTop: 64, paddingBottom: 124, gap: 28 },
  center: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' },

  heading: { gap: 6 },
  title: { fontFamily: fonts.bold, fontSize: 32, color: colors.text, letterSpacing: -0.5 },
  sub: { fontFamily: fonts.light, fontSize: 14, color: colors.textMid },

  list: {
    borderWidth: 1, borderColor: colors.borderStrong,
    borderRadius: radius.md, backgroundColor: colors.bgCard,
    overflow: 'hidden',
  },
  card: {
    padding: 22, gap: 12,
  },
  cardBorder: {
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  cardTop: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  handle: { fontFamily: fonts.semiBold, fontSize: 13, color: colors.textMid },
  when: { fontFamily: fonts.regular, fontSize: 11, color: colors.textDim },

  goal: {
    fontFamily: fonts.regular, fontSize: 18, color: colors.text, lineHeight: 26,
  },

  reckoningBlock: {
    flexDirection: 'row', gap: 14, marginTop: 4,
  },
  reckoningBar: {
    width: 2, borderRadius: 1, backgroundColor: colors.goldBorder, alignSelf: 'stretch',
  },
  reckoningContent: { flex: 1, gap: 6 },
  reckoningLabel: {
    fontFamily: fonts.semiBold, fontSize: 10, color: colors.gold,
    textTransform: 'uppercase', letterSpacing: 0.9,
  },
  reckoningText: {
    fontFamily: fonts.italic, fontSize: 15, color: colors.text, lineHeight: 23,
  },

  returnedLabel: {
    fontFamily: fonts.semiBold, fontSize: 10, color: colors.gold,
    textTransform: 'uppercase', letterSpacing: 1,
  },

  empty: { paddingVertical: 48, gap: 20 },
  emptyTitle: {
    fontFamily: fonts.boldItalic, fontSize: 22, color: colors.text,
  },
  emptyBody: {
    fontFamily: fonts.light, fontSize: 15, color: colors.textMid,
    lineHeight: 24,
  },
  emptyActions: { gap: 14, marginTop: 8 },
  emptyBtn: {
    backgroundColor: colors.blue,
    borderRadius: radius.md,
    paddingVertical: 15, paddingHorizontal: 20,
    alignSelf: 'flex-start',
  },
  emptyBtnText: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.bg },
  emptyLink: {
    fontFamily: fonts.regular, fontSize: 14, color: colors.textMid,
    textDecorationLine: 'underline',
  },
});
