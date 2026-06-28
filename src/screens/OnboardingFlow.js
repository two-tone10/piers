import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Dimensions, ScrollView, KeyboardAvoidingView, Platform,
  ActivityIndicator, Animated,
} from 'react-native';
import { colors, radius, fonts } from '../lib/theme';
import PierIllustration from '../components/PierIllustration';

const { width: W, height: H } = Dimensions.get('window');

// ── Shared primitives ─────────────────────────────────────────────────────────

function Divider() {
  return <View style={s.divider} />;
}

function Dot({ active }) {
  return <View style={[s.dot, active && s.dotActive]} />;
}

function Dots({ total, current }) {
  return (
    <View style={s.dots}>
      {Array.from({ length: total }).map((_, i) => <Dot key={i} active={i === current} />)}
    </View>
  );
}

// ── Step 0: Splash ────────────────────────────────────────────────────────────

function SplashStep({ onNext }) {
  return (
    <TouchableOpacity style={s.splash} activeOpacity={0.9} onPress={onNext}>
      <View style={s.illustrationWrap}>
        <PierIllustration width={W * 0.9} height={H * 0.52} />
      </View>
      <View style={s.splashBottom}>
        <Text style={s.splashWordmark}>piers</Text>
        <Text style={s.splashHint}>tap to continue</Text>
      </View>
    </TouchableOpacity>
  );
}

// ── Step 1: Definition — pier ─────────────────────────────────────────────────

