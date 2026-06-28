import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { colors, radius } from '../lib/theme';
import { sendSignal, acknowledge } from '../lib/supabase';

const SUGGESTED_QUOTES = [
  { quote: 'It does not matter how slowly you go as long as you do not stop.', author: 'Confucius' },
  { quote: 'The obstacle is the way.', author: 'Marcus Aurelius' },
  { quote: 'Do not wait for the perfect moment. Take the moment and make it perfect.', author: 'Unknown' },
  { quote: 'Courage is resistance to fear, mastery of fear — not absence of fear.', author: 'Mark Twain' },
  { quote: 'What you do today can improve all your tomorrows.', author: 'Ralph Marston' },
];

export default function PierWatchScreen({ route, navigation, user }) {
  const { membership, signals: initialSignals = [] } = route.params;
  const voyage = membership?.piers_voyages;
  const [signals, setSignals] = useState(initialSignals);
  const [customQuote, setCustomQuote] = useState('');
  const [customAuthor, setCustomAuthor] = useState('');
  const [ackText, setAckText] = useState('');
  const [sendingSignal, setSendingSignal] = useState(false);
  const [sendingAck, setSendingAck] = useState(false);
  const [tab, setTab] = useState('signals');

  const voyageEnded = ['returned', 'lost'].includes(voyage?.status);

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

  async function handleAcknowledge() {
    if (!ackText.trim()) return Alert.alert('Say something', 'Write a few words for them.');
    setSendingAck(true);
    try {
      await acknowledge({ voyageId: voyage.id, userId: user.id, text: ackText.trim() });
      Alert.alert('Acknowledged', 'Your words have reached them.', [
        { text: 'Done', onPress: () => navigation.goBack() },
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

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Standing on their pier</Text>

        <View style={[styles.card, styles.cardBlue]}>
          <Text style={styles.fieldLabel}>Their goal</Text>
          <Text style={styles.goalText}>{voyage.goal}</Text>
          <Text style={styles.statusBadge}>
            {voyageEnded
              ? voyage.status === 'returned' ? '⚓  They made it back' : '🌊  The week expired'
              : '⛵  Underway'}
          </Text>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, tab === 'signals' && styles.tabActive]}
            onPress={() => setTab('signals')}
          >
            <Text style={[styles.tabText, tab === 'signals' && styles.tabTextActive]}>
              Signals
            </Text>
          </TouchableOpacity>
          {voyageEnded && (
            <TouchableOpacity
              style={[styles.tab, tab === 'acknowledge' && styles.tabActive]}
              onPress={() => setTab('acknowledge')}
            >
              <Text style={[styles.tabText, tab === 'acknowledge' && styles.tabTextActive]}>
                Acknowledge
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {tab === 'signals' && (
          <>
            {/* Signals sent so far */}
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

                {/* Suggested quotes */}
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

                {/* Custom signal */}
                <View style={styles.card}>
                  <Text style={styles.fieldLabel}>Or write your own</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="A quote, a line, a word of signal..."
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
                    style={[styles.btnSmall, sendingSignal && styles.btnDisabled]}
                    onPress={() => handleSendSignal(customQuote, customAuthor)}
                    disabled={sendingSignal || !customQuote.trim()}
                  >
                    {sendingSignal
                      ? <ActivityIndicator color={colors.bg} size="small" />
                      : <Text style={styles.btnSmallText}>Send signal 📡</Text>}
                  </TouchableOpacity>
                </View>
              </>
            )}

            {voyageEnded && signals.length === 0 && (
              <Text style={styles.empty}>No signals were sent during this voyage.</Text>
            )}
          </>
        )}

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
                    {voyage.status === 'returned' ? '🎉 Celebrate them' : '⚓ Acknowledge them'}
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
  backText: { color: colors.textMid, fontSize: 14 },
  title: { fontSize: 28, fontWeight: '700', color: colors.text, letterSpacing: -0.5 },
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    gap: 10,
  },
  cardBlue: { borderColor: colors.blueBorder, backgroundColor: colors.blueBg },
  fieldLabel: {
    fontSize: 11, color: colors.textMid, textTransform: 'uppercase', letterSpacing: 0.8,
  },
  goalText: { fontSize: 18, color: colors.text, lineHeight: 26 },
  statusBadge: { fontSize: 12, color: colors.blue },
  tabs: { flexDirection: 'row', gap: 8 },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  tabActive: { borderColor: colors.goldBorder, backgroundColor: colors.goldBg },
  tabText: { fontSize: 13, color: colors.textMid },
  tabTextActive: { color: colors.gold, fontWeight: '600' },
  section: { gap: 10 },
  sectionLabel: {
    fontSize: 11, color: colors.textMid, textTransform: 'uppercase', letterSpacing: 0.8,
  },
  signalRow: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 4,
  },
  signalQuote: { fontSize: 14, color: colors.text, lineHeight: 20, fontStyle: 'italic' },
  signalAuthor: { fontSize: 12, color: colors.textMid },
  suggestedRow: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 4,
  },
  suggestedQuote: { fontSize: 14, color: colors.textMid, lineHeight: 20, fontStyle: 'italic' },
  suggestedAuthor: { fontSize: 11, color: colors.textDim },
  input: {
    fontSize: 15,
    color: colors.text,
    minHeight: 60,
    lineHeight: 22,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 6,
  },
  inputSm: { minHeight: 36 },
  count: { fontSize: 11, color: colors.textDim, textAlign: 'right' },
  btnSmall: {
    backgroundColor: colors.gold,
    borderRadius: radius.sm,
    paddingVertical: 10,
    alignItems: 'center',
  },
  btnSmallText: { fontSize: 14, fontWeight: '600', color: colors.bg },
  btn: {
    backgroundColor: colors.gold,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { fontSize: 15, fontWeight: '600', color: colors.bg },
  empty: { fontSize: 14, color: colors.textDim, textAlign: 'center', paddingVertical: 16 },
});
