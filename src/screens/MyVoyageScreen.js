import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, Share, Linking, Switch,
} from 'react-native';
import { colors, radius, fonts } from '../lib/theme';
import {
  getVoyageDetail, sendPulse, claimDone, goWithOne, setListed, openSupply,
  PULSE_OPTIONS, PULSE_LABELS, supplyLabel, todayKey,
} from '../lib/supabase';

function timeLeft(expiresAt) {
  const diff = new Date(expiresAt) - Date.now();
  if (diff <= 0) return 'Expired';
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  return days > 0 ? `${days}d ${hours}h left` : `${hours}h left`;
}

function formatDate(dateKey) {
  return new Date(dateKey + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function Responses({ items }) {
  if (!items?.length) return null;
  return (
    <View style={styles.responsesBlock}>
      {items.map((r, i) => (
        <Text key={i} style={styles.responseWord}>
          <Text style={styles.responseHandle}>@{r.handle} </Text>{r.word}
        </Text>
      ))}
    </View>
  );
}

function SupplyCard({ s, onOpen }) {
  let body = null;
  if (s.kind === 'extra_day') body = 'A day was added to your week.';
  else if (s.kind === 'rest_day') body = 'Use it from your daily pulse.';
  else if (s.kind === 'sealed_note') body = s.sealed ? 'Sealed. Opens when you finish.' : s.body;
  else if (s.kind === 'call') body = s.body;
  return (
    <View style={[styles.card, s.sealed && styles.cardSealed]}>
      <View style={styles.historyRow}>
        <Text style={styles.supplyKind}>{supplyLabel(s.kind)}</Text>
        <Text style={styles.historyDate}>from {s.from}</Text>
      </View>
      {!!body && <Text style={s.sealed ? styles.sealedText : styles.supplyBody}>{body}</Text>}
      {s.kind === 'link' && !!s.url && (
        <TouchableOpacity onPress={() => onOpen(s)}>
          <Text style={styles.link} numberOfLines={1}>{s.url}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function MyVoyageScreen({ route, navigation }) {
  const { voyageId } = route.params;
  const [detail, setDetail] = useState(null);
  const [tab, setTab] = useState('pier');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [pulseNote, setPulseNote] = useState('');
  const [confirming, setConfirming] = useState(null);

  const load = useCallback(async () => {
    try { setDetail(await getVoyageDetail(voyageId)); setError(''); }
    catch (e) { setError(e.message); }
  }, [voyageId]);

  useEffect(() => { load(); }, [load]);

  async function run(fn) {
    setBusy(true);
    setError('');
    try { await fn(); await load(); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); setConfirming(null); }
  }

  if (!detail) {
    return <View style={styles.center}>{error ? <Text style={styles.error}>{error}</Text> : <ActivityIndicator color={colors.gold} />}</View>;
  }

  const { voyage, members, pulses, supplies = [], rest_days_left: restsLeft } = detail;
  const solo = voyage.mode === 'solo';
  const seats = solo ? 1 : 2;
  const isOpen = voyage.status === 'open';
  const isUnderway = voyage.status === 'underway';
  const ended = ['returned', 'lost'].includes(voyage.status);
  const todaysPulse = pulses.find((p) => p.date_key === todayKey());
  const earlier = pulses.filter((p) => p.date_key !== todayKey());
  const options = [...PULSE_OPTIONS, ...(restsLeft > 0 && isUnderway ? [{ key: 'rest_day', label: `Rest day (${restsLeft} left)` }] : [])];

  function sharePier() {
    Share.share({ message: `Stand on my pier in Piers. Code: ${voyage.invite_code}` }).catch(() => {});
  }

  function openLink(s) {
    openSupply(s.id).catch(() => {});
    Linking.openURL(s.url).catch(() => {});
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Your goal</Text>
        <Text style={styles.timer}>
          {isOpen ? 'Starts when your pier fills' : ended ? (voyage.status === 'returned' ? 'You made it' : 'The week ended') : timeLeft(voyage.expires_at)}
          {solo ? ' · Solo' : ''}
        </Text>

        <View style={[styles.card, styles.cardGold]}>
          <Text style={styles.fieldLabel}>Goal</Text>
          <Text style={styles.goalText}>{voyage.goal}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Biggest obstacle</Text>
          <Text style={styles.obstacleText}>{voyage.obstacle}</Text>
        </View>

        <View style={styles.tabs}>
          {[['pier', 'Your Pier'], ['pulse', 'Daily Pulse'], ['supplies', `Supplies${supplies.length ? ` · ${supplies.length}` : ''}`]].map(([k, label]) => (
            <TouchableOpacity key={k} style={[styles.tab, tab === k && styles.tabActive]} onPress={() => setTab(k)}>
              <Text style={[styles.tabText, tab === k && styles.tabTextActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {!!error && <Text style={styles.error}>{error}</Text>}

        {tab === 'pier' && (
          <>
            {members.map((m) => (
              <View key={m.user_id} style={styles.memberRow}>
                <Text style={styles.memberHandle}>@{m.handle}</Text>
                <Text style={styles.memberJoined}>Standing since {new Date(m.joined_at).toLocaleDateString()}</Text>
              </View>
            ))}

            {isOpen && (
              <>
                <View style={styles.waitingNotice}>
                  <Text style={styles.waitingText}>
                    Waiting for {seats - members.length} more to stand on your pier
                  </Text>
                </View>

                <View style={styles.card}>
                  <Text style={styles.fieldLabel}>Pier code</Text>
                  <Text style={styles.code}>{voyage.invite_code}</Text>
                  <TouchableOpacity style={styles.btnOutline} onPress={sharePier}>
                    <Text style={styles.btnOutlineText}>Share code</Text>
                  </TouchableOpacity>
                  <View style={styles.switchRow}>
                    <Text style={styles.switchLabel}>Open water</Text>
                    <Switch
                      value={!!voyage.listed}
                      onValueChange={(on) => run(() => setListed(voyage.id, on))}
                      trackColor={{ true: colors.gold }}
                    />
                  </View>
                </View>

                {!solo && members.length === 1 && (
                  confirming === 'one' ? (
                    <View style={styles.card}>
                      <Text style={styles.obstacleText}>
                        Start now with @{members[0].handle}. No supplies, no Shore. @{members[0].handle} decides if you made it.
                      </Text>
                      <TouchableOpacity style={styles.btn} onPress={() => run(() => goWithOne(voyage.id))} disabled={busy}>
                        {busy ? <ActivityIndicator color={colors.bg} /> : <Text style={styles.btnText}>Go with one</Text>}
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => setConfirming(null)}><Text style={styles.noteChange}>Keep waiting</Text></TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity style={styles.btnOutline} onPress={() => setConfirming('one')}>
                      <Text style={styles.btnOutlineText}>Go with one</Text>
                    </TouchableOpacity>
                  )
                )}
              </>
            )}

            {isUnderway && (
              voyage.claimed_at ? (
                <View style={styles.waitingNotice}>
                  <Text style={styles.waitingText}>Waiting for @{members[0]?.handle} to confirm.</Text>
                </View>
              ) : confirming === 'done' ? (
                <View style={styles.card}>
                  <Text style={styles.obstacleText}>
                    {solo ? `@${members[0]?.handle} will confirm it.` : 'Your pier will be able to acknowledge you.'}
                  </Text>
                  <TouchableOpacity style={styles.btn} onPress={() => run(() => claimDone(voyage.id))} disabled={busy}>
                    {busy ? <ActivityIndicator color={colors.bg} /> : <Text style={styles.btnText}>I did it</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setConfirming(null)}><Text style={styles.noteChange}>Not yet</Text></TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.btn} onPress={() => setConfirming('done')}>
                  <Text style={styles.btnText}>I completed my goal</Text>
                </TouchableOpacity>
              )
            )}

            <Text style={styles.fine}>
              {solo
                ? 'Your peer sends signals and answers your pulse.'
                : 'Your peers send signals, answer your pulse, and talk on the Shore. You don\'t see the Shore.'}
            </Text>
          </>
        )}

        {tab === 'pulse' && (
          <>
            <View style={styles.pulseSection}>
              <Text style={styles.pulseSectionLabel}>
                {todaysPulse ? 'Today\'s pulse — sent' : selectedStatus ? 'Add a note' : 'How\'s today going?'}
              </Text>

              {todaysPulse ? (
                <View style={[styles.card, styles.cardPulse]}>
                  <Text style={styles.pulseSentLabel}>You sent</Text>
                  <Text style={styles.pulseSentText}>{PULSE_LABELS[todaysPulse.status]}</Text>
                  {!!todaysPulse.note && <Text style={styles.pulseNoteText}>{todaysPulse.note}</Text>}
                  <Responses items={todaysPulse.responses} />
                </View>
              ) : !isUnderway ? (
                <Text style={styles.empty}>Pulses open once your week starts.</Text>
              ) : selectedStatus ? (
                <View style={styles.noteStep}>
                  <View style={[styles.pulseBtn, styles.pulseBtnSelected]}>
                    <Text style={[styles.pulseBtnText, styles.pulseBtnTextSelected]}>{PULSE_LABELS[selectedStatus]}</Text>
                  </View>
                  <TextInput
                    style={styles.noteInput} placeholder="Anything to add? (optional)"
                    placeholderTextColor={colors.textDim} value={pulseNote} onChangeText={setPulseNote}
                    multiline maxLength={200} textAlignVertical="top" autoFocus
                  />
                  <View style={styles.noteFooter}>
                    <Text style={styles.noteCount}>{pulseNote.length}/200</Text>
                    <TouchableOpacity onPress={() => setSelectedStatus(null)}>
                      <Text style={styles.noteChange}>← Change</Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity
                    style={[styles.sendBtn, busy && styles.btnDisabled]} disabled={busy}
                    onPress={() => run(async () => {
                      await sendPulse({ voyageId: voyage.id, status: selectedStatus, note: pulseNote.trim() });
                      setSelectedStatus(null);
                      setPulseNote('');
                    })}
                  >
                    {busy ? <ActivityIndicator color={colors.bg} size="small" /> : <Text style={styles.sendBtnText}>Send pulse</Text>}
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.pulseOptions}>
                  {options.map((opt) => (
                    <TouchableOpacity key={opt.key} style={styles.pulseBtn} onPress={() => setSelectedStatus(opt.key)}>
                      <Text style={styles.pulseBtnText}>{opt.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {earlier.length > 0 && (
              <>
                <Text style={styles.pulseSectionLabel}>Earlier this week</Text>
                {earlier.map((p) => (
                  <View key={p.id} style={[styles.card, styles.cardHistory]}>
                    <View style={styles.historyRow}>
                      <Text style={styles.historyDate}>{formatDate(p.date_key)}</Text>
                      <Text style={styles.historyStatus}>{PULSE_LABELS[p.status]}</Text>
                    </View>
                    {!!p.note && <Text style={styles.historyNote}>{p.note}</Text>}
                    <Responses items={p.responses} />
                  </View>
                ))}
              </>
            )}
          </>
        )}

        {tab === 'supplies' && (
          solo ? (
            <Text style={styles.empty}>You went with one. Supplies take two peers.</Text>
          ) : supplies.length === 0 ? (
            <Text style={styles.empty}>
              Nothing yet. When both peers agree, supplies land here: an extra day, a rest day, a call, a sealed note, a link.
            </Text>
          ) : (
            supplies.map((s) => <SupplyCard key={s.id} s={s} onOpen={openLink} />)
          )
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center', padding: 24 },
  content: { padding: 24, paddingTop: 60, gap: 16, paddingBottom: 40 },
  back: { marginBottom: 4 },
  backText: { fontFamily: fonts.regular, color: colors.textMid, fontSize: 14 },
  title: { fontFamily: fonts.bold, fontSize: 28, color: colors.text, letterSpacing: -0.5 },
  timer: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMid, marginTop: -8 },
  card: { backgroundColor: colors.bgCard, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: 20, gap: 8 },
  cardGold: { borderColor: colors.goldBorder, backgroundColor: colors.goldBg },
  cardPulse: { borderColor: colors.goldBorder },
  cardHistory: { gap: 10 },
  cardSealed: { borderStyle: 'dashed', borderColor: colors.blueBorder, backgroundColor: colors.blueBg },
  fieldLabel: { fontFamily: fonts.semiBold, fontSize: 11, color: colors.textMid, textTransform: 'uppercase', letterSpacing: 0.8 },
  goalText: { fontFamily: fonts.regular, fontSize: 18, color: colors.text, lineHeight: 26 },
  obstacleText: { fontFamily: fonts.regular, fontSize: 15, color: colors.textMid, lineHeight: 22 },
  error: { fontFamily: fonts.regular, fontSize: 13, color: colors.rose },

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
  code: { fontFamily: fonts.bold, fontSize: 28, color: colors.text, letterSpacing: 4 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  switchLabel: { fontFamily: fonts.regular, fontSize: 14, color: colors.textMid },
  empty: { fontFamily: fonts.regular, fontSize: 14, color: colors.textDim, lineHeight: 20 },
  btn: { backgroundColor: colors.gold, borderRadius: radius.md, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  btnDisabled: { opacity: 0.5 },
  btnText: { fontFamily: fonts.semiBold, fontSize: 16, color: colors.bg },
  btnOutline: { borderWidth: 1, borderColor: colors.goldBorder, borderRadius: radius.md, paddingVertical: 12, alignItems: 'center' },
  btnOutlineText: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.gold },
  fine: { fontFamily: fonts.regular, fontSize: 12, color: colors.textDim, textAlign: 'center', lineHeight: 18 },

  supplyKind: { fontFamily: fonts.semiBold, fontSize: 15, color: colors.text },
  supplyBody: { fontFamily: fonts.regular, fontSize: 15, color: colors.textMid, lineHeight: 22 },
  sealedText: { fontFamily: fonts.italic, fontSize: 14, color: colors.blue },
  link: { fontFamily: fonts.regular, fontSize: 14, color: colors.blue, textDecorationLine: 'underline' },

  pulseSection: { gap: 12 },
  pulseSectionLabel: { fontFamily: fonts.semiBold, fontSize: 11, color: colors.textMid, textTransform: 'uppercase', letterSpacing: 0.8 },
  pulseOptions: { gap: 10 },
  pulseBtn: { backgroundColor: colors.bgCard, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingVertical: 16, paddingHorizontal: 20, alignItems: 'flex-start' },
  pulseBtnSelected: { borderColor: colors.goldBorder, backgroundColor: colors.goldBg },
  pulseBtnText: { fontFamily: fonts.regular, fontSize: 16, color: colors.text },
  pulseBtnTextSelected: { fontFamily: fonts.semiBold, color: colors.gold },
  pulseSentLabel: { fontFamily: fonts.semiBold, fontSize: 10, color: colors.gold, textTransform: 'uppercase', letterSpacing: 0.8 },
  pulseSentText: { fontFamily: fonts.regular, fontSize: 17, color: colors.text },
  pulseNoteText: { fontFamily: fonts.italic, fontSize: 14, color: colors.textMid, lineHeight: 20 },
  responsesBlock: { gap: 6, marginTop: 4 },
  responseWord: { fontFamily: fonts.regular, fontSize: 14, color: colors.textMid, lineHeight: 20 },
  responseHandle: { fontFamily: fonts.semiBold, color: colors.blue },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  historyDate: { fontFamily: fonts.regular, fontSize: 12, color: colors.textDim, flexShrink: 0 },
  historyStatus: { fontFamily: fonts.regular, fontSize: 14, color: colors.textMid, flex: 1, textAlign: 'right' },
  historyNote: { fontFamily: fonts.italic, fontSize: 13, color: colors.textMid, lineHeight: 18 },

  noteStep: { gap: 10 },
  noteInput: {
    backgroundColor: colors.bgCard, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, padding: 14,
    fontFamily: fonts.regular, fontSize: 15, color: colors.text, minHeight: 80, lineHeight: 22,
  },
  noteFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  noteCount: { fontFamily: fonts.regular, fontSize: 11, color: colors.textDim },
  noteChange: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMid, textAlign: 'center' },
  sendBtn: { backgroundColor: colors.blue, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center' },
  sendBtnText: { fontFamily: fonts.semiBold, fontSize: 15, color: colors.bg },
});
