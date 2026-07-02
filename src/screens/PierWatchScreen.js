import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView,
  Platform, Dimensions,
} from 'react-native';
import { colors, radius, fonts } from '../lib/theme';
import { sendSignal, acknowledge, getPulses, respondToPulse, getPierMembers, RESPONSE_WORDS } from '../lib/supabase';
import PierScene from '../components/PierScene';

const { width: W } = Dimensions.get('window');

const SUGGESTED_QUOTES = [
  { quote: 'It does not matter how slowly you go as long as you do not stop.', author: 'Confucius' },
  { quote: 'The obstacle is the way.', author: 'Marcus Aurelius' },
  { quote: 'Do not wait for the perfect moment. Take the moment and make it perfect.', author: 'Unknown' },
  { quote: 'Courage is resistance to fear, mastery of fear — not absence of fear.', author: 'Mark Twain' },
  { quote: 'What you do today can improve all your tomorrows.', author: 'Ralph Marston' },
];

const PULSE_LABELS = {
  making_progress: 'Making progress.',
  pushing_through: 'Pushing through.',
  stayed_the_course: 'Stayed the course.',
  rough_one: 'Had a rough one.',
};

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(dateKey) {
  const d = new Date(dateKey + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function PierWatchScreen({ route, navigation, user }) {
  const { membership, signals: initialSignals = [] } = route.params;
  const voyage = membership?.piers_voyages;

  const [signals, setSignals] = useState(initialSignals);
  const [pulses, setPulses] = useState([]);
  const [pierMembers, setPierMembers] = useState([]);
  const [loadingPulses, setLoadingPulses] = useState(true);
  const [customQuote, setCustomQuote] = useState('');
  const [customAuthor, setCustomAuthor] = useState('');
  const [ackText, setAckText] = useState('');
  const [sendingSignal, setSendingSignal] = useState(false);
  const [sendingAck, setSendingAck] = useState(false);
  const [respondingPulseId, setRespondingPulseId] = useState(null);
  const [tab, setTab] = useState('signals');

  const voyageEnded = ['returned', 'lost'].includes(voyage?.status);

  const load = useCallback(async () => {
    if (!voyage) return;
    try {
      const [pulseData, memberData] = await Promise.all([
        getPulses(voyage.id),
        getPierMembers(voyage.id),
      ]);
      setPulses(pulseData);
      setPierMembers(memberData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingPulses(false);
    }
  }, [voyage?.id]);

  useEffect(() => { load(); }, [load]);

  async function handleSendSignal(quote, author) {
    setSendingSignal(true);
    try {
      await sendSignal({ voyageId: voyage.id, senderId: user.id, quote, author });
      setSignals((prev) => [...prev, { quote, author, sender_id: user.id, created_at: new Date().toISOString() }]);
      setCustomQuote('');
      setCustomAuthor('');
    } catch (e) {
      Alert.alert('Signal not sent', e.message);
    } finally {
      setSendingSignal(false);
    }
  }

  async function handleRespondToPulse(pulseId, word) {
    setRespondingPulseId(pulseId);
    try {
      await respondToPulse({ pulseId, senderId: user.id, word });
      await load();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setRespondingPulseId(null);
    }
  }

  async function handleAcknowledge() {
    if (!ackText.trim()) return Alert.alert('Say something', 'Write a few words for them.');
    setSendingAck(true);
    try {
      await acknowledge({ voyageId: voyage.id, userId: user.id, text: ackText.trim() });
      Alert.alert('Done', 'Your words have reached them.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSendingAck(false);
    }
  }

  if (!voyage) {
    return (
      <View style={st.center}>
        <Text style={st.empty}>Voyage not found.</Text>
      </View>
    );
  }

  const myResponsesMap = {};
  pulses.forEach((p) => {
    const mine = p.piers_pulse_responses?.find((r) => r.sender_id === user.id);
    if (mine) myResponsesMap[p.id] = mine.word;
  });

  const handle = voyage.piers_users?.handle ?? '';
  const othersOnPier = pierMembers.filter((m) => m.user_id !== user.id);

  return (
    <KeyboardAvoidingView style={st.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={st.content} keyboardShouldPersistTaps="handled">

        {/* Back */}
        <TouchableOpacity onPress={() => navigation.goBack()} style={st.back}>
          <Text style={st.backText}>← Back</Text>
        </TouchableOpacity>

        {/* Pier illustration */}
        <View style={st.illustration}>
          <PierScene width={W} height={190} handle={handle} />
        </View>

        {/* "You're standing on @handle's pier" */}
        <View style={st.pierHeader}>
          <Text style={st.pierTitle}>
            Standing on{' '}
            <Text style={st.pierTitleHandle}>@{handle}</Text>
            {'\'s pier'}
          </Text>
          {othersOnPier.length > 0 && (
            <Text style={st.pierCompanions}>
              {othersOnPier.map((m) => `@${m.piers_users?.handle}`).join(' · ')} also standing here
            </Text>
          )}
        </View>

        {/* Goal card */}
        <View style={st.goalCard}>
          <Text style={st.goalLabel}>Their goal this week</Text>
          <Text style={st.goalText}>{voyage.goal}</Text>
          <View style={st.statusRow}>
            <View style={[st.statusDot,
              voyage.status === 'underway' ? st.dotBlue :
              voyage.status === 'returned' ? st.dotGold : st.dotRose,
            ]} />
            <Text style={st.statusText}>
              {voyage.status === 'returned' ? 'They made it back'
                : voyage.status === 'lost' ? 'The week expired'
                : 'Underway'}
            </Text>
          </View>
          {!!voyage.obstacle && (
            <View style={st.obstacleRow}>
              <Text style={st.obstacleLabel}>Their obstacle: </Text>
              <Text style={st.obstacleText}>{voyage.obstacle}</Text>
            </View>
          )}
        </View>

        {/* Tabs */}
        <View style={st.tabs}>
          {['signals', 'pulse', ...(voyageEnded ? ['acknowledge'] : [])].map((t) => (
            <TouchableOpacity
              key={t}
              style={[st.tab, tab === t && st.tabActive]}
              onPress={() => setTab(t)}
            >
              <Text style={[st.tabText, tab === t && st.tabTextActive]}>
                {t === 'signals' ? 'Signals' : t === 'pulse' ? 'Pulse' : 'Acknowledge'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── SIGNALS TAB ── */}
        {tab === 'signals' && (
          <View style={st.tabContent}>
            {signals.length > 0 && (
              <View style={st.subsection}>
                <Text style={st.subsectionLabel}>Sent so far</Text>
                {signals.map((sig, i) => (
                  <View key={i} style={st.signalRow}>
                    <Text style={st.signalQuote}>"{sig.quote}"</Text>
                    {!!sig.author && <Text style={st.signalAuthor}>— {sig.author}</Text>}
                  </View>
                ))}
              </View>
            )}

            {!voyageEnded ? (
              <View style={st.subsection}>
                <Text style={st.subsectionLabel}>Send a signal from the shore</Text>
                {SUGGESTED_QUOTES.map((q, i) => (
                  <TouchableOpacity
                    key={i} style={st.suggestedRow}
                    onPress={() => handleSendSignal(q.quote, q.author)}
                    disabled={sendingSignal}
                  >
                    <Text style={st.suggestedQuote}>"{q.quote}"</Text>
                    <Text style={st.suggestedAuthor}>— {q.author}</Text>
                  </TouchableOpacity>
                ))}

                <View style={st.card}>
                  <Text style={st.cardLabel}>Or write your own</Text>
                  <TextInput
                    style={st.input} placeholder="A quote, a line, a word..."
                    placeholderTextColor={colors.textDim} value={customQuote}
                    onChangeText={setCustomQuote} multiline maxLength={500}
                  />
                  <TextInput
                    style={[st.input, st.inputSm]} placeholder="Attribution (optional)"
                    placeholderTextColor={colors.textDim} value={customAuthor}
                    onChangeText={setCustomAuthor} maxLength={160}
                  />
                  <TouchableOpacity
                    style={[st.btnSmall, (sendingSignal || !customQuote.trim()) && st.btnDisabled]}
                    onPress={() => handleSendSignal(customQuote, customAuthor)}
                    disabled={sendingSignal || !customQuote.trim()}
                  >
                    {sendingSignal
                      ? <ActivityIndicator color={colors.bg} size="small" />
                      : <Text style={st.btnSmallText}>Send signal</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            ) : signals.length === 0 ? (
              <Text style={st.empty}>No signals were sent during this voyage.</Text>
            ) : null}
          </View>
        )}

        {/* ── PULSE TAB ── */}
        {tab === 'pulse' && (
          <View style={st.tabContent}>
            {loadingPulses ? (
              <ActivityIndicator color={colors.gold} />
            ) : pulses.length === 0 ? (
              <View style={st.emptyBlock}>
                <Text style={st.emptyLabel}>No pulses yet</Text>
                <Text style={st.empty}>They haven't sent a daily status yet. Check back soon.</Text>
              </View>
            ) : (
              pulses.map((p) => {
                const myWord = myResponsesMap[p.id];
                const isToday = p.date_key === todayKey();
                const responding = respondingPulseId === p.id;

                return (
                  <View key={p.id} style={[st.pulseCard, isToday && st.pulseCardToday]}>
                    <View style={st.pulseCardTop}>
                      <Text style={st.pulseDate}>{isToday ? 'Today' : formatDate(p.date_key)}</Text>
                      {isToday && <Text style={st.pulseTodayBadge}>Latest</Text>}
                    </View>
                    <Text style={st.pulseStatus}>{PULSE_LABELS[p.status]}</Text>

                    {myWord ? (
                      <View style={st.myResponse}>
                        <Text style={st.myResponseLabel}>Your response</Text>
                        <Text style={st.myResponseWord}>{myWord}</Text>
                      </View>
                    ) : !voyageEnded ? (
                      <>
                        <Text style={st.wordPickerLabel}>Respond with one word</Text>
                        <View style={st.wordGrid}>
                          {RESPONSE_WORDS.map((w) => (
                            <TouchableOpacity
                              key={w}
                              style={[st.wordBtn, !!respondingPulseId && st.wordBtnDisabled]}
                              onPress={() => handleRespondToPulse(p.id, w)}
                              disabled={!!respondingPulseId}
                            >
                              {responding
                                ? <ActivityIndicator color={colors.text} size="small" />
                                : <Text style={st.wordBtnText}>{w}</Text>}
                            </TouchableOpacity>
                          ))}
                        </View>
                      </>
                    ) : null}

                    {p.piers_pulse_responses?.filter((r) => r.sender_id !== user.id).map((r, i) => (
                      <Text key={i} style={st.otherResponse}>
                        <Text style={st.otherHandle}>@{r.piers_users?.handle} </Text>
                        {r.word}
                      </Text>
                    ))}
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* ── ACKNOWLEDGE TAB ── */}
        {tab === 'acknowledge' && voyageEnded && (
          <View style={st.tabContent}>
            <View style={st.card}>
              <Text style={st.cardLabel}>
                {voyage.status === 'returned' ? 'Celebrate their return' : 'Acknowledge the attempt'}
              </Text>
              <TextInput
                style={[st.input, { minHeight: 80 }]}
                placeholder={
                  voyage.status === 'returned'
                    ? 'Say something to mark their return...'
                    : 'Acknowledge what they set out to do...'
                }
                placeholderTextColor={colors.textDim}
                value={ackText} onChangeText={setAckText}
                multiline maxLength={280} textAlignVertical="top"
              />
              <Text style={st.count}>{ackText.length}/280</Text>
              <TouchableOpacity
                style={[st.btn, sendingAck && st.btnDisabled]}
                onPress={handleAcknowledge} disabled={sendingAck}
              >
                {sendingAck
                  ? <ActivityIndicator color={colors.bg} />
                  : <Text style={st.btnText}>
                      {voyage.status === 'returned' ? 'Celebrate them' : 'Acknowledge them'}
                    </Text>}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: 48, gap: 20 },
  center: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' },

  back: { paddingHorizontal: 22, paddingTop: 58, marginBottom: -8 },
  backText: { fontFamily: fonts.regular, color: colors.textMid, fontSize: 14 },

  illustration: { marginTop: 8 },

  pierHeader: { paddingHorizontal: 22, gap: 5 },
  pierTitle: { fontFamily: fonts.bold, fontSize: 22, color: colors.text, lineHeight: 28 },
  pierTitleHandle: { fontFamily: fonts.boldItalic, color: colors.blue },
  pierCompanions: { fontFamily: fonts.regular, fontSize: 12, color: colors.textDim },

  goalCard: {
    marginHorizontal: 22,
    backgroundColor: colors.blueBg, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.blueBorder, padding: 20, gap: 10,
  },
  goalLabel: { fontFamily: fonts.semiBold, fontSize: 10, color: colors.blue, textTransform: 'uppercase', letterSpacing: 0.9 },
  goalText: { fontFamily: fonts.regular, fontSize: 18, color: colors.text, lineHeight: 26 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  dotBlue: { backgroundColor: colors.blue },
  dotGold: { backgroundColor: colors.gold },
  dotRose: { backgroundColor: colors.rose },
  statusText: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMid },
  obstacleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 2 },
  obstacleLabel: { fontFamily: fonts.semiBold, fontSize: 12, color: colors.textDim },
  obstacleText: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMid, flex: 1 },

  tabs: { flexDirection: 'row', gap: 8, paddingHorizontal: 22 },
  tab: {
    flex: 1, paddingVertical: 10, borderRadius: radius.sm,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center',
  },
  tabActive: { borderColor: colors.goldBorder, backgroundColor: colors.goldBg },
  tabText: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMid },
  tabTextActive: { fontFamily: fonts.semiBold, color: colors.gold },

  tabContent: { paddingHorizontal: 22, gap: 16 },
  subsection: { gap: 10 },
  subsectionLabel: { fontFamily: fonts.semiBold, fontSize: 10, color: colors.textDim, textTransform: 'uppercase', letterSpacing: 0.9 },

  card: {
    backgroundColor: colors.bgCard, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, padding: 18, gap: 12,
  },
  cardLabel: { fontFamily: fonts.semiBold, fontSize: 10, color: colors.textMid, textTransform: 'uppercase', letterSpacing: 0.9 },

  signalRow: {
    backgroundColor: colors.bgCard, borderRadius: radius.sm,
    borderWidth: 1, borderColor: colors.border, padding: 14, gap: 4,
  },
  signalQuote: { fontFamily: fonts.italic, fontSize: 14, color: colors.text, lineHeight: 20 },
  signalAuthor: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMid },

  suggestedRow: {
    backgroundColor: colors.bgCard, borderRadius: radius.sm,
    borderWidth: 1, borderColor: colors.border, padding: 14, gap: 4,
  },
  suggestedQuote: { fontFamily: fonts.italic, fontSize: 14, color: colors.textMid, lineHeight: 20 },
  suggestedAuthor: { fontFamily: fonts.regular, fontSize: 11, color: colors.textDim },

  input: {
    fontFamily: fonts.regular, fontSize: 15, color: colors.text,
    minHeight: 60, lineHeight: 22, borderBottomWidth: 1,
    borderBottomColor: colors.border, paddingVertical: 6,
  },
  inputSm: { minHeight: 36 },
  count: { fontFamily: fonts.regular, fontSize: 11, color: colors.textDim, textAlign: 'right' },

  btnSmall: { backgroundColor: colors.gold, borderRadius: radius.sm, paddingVertical: 10, alignItems: 'center' },
  btnSmallText: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.bg },
  btn: { backgroundColor: colors.gold, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center' },
  btnDisabled: { opacity: 0.5 },
  btnText: { fontFamily: fonts.semiBold, fontSize: 15, color: colors.bg },

  emptyBlock: { paddingVertical: 12, gap: 6 },
  emptyLabel: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.textMid },
  empty: { fontFamily: fonts.regular, fontSize: 14, color: colors.textDim, lineHeight: 20 },

  pulseCard: {
    backgroundColor: colors.bgCard, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, padding: 18, gap: 12,
  },
  pulseCardToday: { borderColor: colors.goldBorder },
  pulseCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pulseDate: { fontFamily: fonts.regular, fontSize: 12, color: colors.textDim },
  pulseTodayBadge: { fontFamily: fonts.semiBold, fontSize: 9, color: colors.gold, textTransform: 'uppercase', letterSpacing: 0.8 },
  pulseStatus: { fontFamily: fonts.regular, fontSize: 18, color: colors.text },
  wordPickerLabel: { fontFamily: fonts.semiBold, fontSize: 10, color: colors.textDim, textTransform: 'uppercase', letterSpacing: 0.8 },
  wordGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  wordBtn: {
    backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.sm, paddingVertical: 8, paddingHorizontal: 14,
  },
  wordBtnDisabled: { opacity: 0.4 },
  wordBtnText: { fontFamily: fonts.regular, fontSize: 14, color: colors.text },
  myResponse: { gap: 3 },
  myResponseLabel: { fontFamily: fonts.semiBold, fontSize: 9, color: colors.gold, textTransform: 'uppercase', letterSpacing: 0.8 },
  myResponseWord: { fontFamily: fonts.regular, fontSize: 17, color: colors.text },
  otherResponse: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMid },
  otherHandle: { fontFamily: fonts.semiBold, color: colors.blue },
});
