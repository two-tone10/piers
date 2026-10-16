import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, Dimensions,
} from 'react-native';
import { colors, radius, fonts } from '../lib/theme';
import {
  getVoyageDetail, sendSignal, acknowledge, respondToPulse, confirmDone,
  sendShore, proposeSupply, cosignSupply, declineSupply, reportUser, blockUser,
  RESPONSE_WORDS, PULSE_LABELS, SUPPLY_KINDS, supplyLabel, todayKey,
} from '../lib/supabase';
import PierScene from '../components/PierScene';

const { width: W } = Dimensions.get('window');

const SUGGESTED_QUOTES = [
  { quote: 'It does not matter how slowly you go as long as you do not stop.', author: 'Confucius' },
  { quote: 'The obstacle is the way.', author: 'Marcus Aurelius' },
  { quote: 'What you do today can improve all your tomorrows.', author: 'Ralph Marston' },
];

function formatDate(dateKey) {
  return new Date(dateKey + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function timeOf(ts) {
  return new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export default function PierWatchScreen({ route, navigation, user }) {
  const { voyageId, handle: initialHandle = '' } = route.params;
  const [detail, setDetail] = useState(null);
  const [tab, setTab] = useState('pulse');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [customQuote, setCustomQuote] = useState('');
  const [ackText, setAckText] = useState('');
  const [shoreText, setShoreText] = useState('');
  const [kind, setKind] = useState(null);
  const [supplyText, setSupplyText] = useState('');
  const [menu, setMenu] = useState(null);
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    try { setDetail(await getVoyageDetail(voyageId)); }
    catch (e) { setError(e.message); }
  }, [voyageId]);

  useEffect(() => { load(); }, [load]);

  const tabRef = useRef(tab);
  tabRef.current = tab;
  useEffect(() => {
    const id = setInterval(() => { if (tabRef.current === 'shore' || tabRef.current === 'supplies') load(); }, 8000);
    return () => clearInterval(id);
  }, [load]);

  async function run(fn, done) {
    setBusy(true);
    setError('');
    try { await fn(); done?.(); await load(); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  if (!detail) {
    return <View style={st.center}>{error ? <Text style={st.error}>{error}</Text> : <ActivityIndicator color={colors.gold} />}</View>;
  }

  if (detail.role !== 'peer') {
    return (
      <View style={st.center}>
        <Text style={st.empty}>You're not on this pier.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={st.backText}>← Back</Text></TouchableOpacity>
      </View>
    );
  }

  const { voyage, members, signals, pulses, supplies = [], shore = [] } = detail;
  const handle = voyage.handle ?? initialHandle;
  const solo = voyage.mode === 'solo';
  const ended = ['returned', 'lost'].includes(voyage.status);
  const other = members.find((m) => m.user_id !== user.id);
  const me = members.find((m) => m.user_id === user.id);
  const needsConfirm = solo && voyage.status === 'underway' && !!voyage.claimed_at;
  const pending = supplies.filter((s) => s.status === 'proposed');
  const waitingOnMe = pending.filter((s) => s.proposed_by !== user.id).length;
  const kindDef = SUPPLY_KINDS.find((k) => k.key === kind);

  const tabs = [
    ['pulse', 'Pulse'],
    ['signals', 'Signals'],
    ...(solo ? [] : [['shore', 'Shore'], ['supplies', waitingOnMe ? `Supplies · ${waitingOnMe}` : 'Supplies']]),
    ...(ended && !me?.acknowledged_at ? [['acknowledge', 'Acknowledge']] : []),
  ];

  function safety(target, messageId) {
    setMenu({ target, messageId });
  }

  return (
    <KeyboardAvoidingView style={st.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={st.content} keyboardShouldPersistTaps="handled">
        <View style={st.topRow}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={st.backText}>← Back</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => safety({ id: voyage.user_id, handle })}>
            <Text style={st.backText}>···</Text>
          </TouchableOpacity>
        </View>

        <PierScene width={W} height={190} handle={handle} />

        <View style={st.pad}>
          <Text style={st.pierTitle}>
            Standing on <Text style={st.pierTitleHandle}>@{handle}</Text>'s pier
          </Text>
          <Text style={st.sub}>
            {solo ? 'Solo. You\'re their only peer.'
              : other ? `With @${other.handle}` : 'Waiting for a second peer'}
          </Text>
        </View>

        <View style={st.goalCard}>
          <Text style={st.goalLabel}>Their goal this week</Text>
          <Text style={st.goalText}>{voyage.goal}</Text>
          <Text style={st.statusText}>
            {voyage.status === 'returned' ? 'They made it'
              : voyage.status === 'lost' ? 'The week ended'
              : voyage.status === 'open' ? 'Not started yet'
              : needsConfirm ? 'They say they did it' : 'Underway'}
          </Text>
          {!!voyage.obstacle && <Text style={st.obstacleText}>Obstacle: {voyage.obstacle}</Text>}
        </View>

        {needsConfirm && (
          <View style={[st.card, st.mx]}>
            <Text style={st.cardLabel}>Did they make it?</Text>
            <Text style={st.body}>You're their only peer, so it's your call.</Text>
            <View style={st.row}>
              <TouchableOpacity style={[st.btn, st.flex]} disabled={busy} onPress={() => run(() => confirmDone(voyage.id, true))}>
                <Text style={st.btnText}>Yes</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[st.btnOutline, st.flex]} disabled={busy} onPress={() => run(() => confirmDone(voyage.id, false))}>
                <Text style={st.btnOutlineText}>Not yet</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={st.tabs}>
          {tabs.map(([k, label]) => (
            <TouchableOpacity key={k} style={[st.tab, tab === k && st.tabActive]} onPress={() => setTab(k)}>
              <Text style={[st.tabText, tab === k && st.tabTextActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {!!error && <Text style={[st.error, st.mx]}>{error}</Text>}
        {!!notice && <Text style={[st.notice, st.mx]}>{notice}</Text>}

        {tab === 'pulse' && (
          <View style={st.tabContent}>
            {pulses.length === 0 ? (
              <Text style={st.empty}>No pulses yet.</Text>
            ) : pulses.map((p) => {
              const mine = p.responses?.find((r) => r.sender_id === user.id);
              const isToday = p.date_key === todayKey();
              return (
                <View key={p.id} style={[st.card, isToday && st.cardToday]}>
                  <Text style={st.meta}>{isToday ? 'Today' : formatDate(p.date_key)}</Text>
                  <Text style={st.pulseStatus}>{PULSE_LABELS[p.status]}</Text>
                  {!!p.note && <Text style={st.italic}>{p.note}</Text>}
                  {mine ? (
                    <Text style={st.meta}>You said <Text style={st.strong}>{mine.word}</Text></Text>
                  ) : !ended && (
                    <View style={st.wordGrid}>
                      {RESPONSE_WORDS.map((w) => (
                        <TouchableOpacity key={w} style={st.chip} disabled={busy}
                          onPress={() => run(() => respondToPulse({ pulseId: p.id, word: w }))}>
                          <Text style={st.chipText}>{w}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                  {p.responses?.filter((r) => r.sender_id !== user.id).map((r, i) => (
                    <Text key={i} style={st.meta}><Text style={st.handle}>@{r.handle} </Text>{r.word}</Text>
                  ))}
                </View>
              );
            })}
          </View>
        )}

        {tab === 'signals' && (
          <View style={st.tabContent}>
            {signals.map((sig) => (
              <View key={sig.id} style={st.signalRow}>
                <Text style={st.italic}>"{sig.quote}"</Text>
                <Text style={st.meta}>{sig.author ? `— ${sig.author} · ` : ''}@{sig.handle}</Text>
              </View>
            ))}
            {!ended && (
              <>
                {SUGGESTED_QUOTES.map((q, i) => (
                  <TouchableOpacity key={i} style={st.card} disabled={busy}
                    onPress={() => run(() => sendSignal({ voyageId: voyage.id, quote: q.quote, author: q.author }))}>
                    <Text style={st.body}>"{q.quote}"</Text>
                    <Text style={st.meta}>— {q.author}</Text>
                  </TouchableOpacity>
                ))}
                <View style={st.card}>
                  <TextInput style={st.input} placeholder="Or write your own" placeholderTextColor={colors.textDim}
                    value={customQuote} onChangeText={setCustomQuote} multiline maxLength={500} />
                  <TouchableOpacity style={[st.btnSmall, (!customQuote.trim() || busy) && st.disabled]}
                    disabled={!customQuote.trim() || busy}
                    onPress={() => run(() => sendSignal({ voyageId: voyage.id, quote: customQuote.trim() }), () => setCustomQuote(''))}>
                    <Text style={st.btnText}>Send signal</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        )}

        {tab === 'shore' && (
          <View style={st.tabContent}>
            <Text style={st.meta}>Just you and @{other?.handle ?? '…'}. @{handle} can't see this.</Text>
            {shore.length === 0 && <Text style={st.empty}>Nothing said yet.</Text>}
            {shore.map((m) => {
              const mine = m.sender_id === user.id;
              return (
                <TouchableOpacity key={m.id} activeOpacity={0.9}
                  onLongPress={() => !mine && safety({ id: m.sender_id, handle: m.handle }, m.id)}
                  style={[st.bubble, mine ? st.bubbleMine : st.bubbleOther]}>
                  <Text style={[st.bubbleText, mine && st.bubbleTextMine]}>{m.body}</Text>
                  <Text style={[st.bubbleMeta, mine && st.bubbleTextMine]}>{mine ? 'You' : `@${m.handle}`} · {timeOf(m.created_at)}</Text>
                </TouchableOpacity>
              );
            })}
            {!!other && (
              <View style={st.composer}>
                <TextInput style={[st.input, st.flex]} placeholder="Say something" placeholderTextColor={colors.textDim}
                  value={shoreText} onChangeText={setShoreText} maxLength={500} multiline />
                <TouchableOpacity style={[st.sendBtn, (!shoreText.trim() || busy) && st.disabled]}
                  disabled={!shoreText.trim() || busy}
                  onPress={() => run(() => sendShore(voyage.id, shoreText.trim()), () => setShoreText(''))}>
                  <Text style={st.btnText}>Send</Text>
                </TouchableOpacity>
              </View>
            )}
            {!!other && <Text style={st.meta}>Long-press a message to report it.</Text>}
          </View>
        )}

        {tab === 'supplies' && (
          <View style={st.tabContent}>
            <Text style={st.meta}>One of you proposes. The other signs. Then it reaches @{handle}.</Text>

            {pending.map((s) => {
              const mine = s.proposed_by === user.id;
              return (
                <View key={s.id} style={[st.card, !mine && st.cardToday]}>
                  <Text style={st.strong}>{supplyLabel(s.kind)}</Text>
                  {!!s.body && <Text style={st.body}>{s.body}</Text>}
                  {!!s.url && <Text style={st.link}>{s.url}</Text>}
                  {mine ? (
                    <Text style={st.meta}>Waiting for @{other?.handle ?? 'your co-peer'} to sign.</Text>
                  ) : (
                    <>
                      <Text style={st.meta}>@{s.proposer} wants to send this.</Text>
                      <View style={st.row}>
                        <TouchableOpacity style={[st.btn, st.flex]} disabled={busy}
                          onPress={() => run(() => cosignSupply(s.id), () => setNotice('Signed. It\'s on its way.'))}>
                          <Text style={st.btnText}>Sign</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[st.btnOutline, st.flex]} disabled={busy}
                          onPress={() => run(() => declineSupply(s.id))}>
                          <Text style={st.btnOutlineText}>Pass</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                </View>
              );
            })}

            {!ended && (
              <View style={st.card}>
                <Text style={st.cardLabel}>Propose a supply</Text>
                <View style={st.wordGrid}>
                  {SUPPLY_KINDS.map((k) => (
                    <TouchableOpacity key={k.key} style={[st.chip, kind === k.key && st.chipOn]}
                      onPress={() => { setKind(k.key); setSupplyText(''); }}>
                      <Text style={[st.chipText, kind === k.key && st.chipTextOn]}>{k.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {!!kindDef && <Text style={st.meta}>{kindDef.hint}</Text>}
                {!!kindDef?.field && (
                  <TextInput style={st.input} placeholder={kindDef.placeholder} placeholderTextColor={colors.textDim}
                    value={supplyText} onChangeText={setSupplyText} maxLength={500} multiline={kindDef.field === 'body'}
                    autoCapitalize={kindDef.field === 'url' ? 'none' : 'sentences'} />
                )}
                <TouchableOpacity
                  style={[st.btnSmall, (!kind || busy || (kindDef?.field && !supplyText.trim()) || !other) && st.disabled]}
                  disabled={!kind || busy || (kindDef?.field && !supplyText.trim()) || !other}
                  onPress={() => run(() => proposeSupply({
                    voyageId: voyage.id, kind,
                    [kindDef.field || 'body']: kindDef.field ? supplyText.trim() : null,
                  }), () => { setKind(null); setSupplyText(''); setNotice(`Sent to @${other.handle} to sign.`); })}>
                  <Text style={st.btnText}>{other ? `Ask @${other.handle} to sign` : 'Needs a second peer'}</Text>
                </TouchableOpacity>
              </View>
            )}

            {supplies.filter((s) => s.status === 'delivered').length > 0 && (
              <>
                <Text style={st.cardLabel}>Sent</Text>
                {supplies.filter((s) => s.status === 'delivered').map((s) => (
                  <Text key={s.id} style={st.meta}>{supplyLabel(s.kind)} · @{s.proposer} + @{s.cosigner}</Text>
                ))}
              </>
            )}
          </View>
        )}

        {tab === 'acknowledge' && (
          <View style={st.tabContent}>
            <View style={st.card}>
              <Text style={st.cardLabel}>{voyage.status === 'returned' ? 'Celebrate them' : 'Acknowledge the attempt'}</Text>
              <TextInput style={[st.input, { minHeight: 80 }]} placeholder="A few words for them"
                placeholderTextColor={colors.textDim} value={ackText} onChangeText={setAckText}
                multiline maxLength={280} textAlignVertical="top" />
              <TouchableOpacity style={[st.btnSmall, (!ackText.trim() || busy) && st.disabled]}
                disabled={!ackText.trim() || busy}
                onPress={() => run(() => acknowledge({ voyageId: voyage.id, text: ackText.trim() }), () => navigation.goBack())}>
                <Text style={st.btnText}>Send</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {!!menu && (
          <View style={[st.card, st.mx]}>
            <Text style={st.cardLabel}>@{menu.target.handle}</Text>
            <TouchableOpacity style={st.btnOutline} disabled={busy}
              onPress={() => run(() => reportUser({ userId: menu.target.id, voyageId: voyage.id, messageId: menu.messageId, reason: menu.messageId ? 'shore message' : 'pier' }),
                () => { setMenu(null); setNotice('Reported. Thanks.'); })}>
              <Text style={st.btnOutlineText}>Report</Text>
            </TouchableOpacity>
            <TouchableOpacity style={st.btnOutline} disabled={busy}
              onPress={() => run(() => blockUser(menu.target.id), () => { setMenu(null); navigation.goBack(); })}>
              <Text style={st.btnOutlineText}>Block and leave</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setMenu(null)}><Text style={[st.meta, st.centerText]}>Cancel</Text></TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: 48, gap: 18 },
  center: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 24 },
  centerText: { textAlign: 'center' },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 22, paddingTop: 58, marginBottom: -8 },
  backText: { fontFamily: fonts.regular, color: colors.textMid, fontSize: 14 },
  pad: { paddingHorizontal: 22, gap: 4 },
  mx: { marginHorizontal: 22 },
  pierTitle: { fontFamily: fonts.bold, fontSize: 22, color: colors.text, lineHeight: 28 },
  pierTitleHandle: { fontFamily: fonts.boldItalic, color: colors.blue },
  sub: { fontFamily: fonts.regular, fontSize: 12, color: colors.textDim },

  goalCard: {
    marginHorizontal: 22, backgroundColor: colors.blueBg, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.blueBorder, padding: 20, gap: 8,
  },
  goalLabel: { fontFamily: fonts.semiBold, fontSize: 10, color: colors.blue, textTransform: 'uppercase', letterSpacing: 0.9 },
  goalText: { fontFamily: fonts.regular, fontSize: 18, color: colors.text, lineHeight: 26 },
  statusText: { fontFamily: fonts.semiBold, fontSize: 12, color: colors.gold },
  obstacleText: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMid },

  tabs: { flexDirection: 'row', gap: 6, paddingHorizontal: 22, flexWrap: 'wrap' },
  tab: { paddingVertical: 9, paddingHorizontal: 12, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border },
  tabActive: { borderColor: colors.goldBorder, backgroundColor: colors.goldBg },
  tabText: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMid },
  tabTextActive: { fontFamily: fonts.semiBold, color: colors.gold },
  tabContent: { paddingHorizontal: 22, gap: 12 },

  card: { backgroundColor: colors.bgCard, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 8 },
  cardToday: { borderColor: colors.goldBorder },
  cardLabel: { fontFamily: fonts.semiBold, fontSize: 11, color: colors.textMid, textTransform: 'uppercase', letterSpacing: 0.8 },
  body: { fontFamily: fonts.regular, fontSize: 15, color: colors.text, lineHeight: 22 },
  italic: { fontFamily: fonts.italic, fontSize: 14, color: colors.textMid, lineHeight: 20 },
  meta: { fontFamily: fonts.regular, fontSize: 12, color: colors.textDim, lineHeight: 18 },
  strong: { fontFamily: fonts.semiBold, color: colors.text, fontSize: 15 },
  handle: { fontFamily: fonts.semiBold, color: colors.blue },
  link: { fontFamily: fonts.regular, fontSize: 13, color: colors.blue },
  pulseStatus: { fontFamily: fonts.regular, fontSize: 17, color: colors.text },
  empty: { fontFamily: fonts.regular, fontSize: 14, color: colors.textDim },
  error: { fontFamily: fonts.regular, fontSize: 13, color: colors.rose },
  notice: { fontFamily: fonts.semiBold, fontSize: 13, color: colors.gold },
  signalRow: { borderLeftWidth: 2, borderLeftColor: colors.goldBorder, paddingLeft: 12, gap: 2 },

  wordGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingVertical: 8, paddingHorizontal: 12 },
  chipOn: { borderColor: colors.gold, backgroundColor: colors.goldBg },
  chipText: { fontFamily: fonts.regular, fontSize: 13, color: colors.text },
  chipTextOn: { fontFamily: fonts.semiBold, color: colors.gold },

  input: {
    fontFamily: fonts.regular, fontSize: 15, color: colors.text, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.sm, padding: 12, minHeight: 44,
  },
  row: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1 },
  btn: { backgroundColor: colors.gold, borderRadius: radius.md, paddingVertical: 13, alignItems: 'center' },
  btnSmall: { backgroundColor: colors.blue, borderRadius: radius.sm, paddingVertical: 12, alignItems: 'center' },
  btnText: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.bg },
  btnOutline: { borderWidth: 1, borderColor: colors.goldBorder, borderRadius: radius.md, paddingVertical: 12, alignItems: 'center' },
  btnOutlineText: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.gold },
  disabled: { opacity: 0.4 },

  bubble: { maxWidth: '82%', borderRadius: radius.md, paddingVertical: 10, paddingHorizontal: 14, gap: 4 },
  bubbleMine: { alignSelf: 'flex-end', backgroundColor: colors.blue },
  bubbleOther: { alignSelf: 'flex-start', backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border },
  bubbleText: { fontFamily: fonts.regular, fontSize: 15, color: colors.text, lineHeight: 21 },
  bubbleTextMine: { color: colors.bg },
  bubbleMeta: { fontFamily: fonts.regular, fontSize: 10, color: colors.textDim },
  composer: { flexDirection: 'row', gap: 8, alignItems: 'flex-end' },
  sendBtn: { backgroundColor: colors.blue, borderRadius: radius.sm, paddingVertical: 12, paddingHorizontal: 16 },
});
