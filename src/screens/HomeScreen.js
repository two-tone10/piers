import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Pressable, StyleSheet,
  RefreshControl, ActivityIndicator, Alert, Modal, Image,
  Dimensions, Animated,
} from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect, Path } from 'react-native-svg';
import { colors, radius, fonts, bondTiers } from '../lib/theme';
import {
  getMyVoyage, getOpenVoyages, getPierMembers,
  getActiveMemberships, seedOpenVoyages, seedPierMembers, getBondLevel,
  getStreak, devAddCompletedVoyage,
} from '../lib/supabase';

const IMAGES = {
  splash: require('../../assets/splash-pier.png'),
  solo:   require('../../assets/solo.png'),
  duo:    require('../../assets/duo.png'),
};

function pierImage(memberCount) {
  if (memberCount >= 2) return IMAGES.duo;
  if (memberCount === 1) return IMAGES.solo;
  return IMAGES.splash;
}

const SCREEN_W = Dimensions.get('window').width;

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

function StatusPill({ label, color }) {
  return (
    <View style={[s.pill, { borderColor: color + '55' }]}>
      <Text style={[s.pillText, { color }]}>{label}</Text>
    </View>
  );
}

function WeekProgress({ createdAt, expiresAt }) {
  const total = new Date(expiresAt) - new Date(createdAt);
  const elapsed = Date.now() - new Date(createdAt);
  const daysDone = Math.min(7, Math.max(0, Math.floor((elapsed / total) * 7)));
  return (
    <View style={s.weekRow}>
      {Array.from({ length: 7 }).map((_, i) => (
        <View key={i} style={[s.weekSeg, i < daysDone && s.weekSegDone]} />
      ))}
    </View>
  );
}

function HeroFade({ height }) {
  return (
    <Svg width={SCREEN_W} height={height} style={s.heroFadeSvg}>
      <Defs>
        <LinearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={colors.bgCard} stopOpacity={0} />
          <Stop offset="0.55" stopColor={colors.bgCard} stopOpacity={0.75} />
          <Stop offset="1" stopColor={colors.bgCard} stopOpacity={1} />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={SCREEN_W} height={height} fill="url(#fade)" />
    </Svg>
  );
}

function FlameIcon({ color, size = 13 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12,2 C9,6 6,9 6,13.5 C6,17.6 8.7,21 12,21 C15.3,21 18,17.6 18,13.5 C18,9 15,6 12,2 Z"
        stroke={color} strokeWidth={1.7} fill={color} fillOpacity={0.16}
      />
    </Svg>
  );
}

function BondNode({ membership, bond, onPress }) {
  const tier = bondTiers[bond?.level ?? 'stranger'];
  const size = bond?.level === 'confidant' ? 62 : bond?.level === 'familiar' ? 54 : 46;
  const handle = membership.piers_voyages?.piers_users?.handle ?? '';
  return (
    <TouchableOpacity style={s.nodeWrap} onPress={onPress} activeOpacity={0.8}>
      <View
        style={[
          s.node,
          {
            width: size, height: size, borderRadius: size / 2,
            borderColor: tier.color, backgroundColor: tier.bg,
          },
          bond?.level === 'confidant' && s.nodeGlow,
        ]}
      >
        <Text style={[s.nodeInitial, { color: tier.color, fontSize: size * 0.36 }]}>
          {handle.charAt(0).toUpperCase()}
        </Text>
      </View>
      <Text style={s.nodeHandle} numberOfLines={1}>@{handle}</Text>
      <Text style={[s.nodeTier, { color: tier.color }]}>{tier.label}</Text>
    </TouchableOpacity>
  );
}

function PressableCard({ style, onPress, children }) {
  const scale = useRef(new Animated.Value(1)).current;
  const onPressIn = () => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 40 }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30 }).start();
  return (
    <Pressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut}>
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

