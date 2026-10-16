import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { colors, radius, fonts } from '../lib/theme';
import { reckon } from '../lib/supabase';

export default function ReckoningScreen({ route, navigation }) {
  const { voyage } = route.params;
  const returned = voyage.status === 'returned';
  const [reckoning, setReckoning] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    try {
      await reckon(voyage.id, reckoning.trim());
      navigation.goBack();
    } catch (e) {
      console.error(e);
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

        <View style={s.heading}>
          <Text style={s.title}>
            {returned ? 'You made it back.' : 'The week expired.'}
          </Text>
          <Text style={s.sub}>
            {returned
              ? 'Before this voyage closes, write your reckoning. What happened out there?'
              : 'The week is up. Write what you know now that you didn\'t when you cast off.'}
          </Text>
        </View>

        <View style={s.rule} />

        <View style={[s.referenceCard, s.referenceGold]}>
          <Text style={s.referenceLabel}>Your goal was</Text>
          <Text style={s.referenceText}>{voyage.goal}</Text>
        </View>

        <View style={s.referenceCard}>
          <Text style={s.referenceLabel}>You named this obstacle</Text>
          <Text style={s.referenceTextDim}>{voyage.obstacle}</Text>
        </View>

        <View style={s.rule} />

        <View style={s.inputCard}>
          <Text style={s.inputLabel}>Your reckoning</Text>
          <TextInput
            style={s.input}
            placeholder={returned
              ? 'What happened? Was the obstacle what you thought it would be?'
              : 'What got in the way? What do you know now?'}
            placeholderTextColor={colors.textDim}
            value={reckoning}
            onChangeText={setReckoning}
            multiline
            maxLength={400}
            textAlignVertical="top"
            autoFocus
          />
          <Text style={s.count}>{reckoning.length}/400</Text>
        </View>

        <TouchableOpacity
          style={[s.btn, loading && s.btnDisabled]}
          onPress={submit}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color={colors.bg} />
            : <Text style={s.btnText}>
                {returned ? 'Archive the voyage' : 'Close the logbook'}
              </Text>}
        </TouchableOpacity>

        <TouchableOpacity style={s.skip} onPress={() => navigation.goBack()}>
          <Text style={s.skipText}>Skip reckoning</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 26, paddingTop: 64, gap: 22, paddingBottom: 48 },

  heading: { gap: 10 },
  title: { fontFamily: fonts.boldItalic, fontSize: 34, color: colors.text, letterSpacing: -0.5 },
  sub: { fontFamily: fonts.light, fontSize: 15, color: colors.textMid, lineHeight: 23 },

  rule: { height: 1, backgroundColor: colors.border },

  referenceCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.borderStrong,
    padding: 18, gap: 8,
  },
  referenceGold: { borderColor: colors.goldBorder, backgroundColor: colors.goldBg },
  referenceLabel: {
    fontFamily: fonts.semiBold, fontSize: 10, color: colors.textDim,
    textTransform: 'uppercase', letterSpacing: 0.9,
  },
  referenceText: { fontFamily: fonts.regular, fontSize: 17, color: colors.text, lineHeight: 25 },
  referenceTextDim: { fontFamily: fonts.regular, fontSize: 14, color: colors.textMid, lineHeight: 22 },

  inputCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.borderStrong,
    padding: 20, gap: 12,
  },
  inputLabel: {
    fontFamily: fonts.semiBold, fontSize: 11, color: colors.gold,
    textTransform: 'uppercase', letterSpacing: 1,
  },
  input: {
    fontFamily: fonts.regular, fontSize: 16, color: colors.text,
    minHeight: 110, lineHeight: 25,
  },
  count: { fontFamily: fonts.regular, fontSize: 11, color: colors.textDim, textAlign: 'right' },

  btn: {
    backgroundColor: colors.gold, borderRadius: radius.md,
    paddingVertical: 18, alignItems: 'center',
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { fontFamily: fonts.semiBold, fontSize: 16, color: colors.bg },

  skip: { alignItems: 'center', paddingVertical: 4 },
  skipText: { fontFamily: fonts.regular, fontSize: 13, color: colors.textDim },
});
