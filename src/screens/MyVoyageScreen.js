import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert,
} from 'react-native';
import { colors, radius, fonts } from '../lib/theme';
import { sailHome, sendPulse, getPulses, PULSE_OPTIONS } from '../lib/supabase';

function timeLeft(expiresAt) {
  const diff = new Date(expiresAt) - Date.now();
  if (diff <= 0) return 'Expired';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `${days}d ${hours}h remaining`;
  return `${hours}h remaining`;
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(dateKey) {
  const d = new Date(dateKey + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

const PULSE_LABELS = {
  making_progress: 'Making progress.',
  pushing_through: 'Pushing through.',
  stayed_the_course: 'Stayed the course.',
  rough_one: 'Had a rough one.',
};

export default function MyVoyageScreen({ route, navigation, user }) {
  const { voyage, pierMembers: initialMembers = [] } = route.params;
  const [pierMembers] = useState(initialMembers);
  const [pulses, setPulses] = useState([]);
  const [loadingPulses, setLoadingPulses] = useState(true);
  const [sendingPulse, setSendingPulse] = useState(false);
  const [sailLoading, setSailLoading] = useState(false);
  const [tab, setTab] = useState('pier');

  const loadPulses = useCallback(async () => {
    try {
      const data = await getPulses(voyage.id);
      setPulses(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingPulses(false);
    }
  }, [voyage.id]);

  useEffect(() => { loadPulses(); }, [loadPulses]);

  const todaysPulse = pulses.find((p) => p.date_key === todayKey());

  async function handleSendPulse(status) {
    setSendingPulse(true);
    try {
      await sendPulse({ voyageId: voyage.id, status });
      await loadPulses();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSendingPulse(false);
    }
  }

  function confirmReturn() {
    Alert.alert(
      'Mark as complete?',
      'Your pier will be able to acknowledge you.',
      [
        { text: 'Not yet', style: 'cancel' },
        { text: 'I did it', style: 'default', onPress: doSailHome },
      ]
    );
  }

  async function doSailHome() {
    setSailLoading(true);
    try {
      await sailHome(voyage.id);
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSailLoading(false);
    }
  }

  const isUnderway = voyage.status === 'underway';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Your goal</Text>
      <Text style={styles.timer}>{timeLeft(voyage.expires_at)}</Text>

      <View style={[styles.card, styles.cardGold]}>
        <Text style={styles.fieldLabel}>Goal</Text>
        <Text style={styles.goalText}>{voyage.goal}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.fieldLabel}>Biggest obstacle</Text>
        <Text style={styles.obstacleText}>{voyage.obstacle}</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === 'pier' && styles.tabActive]}
          onPress={() => setTab('pier')}
        >
          <Text style={[styles.tabText, tab === 'pier' && styles.tabTextActive]}>Your Pier</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'pulse' && styles.tabActive]}
          onPress={() => setTab('pulse')}
        >
          <Text style={[styles.tabText, tab === 'pulse' && styles.tabTextActive]}>Daily Pulse</Text>
        </TouchableOpacity>
      </View>

      {tab === 'pier' && (
        <>
          {pierMembers.length === 0 ? (
            <Text style={styles.empty}>Your pier is empty. Others will find your goal when they're looking for someone to support.</Text>
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
                Waiting for {2 - pierMembers.length} more to stand on your pier
              </Text>
            </View>
          )}

          {isUnderway && (
            <TouchableOpacity
              style={[styles.btn, sailLoading && styles.btnDisabled]}
              onPress={confirmReturn}
              disabled={sailLoading}
            >
              {sailLoading
                ? <ActivityIndicator color={colors.bg} />
                : <Text style={styles.btnText}>I completed my goal</Text>}
            </TouchableOpacity>
          )}

          <Text style={styles.fine}>
            Your pier cannot respond to your voyage until you complete it or the week expires.
            They can send signals and respond to your daily pulse.
          </Text>
        </>
      )}

      {tab === 'pulse' && (
        <>
          {/* Send today's pulse */}
          <View style={styles.pulseSection}>
            <Text style={styles.pulseSectionLabel}>
              {todaysPulse ? 'Today\'s pulse — sent' : 'How\'s today going?'}
            </Text>
            {todaysPulse ? (
              <View style={[styles.card, styles.cardPulse]}>
                <Text style={styles.pulseSentLabel}>You sent</Text>
                <Text style={styles.pulseSentText}>{PULSE_LABELS[todaysPulse.status]}</Text>
                {todaysPulse.piers_pulse_responses?.length > 0 && (
                  <View style={styles.responsesBlock}>
                    <Text style={styles.responsesLabel}>From your pier</Text>
                    {todaysPulse.piers_pulse_responses.map((r, i) => (
                      <Text key={i} style={styles.responseWord}>
                        <Text style={styles.responseHandle}>@{r.piers_users?.handle} </Text>
                        {r.word}
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.pulseOptions}>
                {PULSE_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.key}
                    style={[styles.pulseBtn, sendingPulse && styles.pulseBtnDisabled]}
                    onPress={() => handleSendPulse(opt.key)}
                    disabled={sendingPulse}
                  >
                    {sendingPulse
                      ? <ActivityIndicator color={colors.text} size="small" />
                      : <Text style={styles.pulseBtnText}>{opt.label}</Text>}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Pulse history */}
          {loadingPulses ? (
            <ActivityIndicator color={colors.gold} />
          ) : pulses.filter((p) => p.date_key !== todayKey()).length > 0 && (
            <>
              <Text style={styles.pulseSectionLabel}>Earlier this week</Text>
              {pulses
                .filter((p) => p.date_key !== todayKey())
                .map((p) => (
                  <View key={p.id} style={[styles.card, styles.cardHistory]}>
                    <View style={styles.historyRow}>
                      <Text style={styles.historyDate}>{formatDate(p.date_key)}</Text>
                      <Text style={styles.historyStatus}>{PULSE_LABELS[p.status]}</Text>
                    </View>
                    {p.piers_pulse_responses?.length > 0 && (
                      <View style={styles.responsesBlock}>
                        {p.piers_pulse_responses.map((r, i) => (
                          <Text key={i} style={styles.responseWord}>
                            <Text style={styles.responseHandle}>@{r.piers_users?.handle} </Text>
                            {r.word}
                          </Text>
                        ))}
                      </View>
                    )}
                  </View>
                ))}
            </>
          )}

          {!loadingPulses && pulses.length === 0 && (
            <Text style={styles.empty}>
              No pulses yet. Send one each day to let your pier know how it's going.
            </Text>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 24, paddingTop: 60, gap: 16, paddingBottom: 40 },
  back: { marginBottom: 4 },
  backText: { fontFamily: fonts.regular, color: colors.textMid, fontSize: 14 },
  title: { fontFamily: fonts.bold, fontSize: 28, color: colors.text, letterSpacing: -0.5 },
  timer: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMid, marginTop: -8 },
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    gap: 8,
  },
  cardGold: { borderColor: colors.goldBorder, backgroundColor: colors.goldBg },
  cardPulse: { borderColor: colors.goldBorder },
  cardHistory: { gap: 10 },
  fieldLabel: { fontFamily: fonts.semiBold, fontSize: 11, color: colors.textMid, textTransform: 'uppercase', letterSpacing: 0.8 },
  goalText: { fontFamily: fonts.regular, fontSize: 18, color: colors.text, lineHeight: 26 },
  obstacleText: { fontFamily: fonts.regular, fontSize: 15, color: colors.textMid, lineHeight: 22 },

  tabs: { flexDirection: 'row', gap: 8 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  tabActive: { borderColor: colors.goldBorder, backgroundColor: colors.goldBg },
  tabText: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMid },
  tabTextActive: { fontFamily: fonts.semiBold, color: colors.gold },

  memberRow: { backgroundColor: colors.bgCard, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 2 },
  memberHandle: { fontFamily: fonts.semiBold, fontSize: 15, color: colors.text },
  memberJoined: { fontFamily: fonts.regular, fontSize: 12, color: colors.textDim },
  waitingNotice: { backgroundColor: colors.goldBg, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.goldBorder, padding: 14 },
  waitingText: { fontFamily: fonts.regular, fontSize: 13, color: colors.gold },
  empty: { fontFamily: fonts.regular, fontSize: 14, color: colors.textDim, lineHeight: 20 },
  btn: { backgroundColor: colors.gold, borderRadius: radius.md, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  btnDisabled: { opacity: 0.5 },
  btnText: { fontFamily: fonts.semiBold, fontSize: 16, color: colors.bg },
  fine: { fontFamily: fonts.regular, fontSize: 12, color: colors.textDim, textAlign: 'center', lineHeight: 18 },

  pulseSection: { gap: 12 },
  pulseSectionLabel: { fontFamily: fonts.semiBold, fontSize: 11, color: colors.textMid, textTransform: 'uppercase', letterSpacing: 0.8 },
  pulseOptions: { gap: 10 },
  pulseBtn: { backgroundColor: colors.bgCard, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingVertical: 16, paddingHorizontal: 20, alignItems: 'flex-start' },
  pulseBtnDisabled: { opacity: 0.5 },
  pulseBtnText: { fontFamily: fonts.regular, fontSize: 16, color: colors.text },
  pulseSentLabel: { fontFamily: fonts.semiBold, fontSize: 10, color: colors.gold, textTransform: 'uppercase', letterSpacing: 0.8 },
  pulseSentText: { fontFamily: fonts.regular, fontSize: 17, color: colors.text },
  responsesBlock: { gap: 6, marginTop: 4 },
  responsesLabel: { fontFamily: fonts.semiBold, fontSize: 10, color: colors.textDim, textTransform: 'uppercase', letterSpacing: 0.8 },
  responseWord: { fontFamily: fonts.regular, fontSize: 14, color: colors.textMid, lineHeight: 20 },
  responseHandle: { fontFamily: fonts.semiBold, color: colors.blue },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  historyDate: { fontFamily: fonts.regular, fontSize: 12, color: colors.textDim, flexShrink: 0 },
  historyStatus: { fontFamily: fonts.regular, fontSize: 14, color: colors.textMid, flex: 1, textAlign: 'right' },
});