export default function HomeScreen({ user, navigation }) {
  const [myVoyage, setMyVoyage] = useState(null);
  const [pierMembers, setPierMembers] = useState([]);
  const [openVoyages, setOpenVoyages] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [bonds, setBonds] = useState({});
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [devVisible, setDevVisible] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const heroAnim = useRef(new Animated.Value(0)).current;
  const listAnim = useRef(new Animated.Value(0)).current;

  const load = useCallback(async () => {
    try {
      const [voyage, open, mems, streakCount] = await Promise.all([
        getMyVoyage(user.id),
        getOpenVoyages(user.id),
        getActiveMemberships(user.id),
        getStreak(user.id),
      ]);
      setMyVoyage(voyage);
      setOpenVoyages(open);
      setMemberships(mems);
      setStreak(streakCount);
      if (voyage) setPierMembers(await getPierMembers(voyage.id));

      const bondEntries = await Promise.all(
        mems.map(async (m) => {
          const goalSetterId = m.piers_voyages?.user_id;
          try { return [m.id, await getBondLevel(goalSetterId, user.id)]; }
          catch { return [m.id, null]; }
        })
      );
      setBonds(Object.fromEntries(bondEntries));
    } catch (e) { console.error(e); }
  }, [user.id]);

  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);
  useEffect(() => { const u = navigation.addListener('focus', load); return u; }, [navigation, load]);

  useEffect(() => {
    if (!loading) {
      Animated.stagger(90, [
        Animated.timing(heroAnim, { toValue: 1, duration: 480, useNativeDriver: true }),
        Animated.timing(listAnim, { toValue: 1, duration: 480, useNativeDriver: true }),
      ]).start();
    }
  }, [loading]);

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

  async function devAddStreak() {
    setSeeding(true);
    try { await devAddCompletedVoyage(user.id); await load(); setDevVisible(false); }
    catch (e) { Alert.alert('Failed', e.message); }
    finally { setSeeding(false); }
  }

  if (loading) return <View style={s.center}><ActivityIndicator color={colors.gold} /></View>;

  const needsReckoning = myVoyage && ['returned', 'lost'].includes(myVoyage.status) && !myVoyage.reckoning_at;
  const hasActiveGoal = myVoyage && ['open', 'underway'].includes(myVoyage.status);
  const isUnderway = myVoyage?.status === 'underway';
  const canJoinMore = memberships.length < 3;

  return (
    <>
      <ScrollView
        style={s.container}
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}
      >
        {/* ── HEADER ── */}
        <View style={s.header}>
          <View style={s.wordmarkRow}>
            <Text style={s.wordmark}>Piers</Text>
            {streak > 0 && (
              <View style={s.streakChip}>
                <FlameIcon color={colors.gold} />
                <Text style={s.streakText}>{streak}</Text>
              </View>
            )}
          </View>
          <View style={s.headerRight}>
            <Text style={s.handle}>@{user.handle}</Text>
            <TouchableOpacity style={s.devBtn} onPress={() => setDevVisible(true)}>
              <Text style={s.devBtnText}>Dev</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── RECKONING BANNER ── */}
        {needsReckoning && (
          <TouchableOpacity
            style={s.reckoningBanner}
            onPress={() => navigation.navigate('Reckoning', { voyage: myVoyage })}
            activeOpacity={0.8}
          >
            <View style={s.reckoningDot} />
            <View style={s.reckoningBody}>
              <Text style={s.reckoningEyebrow}>
                {myVoyage.status === 'returned' ? 'You completed your goal' : 'The week has passed'}
              </Text>
              <Text style={s.reckoningGoal} numberOfLines={1}>{myVoyage.goal}</Text>
            </View>
            <Text style={s.reckoningArrow}>→</Text>
          </TouchableOpacity>
        )}

        {/* ── HERO CARD ── */}
        <Animated.View style={{
          opacity: heroAnim,
          transform: [{ translateY: heroAnim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
        }}>
          {hasActiveGoal ? (
            <PressableCard
              style={s.heroCard}
              onPress={() => navigation.navigate('MyVoyage', { voyage: myVoyage, pierMembers })}
            >
              <Image source={pierImage(pierMembers.length)} style={s.heroImage} resizeMode="cover" />
              <HeroFade height={90} />
              <View style={s.heroContent}>
                <WeekProgress createdAt={myVoyage.created_at} expiresAt={myVoyage.expires_at} />
                <View style={s.heroTopRow}>
                  <StatusPill
                    label={isUnderway ? 'Underway' : 'Seeking support'}
                    color={isUnderway ? colors.gold : colors.blue}
                  />
                  <Text style={s.heroTimer}>{timeLeft(myVoyage.expires_at)}</Text>
                </View>
                <Text style={s.heroGoal}>{myVoyage.goal}</Text>
                <View style={s.heroBottom}>
                  <PierDots filled={pierMembers.length} />
                  <Text style={s.heroViewCta}>View pier →</Text>
                </View>
              </View>
            </PressableCard>
          ) : (
            <PressableCard style={s.heroCard} onPress={() => navigation.navigate('CastOff')}>
              <Image source={IMAGES.splash} style={s.heroImage} resizeMode="cover" />
              <HeroFade height={90} />
              <View style={s.heroContent}>
                <Text style={s.castOffEyebrow}>This week</Text>
                <Text style={s.castOffHeadline}>What will you{'\n'}do?</Text>
                <Text style={s.castOffBody}>
                  Name it precisely. Name your obstacle.{'\n'}Two strangers will stand witness.
                </Text>
                <View style={s.castOffBtn}>
                  <Text style={s.castOffBtnText}>Cast off →</Text>
                </View>
              </View>
            </PressableCard>
          )}
        </Animated.View>

        {/* ── STANDING ON ── */}
        {memberships.length > 0 && (
          <Animated.View style={[s.section, {
            opacity: listAnim,
            transform: [{ translateY: listAnim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
          }]}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionLabel}>You're standing on</Text>
              <Text style={s.sectionCount}>{memberships.length} of 3</Text>
            </View>
            <ScrollView
              horizontal showsHorizontalScrollIndicator={false}
              style={s.nodesRow} contentContainerStyle={s.nodesRowContent}
            >
              {memberships.map((m) => (
                m.piers_voyages && (
                  <BondNode
                    key={m.id}
                    membership={m}
                    bond={bonds[m.id]}
                    onPress={() => navigation.navigate('PierWatch', { membership: m })}
                  />
                )
              ))}
            </ScrollView>
            <View style={s.groupCard}>
              {memberships.map((m, idx) => {
                const v = m.piers_voyages;
                if (!v) return null;
                const ended = ['returned', 'lost'].includes(v.status);
                const accentColor = ended ? colors.rose : v.status === 'underway' ? colors.gold : colors.blue;
                const statusLabel = v.status === 'open' ? 'Seeking support'
                  : v.status === 'underway' ? 'Underway'
                  : v.status === 'returned' ? 'Returned' : 'Ended';
                return (
                  <TouchableOpacity
                    key={m.id}
                    style={[s.groupItem, idx < memberships.length - 1 && s.groupItemBorder]}
                    onPress={() => navigation.navigate('PierWatch', { membership: m })}
                    activeOpacity={0.75}
                  >
                    <View style={[s.accentBar, { backgroundColor: accentColor }]} />
                    <View style={s.groupBody}>
                      <View style={s.groupTop}>
                        <View style={s.groupHandleRow}>
                          <Text style={[s.groupHandle, { color: accentColor }]}>@{v.piers_users?.handle}</Text>
                          {bonds[m.id] && (
                            <View style={[s.bondChip, { borderColor: bondTiers[bonds[m.id].level].border, backgroundColor: bondTiers[bonds[m.id].level].bg }]}>
                              <Text style={[s.bondChipText, { color: bondTiers[bonds[m.id].level].color }]}>
                                {bondTiers[bonds[m.id].level].label}
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text style={[s.groupStatus, { color: accentColor + 'aa' }]}>{statusLabel}</Text>
                      </View>
                      <Text style={s.groupGoal} numberOfLines={2}>{v.goal}</Text>
                    </View>
                    <Text style={[s.groupArrow, { color: accentColor + '77' }]}>→</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {canJoinMore && (
              <Text style={s.capacityNote}>
                + {3 - memberships.length} more pier{3 - memberships.length > 1 ? 's' : ''} available
              </Text>
            )}
          </Animated.View>
        )}

        {/* ── OPEN VOYAGES ── */}
        {(openVoyages.length > 0 || memberships.length === 0) && (
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionLabel}>Seeking support</Text>
            </View>
            {!canJoinMore ? (
              <Text style={s.noticeText}>
                You're supporting three people — the limit. Acknowledge someone when their voyage ends to open a spot.
              </Text>
            ) : openVoyages.length === 0 ? (
              <Text style={s.noticeText}>No goals out yet. Be the first to cast off.</Text>
            ) : (
              <View style={s.groupCard}>
                {openVoyages.map((v, idx) => (
                  <TouchableOpacity
                    key={v.id}
                    style={[s.groupItem, idx < openVoyages.length - 1 && s.groupItemBorder]}
                    onPress={() => navigation.navigate('JoinPier', { voyage: v })}
                    activeOpacity={0.75}
                  >
                    <Text style={s.openIndex}>{String(idx + 1).padStart(2, '0')}</Text>
                    <View style={s.groupBody}>
                      <Text style={s.openHandle}>@{v.piers_users?.handle}</Text>
                      <Text style={s.groupGoal} numberOfLines={2}>{v.goal}</Text>
                    </View>
                    <Text style={s.groupArrow}>→</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* ── DEV PANEL ── */}
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
            <TouchableOpacity style={[s.sheetBtn, { backgroundColor: colors.text }]} onPress={devAddStreak} disabled={seeding}>
              {seeding ? <ActivityIndicator color={colors.bg} /> : <Text style={s.sheetBtnText}>+1 completed voyage (streak)</Text>}
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

const HERO_IMAGE_H = 220;
const CARD_RADIUS = 20;

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { paddingTop: 56, paddingBottom: 128, gap: 32 },
  center: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 22,
  },
  wordmarkRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  wordmark: { fontFamily: fonts.bold, fontSize: 28, color: colors.gold, letterSpacing: 0.8 },
  streakChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.goldBg, borderWidth: 1, borderColor: colors.goldBorder,
    borderRadius: 99, paddingHorizontal: 9, paddingVertical: 4, marginTop: 2,
  },
  streakText: { fontFamily: fonts.semiBold, fontSize: 12, color: colors.gold },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  handle: { fontFamily: fonts.light, fontSize: 13, color: colors.textMid },
  devBtn: {
    backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 5,
  },
  devBtnText: { fontFamily: fonts.semiBold, fontSize: 10, color: colors.textDim, letterSpacing: 0.5 },

  reckoningBanner: {
    marginHorizontal: 20,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: colors.roseBg,
    borderWidth: 1, borderColor: colors.roseBorder,
    borderRadius: radius.md, padding: 16,
  },
  reckoningDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.rose },
  reckoningBody: { flex: 1, gap: 3 },
  reckoningEyebrow: { fontFamily: fonts.semiBold, fontSize: 10, color: colors.rose, textTransform: 'uppercase', letterSpacing: 0.8 },
  reckoningGoal: { fontFamily: fonts.regular, fontSize: 14, color: colors.text },
  reckoningArrow: { fontFamily: fonts.semiBold, fontSize: 16, color: colors.rose },

  heroCard: {
    marginHorizontal: 20,
    backgroundColor: colors.bgCard,
    borderRadius: CARD_RADIUS,
    borderWidth: 1, borderColor: colors.borderStrong,
    overflow: 'hidden',
    shadowColor: '#1a1714', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.10, shadowRadius: 18, elevation: 4,
  },
  heroImage: {
    width: '100%',
    height: HERO_IMAGE_H,
    backgroundColor: colors.bgCard,
  },
  heroFadeSvg: {
    position: 'absolute',
    top: HERO_IMAGE_H - 90,
    left: 0, right: 0,
  },
  heroContent: { padding: 22, paddingTop: 16, gap: 14 },
  weekRow: { flexDirection: 'row', gap: 4 },
  weekSeg: {
    flex: 1, height: 3, borderRadius: 2,
    backgroundColor: colors.border,
  },
  weekSegDone: { backgroundColor: colors.gold },
  heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroTimer: { fontFamily: fonts.regular, fontSize: 12, color: colors.textDim },
  heroGoal: { fontFamily: fonts.regular, fontSize: 20, color: colors.text, lineHeight: 30 },
  heroBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroViewCta: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.gold },

  pill: { borderWidth: 1, borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { fontFamily: fonts.semiBold, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.8 },

  dotsRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  dot: { width: 9, height: 9, borderRadius: 5 },
  dotFilled: { backgroundColor: colors.gold },
  dotEmpty: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.gold },
  dotsLabel: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMid },

  castOffEyebrow: { fontFamily: fonts.semiBold, fontSize: 10, color: colors.textDim, textTransform: 'uppercase', letterSpacing: 1.2 },
  castOffHeadline: { fontFamily: fonts.boldItalic, fontSize: 28, color: colors.text, lineHeight: 36, marginTop: 4 },
  castOffBody: { fontFamily: fonts.light, fontSize: 14, color: colors.textMid, lineHeight: 22 },
  castOffBtn: {
    alignSelf: 'flex-start',
    backgroundColor: colors.gold,
    borderRadius: radius.sm,
    paddingHorizontal: 20, paddingVertical: 11, marginTop: 4,
  },
  castOffBtnText: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.bg },

  section: { paddingHorizontal: 20, gap: 0 },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 14,
  },
  sectionLabel: {
    fontFamily: fonts.semiBold, fontSize: 11, color: colors.textDim,
    textTransform: 'uppercase', letterSpacing: 1.2,
  },
  sectionCount: { fontFamily: fonts.regular, fontSize: 12, color: colors.textDim },

  nodesRow: { marginBottom: 16 },
  nodesRowContent: { gap: 18, paddingHorizontal: 2 },
  nodeWrap: { alignItems: 'center', width: 68, gap: 5 },
  node: { borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  nodeGlow: {
    shadowColor: colors.gold, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45, shadowRadius: 10, elevation: 5,
  },
  nodeInitial: { fontFamily: fonts.bold },
  nodeHandle: { fontFamily: fonts.semiBold, fontSize: 11, color: colors.text },
  nodeTier: { fontFamily: fonts.regular, fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.4 },

  groupCard: {
    borderWidth: 1, borderColor: colors.borderStrong,
    borderRadius: radius.md,
    backgroundColor: colors.bgCard,
    overflow: 'hidden',
  },
  groupItem: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 16, paddingHorizontal: 16,
  },
  groupItemBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  accentBar: { width: 3, height: 38, borderRadius: 2 },
  groupBody: { flex: 1, gap: 5 },
  groupTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  groupHandleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  groupHandle: { fontFamily: fonts.semiBold, fontSize: 14 },
  bondChip: { borderWidth: 1, borderRadius: 99, paddingHorizontal: 7, paddingVertical: 2 },
  bondChipText: { fontFamily: fonts.semiBold, fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.5 },
  groupStatus: { fontFamily: fonts.regular, fontSize: 11 },
  groupGoal: { fontFamily: fonts.regular, fontSize: 14, color: colors.text, lineHeight: 20 },
  groupArrow: { fontFamily: fonts.semiBold, fontSize: 16, color: colors.textDim },

  openIndex: {
    fontFamily: fonts.light, fontSize: 20, color: colors.textDim,
    width: 30, textAlign: 'center',
  },
  openHandle: { fontFamily: fonts.semiBold, fontSize: 12, color: colors.textMid },

  capacityNote: {
    fontFamily: fonts.regular, fontSize: 12, color: colors.textDim,
    marginTop: 12, textAlign: 'right',
  },
  noticeText: { fontFamily: fonts.regular, fontSize: 14, color: colors.textMid, lineHeight: 22 },

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
