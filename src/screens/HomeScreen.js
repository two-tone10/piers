import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, Alert, Modal, Dimensions,
} from 'react-native';
import { colors, radius, fonts } from '../lib/theme';
import {
  getMyVoyage, getOpenVoyages, getPierMembers,
  getActiveMemberships, seedOpenVoyages, seedPierMembers,
} from '../lib/supabase';

const { width: W } = Dimensions.get('window');
const BOX = (W - 48) / 2;

function QuickBox({ label, title, sub, accent, onPress, disabled }) {
  return (
    <TouchableOpacity
      style={[s.box, accent && s.boxAccent, disabled && s.boxDisabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.75}
    >
      <Text style={[s.boxLabel, accent && s.boxLabelAccent]}>{label}</Text>
      <Text style={[s.boxTitle, accent && s.boxTitleAccent]}>{title}</Text>
      {!!sub && <Text style={[s.boxSub, accent && s.boxSubAccent]}>{sub}</Text>}
    </TouchableOpacity>
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
    if (!myVoyage) return Alert.alert('No goal set', 'Set a goal first, then fill your supporters.');
    setSeeding(true);
    try { await seedPierMembers(myVoyage.id); await load(); setDevVisible(false); }
    catch (e) { Alert.alert('Failed', e.message); }
    finally { setSeeding(false); }
  }

  if (loading) return <View style={s.center}><ActivityIndicator color={colors.gold} /></View>;

  const needsReckoning = myVoyage && ['returned', 'lost'].includes(myVoyage.status) && !myVoyage.reckoning_at;
  const hasActiveGoal = myVoyage && ['open', 'underway'].includes(myVoyage.status);
  const canJoinMore = memberships.length < 3;

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
            style={[s.fullCard, s.fullCardRose]}
            onPress={() => navigation.navigate('Reckoning', { voyage: myVoyage })}
          >
            <Text style={s.fullCardLabel}>
              {myVoyage.status === 'returned' ? 'You completed your goal' : 'The week has passed'}
            </Text>
            <Text style={s.fullCardGoal}>{myVoyage.goal}</Text>
            <Text style={s.fullCardCta}>Write your reckoning →</Text>
          </TouchableOpacity>
        )}

        {/* 2×2 Quick-action grid */}
        <View style={s.grid}>
          {/* Goal box */}
          {hasActiveGoal ? (
            <QuickBox
              label={myVoyage.status === 'open' ? `Supporters ${pierMembers.length}/2` : 'In progress'}
              title={myVoyage.goal}
              sub="Tap to view"
              accent
              onPress={() => navigation.navigate('MyVoyage', { voyage: myVoyage, pierMembers })}
            />
          ) : (
            <QuickBox
              label="This week"
              title="Set a goal"
              sub="Name it. Name your obstacle. Send it out."
              onPress={() => navigation.navigate('CastOff')}
            />
          )}

          {/* Join / capacity box */}
          {memberships.length >= 3 ? (
            <QuickBox
              label="Supporting"
              title={`${memberships.length} piers`}
              sub="You're at capacity. Acknowledge one to make room."
              disabled
            />
          ) : (
            <QuickBox
              label={memberships.length > 0 ? `${memberships.length} of 3` : 'Support'}
              title={memberships.length > 0 ? 'Stand on another pier' : 'Stand on a pier'}
              sub={memberships.length > 0 ? 'You can support up to 3 at once.' : 'Find a goal and be a witness.'}
              onPress={() => {}}
              disabled={openVoyages.length === 0}
            />
          )}
        </View>

        {/* Active memberships */}
        {memberships.length > 0 && (
          <>
            <Text style={s.sectionTitle}>You're standing on</Text>
            {memberships.map((m) => {
              const v = m.piers_voyages;
              if (!v) return null;
              return (
                <TouchableOpacity
                  key={m.id}
                  style={s.membershipCard}
                  onPress={() => navigation.navigate('PierWatch', { membership: m })}
                >
                  <View style={s.membershipRow}>
                    <Text style={s.membershipHandle}>@{v.piers_users?.handle}</Text>
                    <Text style={s.membershipStatus}>
                      {v.status === 'open' ? 'Seeking support' : v.status === 'underway' ? 'Underway' : 'Ended'}
                    </Text>
                  </View>
                  <Text style={s.membershipGoal} numberOfLines={2}>{v.goal}</Text>
                  <Text style={s.membershipCta}>View their pier →</Text>
                </TouchableOpacity>
              );
            })}
          </>
        )}

        {/* Goals seeking support */}
        <Text style={s.sectionTitle}>Goals seeking support</Text>
        <Text style={s.sectionSub}>
          Two people needed for each. Be one of them.
        </Text>

        {openVoyages.length === 0 ? (
          <Text style={s.empty}>No goals out yet. Be the first.</Text>
        ) : (
          openVoyages.map((v) => (
            <TouchableOpacity
              key={v.id}
              style={[s.goalCard, !canJoinMore && s.goalCardDim]}
              onPress={() => canJoinMore && navigation.navigate('JoinPier', { voyage: v })}
            >
              <Text style={s.goalHandle}>@{v.piers_users?.handle}</Text>
              <Text style={s.goalText}>{v.goal}</Text>
              <Text style={s.goalCta}>
                {canJoinMore ? 'Stand on their pier →' : 'Acknowledge a pier to make room'}
              </Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Dev panel — bottom sheet */}
      <Modal visible={devVisible} transparent animationType="slide">
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setDevVisible(false)}>
          <View style={s.sheet}>
            <View style={s.sheetHandle} />
            <Text style={s.sheetTitle}>Dev Tools</Text>
            <Text style={s.sheetSub}>Simulate other users to test the full flow.</Text>

            <TouchableOpacity style={s.sheetBtn} onPress={devSeedVoyages} disabled={seeding}>
              {seeding ? <ActivityIndicator color={colors.bg} /> : <Text style={s.sheetBtnText}>Seed 3 open goals from fake users</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={[s.sheetBtn, s.sheetBtnBlue]} onPress={devFillPier} disabled={seeding}>
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
  content: { padding: 20, paddingTop: 60, gap: 16, paddingBottom: 40 },
  center: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  wordmark: { fontFamily: fonts.bold, fontSize: 30, color: colors.gold, letterSpacing: 0.5 },
  handle: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMid },
  devBtn: { backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: 14, paddingVertical: 7, marginTop: 4 },
  devBtnText: { fontFamily: fonts.semiBold, fontSize: 12, color: colors.textMid, letterSpacing: 0.5 },

  fullCard: { borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bgCard, padding: 20, gap: 8 },
  fullCardRose: { borderColor: colors.roseBorder, backgroundColor: colors.roseBg },
  fullCardLabel: { fontFamily: fonts.semiBold, fontSize: 11, color: colors.rose, textTransform: 'uppercase', letterSpacing: 0.8 },
  fullCardGoal: { fontFamily: fonts.regular, fontSize: 16, color: colors.text, lineHeight: 22 },
  fullCardCta: { fontFamily: fonts.semiBold, fontSize: 13, color: colors.rose },

  grid: { flexDirection: 'row', gap: 12 },
  box: {
    width: BOX, minHeight: BOX * 0.9,
    backgroundColor: colors.bgCard, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    padding: 16, gap: 6,
  },
  boxAccent: { borderColor: colors.goldBorder, backgroundColor: colors.goldBg },
  boxDisabled: { opacity: 0.4 },
  boxLabel: { fontFamily: fonts.semiBold, fontSize: 10, color: colors.textDim, textTransform: 'uppercase', letterSpacing: 0.8 },
  boxLabelAccent: { color: colors.gold },
  boxTitle: { fontFamily: fonts.bold, fontSize: 15, color: colors.text, lineHeight: 20 },
  boxTitleAccent: { color: colors.text },
  boxSub: { fontFamily: fonts.regular, fontSize: 12, color: colors.textDim, lineHeight: 17 },
  boxSubAccent: { color: colors.textMid },

  sectionTitle: { fontFamily: fonts.bold, fontSize: 18, color: colors.text, marginTop: 4 },
  sectionSub: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMid, lineHeight: 18, marginTop: -8 },

  membershipCard: {
    backgroundColor: colors.bgCard, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.blueBorder,
    padding: 18, gap: 6,
  },
  membershipRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  membershipHandle: { fontFamily: fonts.regular, fontSize: 12, color: colors.blue },
  membershipStatus: { fontFamily: fonts.regular, fontSize: 11, color: colors.textDim },
  membershipGoal: { fontFamily: fonts.regular, fontSize: 15, color: colors.text, lineHeight: 21 },
  membershipCta: { fontFamily: fonts.semiBold, fontSize: 12, color: colors.blue },

  goalCard: { backgroundColor: colors.bgCard, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: 18, gap: 6 },
  goalCardDim: { opacity: 0.5 },
  goalHandle: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMid },
  goalText: { fontFamily: fonts.regular, fontSize: 15, color: colors.text, lineHeight: 21 },
  goalCta: { fontFamily: fonts.semiBold, fontSize: 12, color: colors.gold },

  empty: { fontFamily: fonts.regular, fontSize: 14, color: colors.textDim, textAlign: 'center', paddingVertical: 24 },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.bgCard, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: 24, paddingBottom: 40, gap: 12, borderWidth: 1, borderColor: colors.borderStrong },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.borderStrong, alignSelf: 'center', marginBottom: 4 },
  sheetTitle: { fontFamily: fonts.bold, fontSize: 20, color: colors.text },
  sheetSub: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMid, marginTop: -4 },
  sheetBtn: { backgroundColor: colors.gold, borderRadius: radius.md, paddingVertical: 15, alignItems: 'center' },
  sheetBtnBlue: { backgroundColor: colors.blue },
  sheetBtnText: { fontFamily: fonts.semiBold, fontSize: 15, color: colors.bg },
  sheetCancel: { alignItems: 'center', paddingVertical: 8 },
  sheetCancelText: { fontFamily: fonts.regular, fontSize: 14, color: colors.textDim },
});
