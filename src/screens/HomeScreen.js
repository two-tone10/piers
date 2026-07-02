import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, Alert, Modal,
} from 'react-native';
import { colors, radius, fonts } from '../lib/theme';
import {
  getMyVoyage, getOpenVoyages, getPierMembers,
  getActiveMemberships, seedOpenVoyages, seedPierMembers,
} from '../lib/supabase';

function timeLeft(expiresAt) {
  const diff = new Date(expiresAt) - Date.now();
  if (diff <= 0) return 'Expired';
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return `${days}d ${hours}h left`;
  return `${hours}h left`;
}

function PierDots({ filled, total = 2 }) {
  return (
    <View style={s.dotsRow}>
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} style={[s.dot, i < filled ? s.dotFilled : s.dotEmpty]} />
      ))}
      <Text style={s.dotsLabel}>
        {filled >= total ? 'Pier full' : `${total - filled} spot${total - filled > 1 ? 's' : ''} open`}
      </Text>
    </View>
  );
}

export default function HomeScreen({ user, navigation }) {
  const [myVoyage, setMyVoyage] = useState(null);
  const [pierMembers, setPierMembers] = useState([]);
  const [openVoyages, setOpenVoyages] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [devVisible, setDevVisible] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const load = useCallback(async () => {
    try {
      const [voyage, open, mems] = await Promise.all([
        getMyVoyage(user.id),
        getOpenVoyages(user.id),
        getActiveMemberships(user.id),
      ]);
      setMyVoyage(voyage);
      setOpenVoyages(open);
      setMemberships(mems);
      if (voyage) setPierMembers(await getPierMembers(voyage.id));
    } catch (e) { console.error(e); }
  }, [user.id]);

  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);
  useEffect(() => { const u = navigation.addListener('focus', load); return u; }, [navigation, load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  async function devSeedVoyages() {
    setSeeding(true);
    try { await seedOpenVoyages(); await load(); setDevVisible(false); }
    catch (e) { Alert.alert('Failed', e.message); }
    finally { setSeeding(false); }
  }

  async function devFillPier() {
    if (!myVoyage) return Alert.alert('No goal set', 'Set a goal first, then fill your pier.');
    setSeeding(true);
    try { await seedPierMembers(myVoyage.id); await load(); setDevVisible(false); }
    catch (e) { Alert.alert('Failed', e.message); }
    finally { setSeeding(false); }
  }

  if (loading) return <View style={s.center}><ActivityIndicator color={colors.gold} /></View>;

  const needsReckoning = myVoyage && ['returned', 'lost'].includes(myVoyage.status) && !myVoyage.reckoning_at;
  const hasActiveGoal = myVoyage && ['open', 'underway'].includes(myVoyage.status);
  const canJoinMore = memberships.length < 3;
  const isUnderway = myVoyage?.status === 'underway';

  return (
    <>
      <ScrollView
        style={s.container}
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}
      >
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.wordmark}>Piers</Text>
            <Text style={s.handle}>@{user.handle}</Text>
          </View>
          <TouchableOpacity style={s.devBtn} onPress={() => setDevVisible(true)}>
            <Text style={s.devBtnText}>Dev</Text>
          </TouchableOpacity>
        </View>

        {/* Reckoning prompt */}
        {needsReckoning && (
          <TouchableOpacity
            style={s.reckoningCard}
            onPress={() => navigation.navigate('Reckoning', { voyage: myVoyage })}
          >
            <Text style={s.reckoningLabel}>
              {myVoyage.status === 'returned' ? 'You completed your goal' : 'The week has passed'}
            </Text>
            <Text style={s.reckoningGoal} numberOfLines={2}>{myVoyage.goal}</Text>
            <Text style={s.reckoningCta}>Write your reckoning →</Text>
          </TouchableOpacity>
        )}

        {/* ── YOUR GOAL ── */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>Your goal</Text>
          {hasActiveGoal ? (
            <TouchableOpacity
              style={[s.goalCard, isUnderway && s.goalCardUnderway]}
              onPress={() => navigation.navigate('MyVoyage', { voyage: myVoyage, pierMembers })}
              activeOpacity={0.8}
            >
              <View style={s.goalCardTop}>
                <Text style={s.goalStatusChip}>
                  {myVoyage.status === 'open' ? 'Seeking support' : 'Underway'}
                </Text>
                <Text style={s.goalTimeLeft}>{timeLeft(myVoyage.expires_at)}</Text>
              </View>
              <Text style={s.goalText}>{myVoyage.goal}</Text>
              <View style={s.goalCardBottom}>
                <PierDots filled={pierMembers.length} />
                <Text style={s.goalViewCta}>View →</Text>
              </View>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={s.castOffCard} onPress={() => navigation.navigate('CastOff')} activeOpacity={0.8}>
              <Text style={s.castOffEyebrow}>This week</Text>
              <Text style={s.castOffHeadline}>Set your goal.</Text>
              <Text style={s.castOffBody}>
                Name what you will do.{'\n'}
                Name your biggest obstacle.{'\n'}
                Send it out. Two others will stand witness.
              </Text>
              <View style={s.castOffBtn}>
                <Text style={s.castOffBtnText}>Cast off →</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* ── STANDING ON ── */}
        {memberships.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionLabel}>Standing on</Text>
            {memberships.map((m) => {
              const v = m.piers_voyages;
              if (!v) return null;
              const ended = ['returned', 'lost'].includes(v.status);
              return (
                <TouchableOpacity
                  key={m.id}
                  style={s.membershipCard}
                  onPress={() => navigation.navigate('PierWatch', { membership: m })}
                  activeOpacity={0.8}
                >
                  <View style={s.membershipTop}>
                    <Text style={s.membershipHandle}>@{v.piers_users?.handle}</Text>
                    <Text style={[s.membershipStatus, ended && s.membershipStatusEnded]}>
                      {v.status === 'open' ? 'Seeking support' : v.status === 'underway' ? 'Underway' : v.status === 'returned' ? 'Returned' : 'Ended'}
                    </Text>
                  </View>
                  <Text style={s.membershipGoal} numberOfLines={2}>{v.goal}</Text>
                  <Text style={s.membershipCta}>Their pier →</Text>
                </TouchableOpacity>
              );
            })}
            {canJoinMore && (
              <View style={s.capacityRow}>
                <Text style={s.capacityText}>{memberships.length} of 3 — room for {3 - memberships.length} more</Text>
              </View>
            )}
          </View>
        )}

        {/* ── GOALS SEEKING SUPPORT ── */}
        {(openVoyages.length > 0 || memberships.length === 0) && (
          <View style={s.section}>
            <Text style={s.sectionLabel}>Goals seeking support</Text>
            <Text style={s.sectionSub}>Two people needed for each.</Text>

            {!canJoinMore ? (
              <View style={s.fullNotice}>
                <Text style={s.fullNoticeText}>
                  You're supporting three people — that's the limit.
                  Acknowledge someone when their voyage ends to make room.
                </Text>
              </View>
            ) : openVoyages.length === 0 ? (
              <Text style={s.emptyText}>No goals out yet. Be the first.</Text>
            ) : (
              openVoyages.map((v) => (
                <TouchableOpacity
                  key={v.id}
                  style={s.openCard}
                  onPress={() => navigation.navigate('JoinPier', { voyage: v })}
                  activeOpacity={0.8}
                >
                  <Text style={s.openHandle}>@{v.piers_users?.handle}</Text>
                  <Text style={s.openGoal}>{v.goal}</Text>
                  <Text style={s.openCta}>Stand on their pier →</Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* Dev panel */}
      <Modal visible={devVisible} transparent animationType="slide">
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setDevVisible(false)}>
          <View style={s.sheet}>
            <View style={s.sheetHandle} />
            <Text style={s.sheetTitle}>Dev Tools</Text>
            <Text style={s.sheetSub}>Simulate other users to test the full flow.</Text>
            <TouchableOpacity style={s.sheetBtn} onPress={devSeedVoyages} disabled={seeding}>
              {seeding ? <ActivityIndicator color={colors.bg} /> : <Text style={s.sheetBtnText}>Seed 3 open goals</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={[s.sheetBtn, { backgroundColor: colors.blue }]} onPress={devFillPier} disabled={seeding}>
              {seeding ? <ActivityIndicator color={colors.bg} /> : <Text style={s.sheetBtnText}>Fill my pier with 2 fake supporters</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={s.sheetCancel} onPress={() => setDevVisible(false)}>
              <Text style={s.sheetCancelText}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { paddingTop: 60, paddingBottom: 48, gap: 28 },
  center: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: 22,
  },
  wordmark: { fontFamily: fonts.bold, fontSize: 32, color: colors.gold, letterSpacing: 1 },
  handle: { fontFamily: fonts.light, fontSize: 13, color: colors.textMid, marginTop: 2 },
  devBtn: {
    backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 6, marginTop: 6,
  },
  devBtnText: { fontFamily: fonts.semiBold, fontSize: 11, color: colors.textDim, letterSpacing: 0.5 },

  reckoningCard: {
    marginHorizontal: 22,
    backgroundColor: colors.roseBg, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.roseBorder,
    padding: 20, gap: 8,
  },
  reckoningLabel: { fontFamily: fonts.semiBold, fontSize: 11, color: colors.rose, textTransform: 'uppercase', letterSpacing: 0.8 },
  reckoningGoal: { fontFamily: fonts.regular, fontSize: 15, color: colors.text, lineHeight: 22 },
  reckoningCta: { fontFamily: fonts.semiBold, fontSize: 13, color: colors.rose },

  section: { gap: 12, paddingHorizontal: 22 },
  sectionLabel: {
    fontFamily: fonts.semiBold, fontSize: 11, color: colors.textDim,
    textTransform: 'uppercase', letterSpacing: 1.2,
  },
  sectionSub: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMid, marginTop: -4 },

  // Goal card — active
  goalCard: {
    backgroundColor: colors.goldBg,
    borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.goldBorder,
    padding: 22, gap: 14,
  },
  goalCardUnderway: {
    borderColor: colors.gold,
  },
  goalCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  goalStatusChip: { fontFamily: fonts.semiBold, fontSize: 10, color: colors.gold, textTransform: 'uppercase', letterSpacing: 0.9 },
  goalTimeLeft: { fontFamily: fonts.regular, fontSize: 12, color: colors.textDim },
  goalText: { fontFamily: fonts.regular, fontSize: 19, color: colors.text, lineHeight: 28 },
  goalCardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  goalViewCta: { fontFamily: fonts.semiBold, fontSize: 13, color: colors.gold },

  dotsRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  dot: { width: 9, height: 9, borderRadius: 5 },
  dotFilled: { backgroundColor: colors.gold },
  dotEmpty: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.gold },
  dotsLabel: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMid },

  // Cast off invitation card
  castOffCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    padding: 26, gap: 12,
  },
  castOffEyebrow: { fontFamily: fonts.semiBold, fontSize: 10, color: colors.textDim, textTransform: 'uppercase', letterSpacing: 1.2 },
  castOffHeadline: { fontFamily: fonts.boldItalic, fontSize: 26, color: colors.text, lineHeight: 32 },
  castOffBody: { fontFamily: fonts.light, fontSize: 15, color: colors.textMid, lineHeight: 24 },
  castOffBtn: {
    alignSelf: 'flex-start',
    backgroundColor: colors.gold,
    borderRadius: radius.sm,
    paddingHorizontal: 20, paddingVertical: 11, marginTop: 4,
  },
  castOffBtnText: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.bg },

  // Membership cards
  membershipCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.blueBorder,
    padding: 18, gap: 8,
  },
  membershipTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  membershipHandle: { fontFamily: fonts.semiBold, fontSize: 13, color: colors.blue },
  membershipStatus: { fontFamily: fonts.regular, fontSize: 11, color: colors.textDim },
  membershipStatusEnded: { color: colors.rose },
  membershipGoal: { fontFamily: fonts.regular, fontSize: 15, color: colors.text, lineHeight: 22 },
  membershipCta: { fontFamily: fonts.semiBold, fontSize: 12, color: colors.blue },
  capacityRow: { paddingTop: 2 },
  capacityText: { fontFamily: fonts.regular, fontSize: 12, color: colors.textDim },

  // Open voyages
  openCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    padding: 18, gap: 8,
  },
  openHandle: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMid },
  openGoal: { fontFamily: fonts.regular, fontSize: 15, color: colors.text, lineHeight: 22 },
  openCta: { fontFamily: fonts.semiBold, fontSize: 12, color: colors.gold },

  fullNotice: {
    backgroundColor: colors.bgCard, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, padding: 18,
  },
  fullNoticeText: { fontFamily: fonts.regular, fontSize: 14, color: colors.textMid, lineHeight: 22 },
  emptyText: { fontFamily: fonts.regular, fontSize: 14, color: colors.textDim },

  // Dev sheet
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.bgCard,
    borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg,
    padding: 24, paddingBottom: 44, gap: 12,
    borderWidth: 1, borderColor: colors.borderStrong,
  },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.borderStrong, alignSelf: 'center', marginBottom: 4 },
  sheetTitle: { fontFamily: fonts.bold, fontSize: 20, color: colors.text },
  sheetSub: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMid, marginTop: -4 },
  sheetBtn: { backgroundColor: colors.gold, borderRadius: radius.md, paddingVertical: 15, alignItems: 'center' },
  sheetBtnText: { fontFamily: fonts.semiBold, fontSize: 15, color: colors.bg },
  sheetCancel: { alignItems: 'center', paddingVertical: 8 },
  sheetCancelText: { fontFamily: fonts.regular, fontSize: 14, color: colors.textDim },
});
