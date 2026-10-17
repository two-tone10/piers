import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { colors, radius, fonts } from '../lib/theme';
import { joinPier } from '../lib/supabase';

function timeLeft(expiresAt) {
  const diff = new Date(expiresAt) - Date.now();
  if (diff <= 0) return 'Expires today';
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return `${days}d ${hours}h remaining`;
  return `${hours}h remaining`;
}

export default function JoinPierScreen({ route, navigation, user }) {
  const { voyage } = route.params;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleJoin() {
    setLoading(true);
    try {
      await joinPier(voyage.id);
      navigation.replace('PierWatch', { voyageId: voyage.id, handle: voyage.handle });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={s.back}>
        <Text style={s.backText}>← Back</Text>
      </TouchableOpacity>

      <View style={s.heading}>
        <Text style={s.title}>Stand on their pier.</Text>
        <Text style={s.sub}>
          You hold the shore while they go do it.
          {voyage.mode === 'solo' ? ' You\'re their only peer.' : ' You\'ll share it with one other peer.'}
        </Text>
      </View>

      <View style={s.rule} />

      <View style={s.goalCard}>
        <Text style={s.fieldLabel}>Their goal this week</Text>
        <Text style={s.goalText}>{voyage.goal}</Text>
      </View>

      <View style={s.obstacleCard}>
        <Text style={s.fieldLabel}>What they're up against</Text>
        <Text style={s.obstacleText}>{voyage.obstacle}</Text>
      </View>

      <View style={s.metaRow}>
        <Text style={s.metaHandle}>@{voyage.handle}</Text>
        <Text style={s.metaTimer}>{timeLeft(voyage.expires_at)}</Text>
      </View>

      <View style={s.rule} />

      <View style={s.commitmentBlock}>
        <Text style={s.commitmentTitle}>What you're agreeing to</Text>
        <View style={s.commitmentList}>
          {[
            'Send them signals. Answer their daily pulse with one word.',
            ...(voyage.mode === 'solo'
              ? ['You alone decide if they made it.']
              : ['Talk with the other peer on the Shore. They never see it.',
                 'Agree together to send supplies: an extra day, a rest day, a call, a sealed note, a link.']),
            'When the week ends, acknowledge them.',
            'You can stand on up to 10 piers at a time.',
          ].map((line, i) => (
            <View key={i} style={s.commitmentItem}>
              <View style={s.commitmentDot} />
              <Text style={s.commitmentText}>{line}</Text>
            </View>
          ))}
        </View>
      </View>

      {!!error && <Text style={s.error}>{error}</Text>}

      <TouchableOpacity
        style={[s.btn, loading && s.btnDisabled]}
        onPress={handleJoin}
        disabled={loading}
      >
        {loading
          ? <ActivityIndicator color={colors.bg} />
          : <Text style={s.btnText}>Stand on this pier</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 26, paddingTop: 64, gap: 22, paddingBottom: 48 },

  back: { marginBottom: -4 },
  backText: { fontFamily: fonts.regular, color: colors.textMid, fontSize: 14 },

  heading: { gap: 10 },
  title: { fontFamily: fonts.boldItalic, fontSize: 34, color: colors.text, letterSpacing: -0.5 },
  sub: { fontFamily: fonts.light, fontSize: 15, color: colors.textMid, lineHeight: 23 },

  rule: { height: 1, backgroundColor: colors.border },
  error: { fontFamily: fonts.regular, fontSize: 13, color: colors.rose },

  goalCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.goldBorder,
    padding: 20, gap: 10,
  },
  obstacleCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.borderStrong,
    padding: 20, gap: 10,
  },
  fieldLabel: {
    fontFamily: fonts.semiBold, fontSize: 10, color: colors.textDim,
    textTransform: 'uppercase', letterSpacing: 1,
  },
  goalText: { fontFamily: fonts.regular, fontSize: 19, color: colors.text, lineHeight: 28 },
  obstacleText: { fontFamily: fonts.regular, fontSize: 15, color: colors.textMid, lineHeight: 23 },

  metaRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  metaHandle: { fontFamily: fonts.semiBold, fontSize: 13, color: colors.blue },
  metaTimer: { fontFamily: fonts.regular, fontSize: 12, color: colors.textDim },

  commitmentBlock: { gap: 14 },
  commitmentTitle: {
    fontFamily: fonts.semiBold, fontSize: 11, color: colors.textDim,
    textTransform: 'uppercase', letterSpacing: 1.1,
  },
  commitmentList: { gap: 12 },
  commitmentItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  commitmentDot: {
    width: 4, height: 4, borderRadius: 2,
    backgroundColor: colors.textDim, marginTop: 8,
  },
  commitmentText: { fontFamily: fonts.regular, fontSize: 14, color: colors.textMid, lineHeight: 22, flex: 1 },

  btn: {
    backgroundColor: colors.blue,
    borderRadius: radius.md,
    paddingVertical: 18,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { fontFamily: fonts.semiBold, fontSize: 16, color: colors.bg },
});