function PierDefinition({ onNext }) {
  return (
    <ScrollView contentContainerStyle={s.defPage} showsVerticalScrollIndicator={false}>
      <Text style={s.defWord}>pier</Text>
      <View style={s.defMeta}>
        <Text style={s.defPhonetic}>/pir/</Text>
        <Text style={s.defPos}>  •  noun</Text>
      </View>
      <Divider />
      <View style={s.defBody}>
        <Text style={s.defNum}>1.</Text>
        <Text style={s.defText}>
          A structure extending from land out over water, used as a landing place for boats, or as a place from which to watch the open water.
        </Text>
      </View>
      <View style={s.defBody}>
        <Text style={s.defNum}>2.</Text>
        <Text style={s.defText}>
          A fixed point of support from which something greater extends into the unknown.
        </Text>
      </View>
      <Divider />
      <View style={s.etymBox}>
        <Text style={s.etymLabel}>ORIGIN</Text>
        <Text style={s.etymText}>
          Middle English <Text style={s.italic}>pere</Text>, from Anglo-French, from Medieval Latin <Text style={s.italic}>pera</Text>. First known use: 13th century.
        </Text>
      </View>
      <TouchableOpacity style={s.nextBtn} onPress={onNext}>
        <Text style={s.nextBtnText}>Continue →</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ── Step 2: Definition — peers ────────────────────────────────────────────────

function PeersDefinition({ onNext }) {
  return (
    <ScrollView contentContainerStyle={s.defPage} showsVerticalScrollIndicator={false}>
      <Text style={s.defWord}>peers</Text>
      <View style={s.defMeta}>
        <Text style={s.defPhonetic}>/pirz/</Text>
        <Text style={s.defPos}>  •  noun, plural</Text>
      </View>
      <Divider />
      <View style={s.defBody}>
        <Text style={s.defNum}>1.</Text>
        <Text style={s.defText}>
          Those who are of equal standing; companions of the same condition or circumstance.
        </Text>
      </View>
      <View style={s.defBody}>
        <Text style={s.defNum}>2.</Text>
        <Text style={s.defText}>
          People who belong to the same group — not by rank or title, but by <Text style={s.italic}>showing up</Text>.
        </Text>
      </View>
      <Divider />
      <View style={s.etymBox}>
        <Text style={s.etymLabel}>ORIGIN</Text>
        <Text style={s.etymText}>
          Middle English <Text style={s.italic}>per</Text>, from Anglo-French <Text style={s.italic}>per</Text>, from Latin <Text style={s.italic}>par</Text> — equal. First known use: 13th century.
        </Text>
      </View>
      <View style={s.pullQuote}>
        <Text style={s.pullQuoteText}>
          "In the oldest sense of the word, a peer is simply someone who <Text style={s.italic}>shows up.</Text>"
        </Text>
      </View>
      <TouchableOpacity style={s.nextBtn} onPress={onNext}>
        <Text style={s.nextBtnText}>Continue →</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ── Step 3: What this is ──────────────────────────────────────────────────────

function WhatStep({ onNext }) {
  return (
    <ScrollView contentContainerStyle={s.copyPage} showsVerticalScrollIndicator={false}>
      <Text style={s.copyTitle}>A goal needs{'\n'}witnesses.</Text>
      <Text style={s.copyBody}>
        Most goals die quietly. You tell yourself, you forget yourself. Nothing holds.
      </Text>
      <Text style={s.copyBody}>
        <Text style={s.italic}>Piers</Text> works differently. You set one precise goal for the week. You name the obstacle most likely to stop you.
      </Text>
      <Text style={s.copyBody}>
        Then two people find it. They become your pier — a fixed point watching from the shore while you go out and do the thing.
      </Text>
      <Text style={s.copyBody}>
        They can't coach you. They can't check in. They can only send words of support — and be there when you return.
      </Text>
      <TouchableOpacity style={s.nextBtn} onPress={onNext}>
        <Text style={s.nextBtnText}>Continue →</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ── Step 4: How it works ──────────────────────────────────────────────────────

function HowStep({ onNext }) {
  const steps = [
    { num: '01', title: 'Set a precise goal', body: 'One goal. One week. Name the thing you\'re most likely to use as an excuse not to do it.' },
    { num: '02', title: 'Two people find you', body: 'Your goal appears to others who are also out here. Two of them choose to stand on your pier.' },
    { num: '03', title: 'They hold the shore', body: 'Your pier can\'t intervene. They can send words of support during the week. That\'s it.' },
    { num: '04', title: 'You return — or you don\'t', body: 'When the week ends, you reckon with what happened. Your pier is there for that too.' },
  ];

  return (
    <ScrollView contentContainerStyle={s.copyPage} showsVerticalScrollIndicator={false}>
      <Text style={s.copyTitle}>How it works.</Text>
      {steps.map((step) => (
        <View key={step.num} style={s.stepRow}>
          <Text style={s.stepNum}>{step.num}</Text>
          <View style={s.stepRight}>
            <Text style={s.stepTitle}>{step.title}</Text>
            <Text style={s.stepBody}>{step.body}</Text>
          </View>
        </View>
      ))}
      <TouchableOpacity style={[s.nextBtn, s.nextBtnGold]} onPress={onNext}>
        <Text style={[s.nextBtnText, s.nextBtnGoldText]}>I'm ready →</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ── Step 5: Handle ────────────────────────────────────────────────────────────

function HandleStep({ onCreated }) {
  const [handle, setHandle] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    const trimmed = handle.trim();
    if (!trimmed) return setError('Choose a name before stepping onto the dock.');
    setError('');
    setLoading(true);
    try {
      await onCreated(trimmed);
    } catch (e) {
      setError(e.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={s.copyPage} keyboardShouldPersistTaps="handled">
        <Text style={s.copyTitle}>One last thing.</Text>
        <Text style={s.copyBody}>
          What should others see when you set a goal? No real names required.
        </Text>
        <View style={s.inputCard}>
          <Text style={s.inputLabel}>Your handle</Text>
          <TextInput
            style={s.inputField}
            placeholder="something that feels like you"
            placeholderTextColor={colors.textDim}
            value={handle}
            onChangeText={setHandle}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={40}
            returnKeyType="done"
            onSubmitEditing={submit}
          />
          {!!error && <Text style={s.errorText}>{error}</Text>}
        </View>
        <Text style={s.fine}>
          No account. No password. Stored only on this device.
        </Text>
        <TouchableOpacity
          style={[s.nextBtn, s.nextBtnGold, loading && s.btnDisabled]}
          onPress={submit}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color={colors.bg} />
            : <Text style={[s.nextBtnText, s.nextBtnGoldText]}>Step onto the dock →</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── Main flow ─────────────────────────────────────────────────────────────────

const STEPS = ['splash', 'pier', 'peers', 'what', 'how', 'handle'];

export default function OnboardingFlow({ onCreated }) {
  const [step, setStep] = useState(0);
  const next = () => setStep((s) => s + 1);
  const showDots = step > 0 && step < STEPS.length - 1;

  const renderStep = () => {
    switch (STEPS[step]) {
      case 'splash': return <SplashStep onNext={next} />;
      case 'pier': return <PierDefinition onNext={next} />;
      case 'peers': return <PeersDefinition onNext={next} />;
      case 'what': return <WhatStep onNext={next} />;
      case 'how': return <HowStep onNext={next} />;
      case 'handle': return <HandleStep onCreated={onCreated} />;
      default: return null;
    }
  };

  return (
    <View style={s.container}>
      {renderStep()}
      {showDots && (
        <View style={s.dotsWrap}>
          <Dots total={STEPS.length - 2} current={step - 1} />
        </View>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  // Splash
  splash: { flex: 1, alignItems: 'center', justifyContent: 'space-between', paddingTop: 60, paddingBottom: 50 },
  illustrationWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  splashBottom: { alignItems: 'center', gap: 12 },
  splashWordmark: { fontFamily: fonts.bold, fontSize: 48, color: colors.gold, letterSpacing: 4 },
  splashHint: { fontFamily: fonts.light, fontSize: 12, color: colors.textDim, letterSpacing: 1.5, textTransform: 'uppercase' },

  // Definition pages
  defPage: { padding: 32, paddingTop: 72, paddingBottom: 60, gap: 20 },
  defWord: { fontFamily: fonts.bold, fontSize: 44, color: colors.text, letterSpacing: -0.5 },
  defMeta: { flexDirection: 'row', alignItems: 'center' },
  defPhonetic: { fontFamily: fonts.italic, fontSize: 18, color: colors.textMid },
  defPos: { fontFamily: fonts.regular, fontSize: 14, color: colors.textDim },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 4 },
  defBody: { flexDirection: 'row', gap: 12 },
  defNum: { fontFamily: fonts.regular, fontSize: 14, color: colors.textDim, marginTop: 2, width: 16 },
  defText: { fontFamily: fonts.regular, fontSize: 17, color: colors.text, lineHeight: 26, flex: 1 },
  etymBox: { backgroundColor: colors.bgCard, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 6 },
  etymLabel: { fontFamily: fonts.semiBold, fontSize: 10, color: colors.textDim, letterSpacing: 1.5, textTransform: 'uppercase' },
  etymText: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMid, lineHeight: 20 },
  pullQuote: { borderLeftWidth: 2, borderLeftColor: colors.goldBorder, paddingLeft: 16, marginTop: 8 },
  pullQuoteText: { fontFamily: fonts.regular, fontSize: 16, color: colors.textMid, lineHeight: 24 },

  // Copy pages
  copyPage: { padding: 32, paddingTop: 72, paddingBottom: 60, gap: 22 },
  copyTitle: { fontFamily: fonts.bold, fontSize: 36, color: colors.text, letterSpacing: -0.5, lineHeight: 44 },
  copyBody: { fontFamily: fonts.regular, fontSize: 17, color: colors.textMid, lineHeight: 27 },

  // How it works steps
  stepRow: { flexDirection: 'row', gap: 20, alignItems: 'flex-start' },
  stepNum: { fontFamily: fonts.boldItalic, fontSize: 13, color: colors.gold, width: 26, marginTop: 2 },
  stepRight: { flex: 1, gap: 4 },
  stepTitle: { fontFamily: fonts.semiBold, fontSize: 16, color: colors.text },
  stepBody: { fontFamily: fonts.regular, fontSize: 14, color: colors.textMid, lineHeight: 22 },

  // Handle step
  inputCard: { backgroundColor: colors.bgCard, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: 20, gap: 10 },
  inputLabel: { fontFamily: fonts.semiBold, fontSize: 11, color: colors.textMid, textTransform: 'uppercase', letterSpacing: 1 },
  inputField: { fontFamily: fonts.regular, fontSize: 20, color: colors.text, borderBottomWidth: 1, borderBottomColor: colors.borderStrong, paddingVertical: 8 },
  errorText: { fontFamily: fonts.regular, fontSize: 13, color: colors.rose },
  fine: { fontFamily: fonts.regular, fontSize: 12, color: colors.textDim, textAlign: 'center', lineHeight: 18 },

  // Shared
  italic: { fontFamily: fonts.italic },
  nextBtn: { borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radius.md, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  nextBtnGold: { backgroundColor: colors.gold, borderColor: colors.gold },
  nextBtnText: { fontFamily: fonts.semiBold, fontSize: 16, color: colors.textMid },
  nextBtnGoldText: { color: colors.bg },
  btnDisabled: { opacity: 0.5 },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.textDim },
  dotActive: { backgroundColor: colors.gold, width: 20 },
  dotsWrap: { paddingBottom: 32, alignItems: 'center' },
});
