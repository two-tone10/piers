import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { colors, radius, fonts } from '../lib/theme';
import { sendSignal, acknowledge, getPulses, respondToPulse, RESPONSE_WORDS } from '../lib/supabase';

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
  const [loadingPulses, setLoadingPulses] = useState(true);
  const [customQuote, setCustomQuote] = useState('');
  const [customAuthor, setCustomAuthor] = useState('');
  const [ackText, setAckText] = useState('');
  const [sendingSignal, setSendingSignal] = useState(false);
  const [sendingAck, setSendingAck] = useState(false);
  const [respondingPulseId, setRespondingPulseId] = useState(null);
  const [tab, setTab] = useState('signals');

  const voyageEnded = ['returned', 'lost'].includes(voyage?.status);

  const loadPulses = useCallback(async () => {
    if (!voyage) return;
    try {
      const data = await getPulses(voyage.id);
      setPulses(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingPulses(false);
    }
  }, [voyage?.id]);

  useEffect(() => { loadPulses(); }, [loadPulses]);

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
      await loadPulses();
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
      <View style={styles.center}>
        <Text style={styles.empty}>Voyage not found.</Text>
      </View>
    );
  }

  const myResponsesMap = {};
  pulses.forEach((p) => {
    const mine = p.piers_pulse_responses?.find((r) => r.sender_id === user.id);
    if (mine) myResponsesMap[p.id] = mine.word;
  });

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Their pier</Text>

        <View style={[styles.card, styles.cardBlue]}>
          <Text style={styles.fieldLabel}>@{voyage.piers_users?.handle}'s goal</Text>
          <Text style={styles.goalText}>{voyage.goal}</Text>
          <Text style={styles.statusBadge}>
            {voyageEnded
              ? voyage.status === 'returned' ? 'They made it back' : 'The week expired'
              : 'Underway'}
          </Text>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, tab === 'signals' && styles.tabActive]}
            onPress={() => setTab('signals')}
          >
            <Text style={[styles.tabText, tab === 'signals' && styles.tabTextActive]}>Signals</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tab === 'pulse' && styles.tabActive]}
            onPress={() => setTab('pulse')}
          >
            <Text style={[styles.tabText, tab === 'pulse' && styles.tabTextActive]}>Pulse</Text>
          </TouchableOpacity>
          {voyageEnded && (
            <TouchableOpacity
              style={[styles.tab, tab === 'acknowledge' && styles.tabActive]}
              onPress={() => setTab('acknowledge')}
            >
              <Text style={[styles.tabText, tab === 'acknowledge' && styles.tabTextActive]}>Acknowledge</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Signals tab ── */}
        {tab === 'signals' && (
          <>
            {signals.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Signals sent</Text>
                {signals.map((s, i) => (
                  <View key={i} style={styles.signalRow}>
                    <Text style={styles.signalQuote}>"{s.quote}"</Text>
                    {!!s.author && <Text style={styles.signalAuthor}>— {s.author}</Text>}
                  </View>
                ))}
              </View>
            )}

            {!voyageEnded && (
              <>
                <Text style={styles.sectionLabel}>Send a signal from the shore</Text>
                {SUGGESTED_QUOTES.map((q, i) => (
                  <TouchableOpacity
                    key={i}
                    style={styles.suggestedRow}
                    onPress={() => handleSendSignal(q.quote, q.author)}
                    disabled={sendingSignal}
                  >
                    <Text style={styles.suggestedQuote}>"{q.quote}"</Text>
                    <Text style={styles.suggestedAuthor}>— {q.author}</Text>
                  </TouchableOpacity>
                ))}

                <View style={styles.card}>
                  <Text style={styles.fieldLabel}>Or write your own</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="A quote, a line, a word..."
                    placeholderTextColor={colors.textDim}
                    value={customQuote}
                    onChangeText={setCustomQuote}
                    multiline
                    maxLength={500}
                  />
                  <TextInput
                    style={[styles.input, styles.inputSm]}
                    placeholder="Attribution (optional)"
                    placeholderTextColor={colors.textDim}
                    value={customAuthor}
                    onChangeText={setCustomAuthor}
                    maxLength={160}
                  />
                  <TouchableOpacity
                    style={[styles.btnSmall, (sendingSignal || !customQuote.trim()) && styles.btnDisabled]}
                    onPress={() => handleSendSignal(customQuote, customAuthor)}
                    disabled={sendingSignal || !customQuote.trim()}
                  >
                    {sendingSignal
                      ? <ActivityIndicator color={colors.bg} size="small" />
                      : <Text style={styles.btnSmallText}>Send signal</Text>}
                  </TouchableOpacity>
                </View>
              </>
            )}

            {voyageEnded && signals.length === 0 && (
              <Text style={styles.empty}>No signals were sent during this voyage.</Text>
            )}
          </>
        )}

        {/* ── Pulse tab ── */}
        {tab === 'pulse' && (
          <>
            {loadingPulses ? (
              <ActivityIndicator color={colors.gold} />
            ) : pulses.length === 0 ? (
              <View style={styles.emptyBlock}>
                <Text style={styles.empty}>
                  No pulses yet. They'll appear here once they send their first daily status.
                </Text>
              </View>
            ) : (
              pulses.map((p) => {
                const myWord = myResponsesMap[p.id];
                const isToday = p.date_key === todayKey();
                const responding = respondingPulseId === p.id;

                return (
                  <View key={p.id} style={[styles.card, isToday && styles.cardPulseToday]}>
                    <View style={styles.pulseHeader}>
                      <Text style={styles.pulseDate}>{isToday ? 'Today' : formatDate(p.date_key)}</Text>
                      {isToday && <Text style={styles.pulseTodayBadge}>Latest</Text>}
                    </View>
                    <Text style={styles.pulseStatus}>{PULSE_LABELS[p.status]}</Text>

                    {myWord ? (
                      <View style={styles.myResponseBlock}>
                        <Text style={styles.myResponseLabel}>You responded</Text>
                        <Text style={styles.myResponseWord}>{myWord}</Text>
                      </View>
                    ) : !voyageEnded ? (
                      <>
                        <Text style={styles.wordPickerLabel}>Respond with one word</Text>
                        <View style={styles.wordGrid}>
                          {RESPONSE_WORDS.map((w) => (
                            <TouchableOpacity
                              key={w}
                              style={[styles.wordBtn, responding && styles.wordBtnDisabled]}
                              onPress={() => handleRespondToPulse(p.id, w)}
                              disabled={!!respondingPulseId}
                            >
                              {responding
                                ? <ActivityIndicator color={colors.text} size="small" />
                                : <Text style={styles.wordBtnText}>{w}</Text>}
                            </TouchableOpacity>
                          ))}
                        </View>
                      </>
                    ) : null}

                    {p.piers_pulse_responses?.filter((r) => r.sender_id !== user.id).map((r, i) => (
                      <Text key={i} style={styles.otherResponse}>
                        <Text style={styles.otherHandle}>@{r.piers_users?.handle} </Text>
                        {r.word}
                      </Text>
                    ))}
                  </View>
                );
              })
            )}
          </>
        )}

        {/* ── Acknowledge tab ── */}
        {tab === 'acknowledge' && voyageEnded && (
          <View style={styles.card}>
            <Text style={styles.fieldLabel}>
              {voyage.status === 'returned' ? 'Celebrate their return' : 'Acknowledge the attempt'}
            </Text>
            <TextInput
              style={styles.input}
              placeholder={
                voyage.status === 'returned'
                  ? 'Say something to mark their return...'
                  : 'Acknowledge what they set out to do...'
              }
              placeholderTextColor={colors.textDim}
              value={ackText}
              onChangeText={setAckText}
              multiline
              maxLength={280}
              textAlignVertical="top"
            />
            <Text style={styles.count}>{ackText.length}/280</Text>
            <TouchableOpacity
              style={[styles.btn, sendingAck && styles.btnDisabled]}
              onPress={handleAcknowledge}
              disabled={sendingAck}
            >
              {sendingAck
                ? <ActivityIndicator color={colors.bg} />
                : <Text style={styles.btnText}>
                    {voyage.status === 'returned' ? 'Celebrate them' : 'Acknowledge them'}
                  </Text>}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 24, paddingTop: 60, gap: 16, paddingBottom: 40 },
  center: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' },
  back: { marginBottom: 4 },
  backText: { fontFamily: fonts.regular, color: colors.textMid, fontSize: 14 },
  title: { fontFamily: fonts.bold, fontSize: 28, color: colors.text, letterSpacing: -0.5 },
  card: { backgroundColor: colors.bgCard, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: 20, gap: 10 },
  cardBlue: { borderColor: colors.blueBorder, backgroundColor: colors.blueBg },
  cardPulseToday: { borderColor: colors.goldBorder },
  fieldLabel: { fontFamily: fonts.semiBold, fontSize: 11, color: colors.textMid, textTransform: 'uppercase', letterSpacing: 0.8 },
  goalText: { fontFamily: fonts.regular, fontSize: 18, color: colors.text, lineHeight: 26 },
  statusBadge: { fontFamily: fonts.regular, fontSize: 12, color: colors.blue },

  tabs: { flexDirection: 'row', gap: 8 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  tabActive: { borderColor: colors.goldBorder, backgroundColor: colors.goldBg },
  tabText: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMid },
  tabTextActive: { fontFamily: fonts.semiBold, color: colors.gold },

  section: { gap: 10 },
  sectionLabel: { fontFamily: fonts.semiBold, fontSize: 11, color: colors.textMid, textTransform: 'uppercase', letterSpacing: 0.8 },
  signalRow: { backgroundColor: colors.bgCard, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 4 },
  signalQuote: { fontFamily: fonts.italic, fontSize: 14, color: colors.text, lineHeight: 20 },
  signalAuthor: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMid },
  suggestedRow: { backgroundColor: colors.bgCard, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 4 },
  suggestedQuote: { fontFamily: fonts.italic, fontSize: 14, color: colors.textMid, lineHeight: 20 },
  suggestedAuthor: { fontFamily: fonts.regular, fontSize: 11, color: colors.textDim },
  input: { fontFamily: fonts.regular, fontSize: 15, color: colors.text, minHeight: 60, lineHeight: 22, borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: 6 },
  inputSm: { minHeight: 36 },
  count: { fontFamily: fonts.regular, fontSize: 11, color: colors.textDim, textAlign: 'right' },
  btnSmall: { backgroundColor: colors.gold, borderRadius: radius.sm, paddingVertical: 10, alignItems: 'center' },
  btnSmallText: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.bg },
  btn: { backgroundColor: colors.gold, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center' },
  btnDisabled: { opacity: 0.5 },
  btnText: { fontFamily: fonts.semiBold, fontSize: 15, color: colors.bg },
  emptyBlock: { paddingVertical: 24, alignItems: 'center' },
  empty: { fontFamily: fonts.regular, fontSize: 14, color: colors.textDim, textAlign: 'center', lineHeight: 20 },

  pulseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pulseDate: { fontFamily: fonts.regular, fontSize: 12, color: colors.textDim },
  pulseTodayBadge: { fontFamily: fonts.semiBold, fontSize: 10, color: colors.gold, textTransform: 'uppercase', letterSpacing: 0.6 },
  pulseStatus: { fontFamily: fonts.regular, fontSize: 17, color: colors.text },
  wordPickerLabel: { fontFamily: fonts.semiBold, fontSize: 10, color: colors.textDim, textTransform: 'uppercase', letterSpacing: 0.8 },
  wordGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  wordBtn: { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingVertical: 8, paddingHorizontal: 14 },
  wordBtnDisabled: { opacity: 0.5 },
  wordBtnText: { fontFamily: fonts.regular, fontSize: 14, color: colors.text },
  myResponseBlock: { gap: 2 },
  myResponseLabel: { fontFamily: fonts.semiBold, fontSize: 10, color: colors.gold, textTransform: 'uppercase', letterSpacing: 0.8 },
  myResponseWord: { fontFamily: fonts.regular, fontSize: 16, color: colors.text },
  otherResponse: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMid },
  otherHandle: { fontFamily: fonts.semiBold, color: colors.blue },
});
