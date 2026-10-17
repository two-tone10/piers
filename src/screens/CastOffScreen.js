import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { colors, radius, fonts } from '../lib/theme';
import { castOff } from '../lib/supabase';

function Choice({ on, onPress, title, body }) {
  return (
    <TouchableOpacity style={[s.choice, on && s.choiceOn]} onPress={onPress} activeOpacity={0.8}>
      <View style={[s.radio, on && s.radioOn]} />
      <View style={s.choiceBody}>
        <Text style={[s.choiceTitle, on && s.choiceTitleOn]}>{title}</Text>
        <Text style={s.choiceText}>{body}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function CastOffScreen({ route, navigation, user }) {
  const [goal, setGoal] = useState('');
  const [obstacle, setObstacle] = useState('');
  const [mode, setMode] = useState('pair');
  const [listed, setListed] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!goal.trim()) return setError('Name your goal before casting off.');
    if (!obstacle.trim()) return setError('Name your biggest obstacle.');
    setError('');
    setLoading(true);
    try {
      const v = await castOff({ goal: goal.trim(), obstacle: obstacle.trim(), mode, listed });
      navigation.replace('MyVoyage', { voyageId: v.id });
    } catch (e) {
      setError(e.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.back}>
          <Text style={s.backText}>← Back</Text>
        </TouchableOpacity>

        <View style={s.heading}>
          <Text style={s.title}>Cast off.</Text>
          <Text style={s.sub}>
            One goal. One week. Be precise — vague goals drift before you leave the dock.
          </Text>
        </View>

        <View style={s.rule} />

        <View style={s.field}>
          <Text style={s.prompt}>This week I will</Text>
          <TextInput
            style={s.input}
            placeholder="State it clearly. Make it testable."
            placeholderTextColor={colors.textDim}
            value={goal}
            onChangeText={setGoal}
            multiline
            maxLength={300}
            textAlignVertical="top"
          />
          <Text style={s.count}>{goal.length}/300</Text>
        </View>

        <View style={s.field}>
          <Text style={s.prompt}>My biggest obstacle is</Text>
          <TextInput
            style={s.input}
            placeholder="Name the thing most likely to stop you."
            placeholderTextColor={colors.textDim}
            value={obstacle}
            onChangeText={setObstacle}
            multiline
            maxLength={300}
            textAlignVertical="top"
          />
          <Text style={s.count}>{obstacle.length}/300</Text>
        </View>

        <View style={s.field}>
          <Text style={s.prompt}>Your pier</Text>
          <Choice
            on={mode === 'pair'} onPress={() => setMode('pair')}
            title="Wait for two"
            body="Your two peers talk on the Shore and can agree to send you supplies."
          />
          <Choice
            on={mode === 'solo'} onPress={() => setMode('solo')}
            title="Go with one"
            body="Start as soon as one peer joins. No supplies. Your one peer decides if you made it."
          />
        </View>

        <View style={s.field}>
          <Text style={s.prompt}>How they find you</Text>
          <Choice
            on={listed} onPress={() => setListed(true)}
            title="Open water"
            body="Anyone can find your goal. People open to watch get matched to you."
          />
          <Choice
            on={!listed} onPress={() => setListed(false)}
            title="Invite only"
            body="Share your pier code with the people you want."
          />
        </View>

        {!!error && <Text style={s.error}>{error}</Text>}

        <TouchableOpacity
          style={[s.btn, loading && s.btnDisabled]}
          onPress={submit}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color={colors.bg} />
            : <Text style={s.btnText}>Set it out to sea</Text>}
        </TouchableOpacity>

        <Text style={s.fine}>
          You get a pier code either way.{'\n'}
          Your peers can't step in. They can only stand by you.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 26, paddingTop: 64, gap: 24, paddingBottom: 48 },

  back: { marginBottom: -4 },
  backText: { fontFamily: fonts.regular, color: colors.textMid, fontSize: 14 },

  heading: { gap: 10 },
  title: { fontFamily: fonts.boldItalic, fontSize: 38, color: colors.text, letterSpacing: -0.5 },
  sub: { fontFamily: fonts.light, fontSize: 15, color: colors.textMid, lineHeight: 23 },

  rule: { height: 1, backgroundColor: colors.border },

  field: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    padding: 20,
    gap: 12,
  },
  prompt: {
    fontFamily: fonts.semiBold, fontSize: 11, color: colors.gold,
    textTransform: 'uppercase', letterSpacing: 1,
  },
  input: {
    fontFamily: fonts.regular, fontSize: 17, color: colors.text,
    minHeight: 88, lineHeight: 26,
  },
  count: { fontFamily: fonts.regular, fontSize: 11, color: colors.textDim, textAlign: 'right' },

  choice: {
    flexDirection: 'row', gap: 12, padding: 14, borderRadius: radius.sm,
    borderWidth: 1, borderColor: colors.border,
  },
  choiceOn: { borderColor: colors.goldBorder, backgroundColor: colors.goldBg },
  radio: { width: 16, height: 16, borderRadius: 8, borderWidth: 1.5, borderColor: colors.textDim, marginTop: 2 },
  radioOn: { borderColor: colors.gold, backgroundColor: colors.gold },
  choiceBody: { flex: 1, gap: 3 },
  choiceTitle: { fontFamily: fonts.semiBold, fontSize: 15, color: colors.text },
  choiceTitleOn: { color: colors.gold },
  choiceText: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMid, lineHeight: 19 },

  error: { fontFamily: fonts.regular, fontSize: 13, color: colors.rose },

  btn: {
    backgroundColor: colors.gold,
    borderRadius: radius.md,
    paddingVertical: 18,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { fontFamily: fonts.semiBold, fontSize: 16, color: colors.bg },

  fine: {
    fontFamily: fonts.light, fontSize: 13, color: colors.textDim,
    lineHeight: 20, textAlign: 'center',
  },
});
