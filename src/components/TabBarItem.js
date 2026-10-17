import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Line } from 'react-native-svg';
import { colors, radius, fonts } from '../lib/theme';

function AnchorIcon({ color }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="5.5" r="2.5" stroke={color} strokeWidth={1.7} />
      <Line x1="12" y1="8" x2="12" y2="19" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
      <Line x1="8" y1="11" x2="16" y2="11" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
      <Path d="M5,14 C5,18.5 8,20.5 11.5,20.9" stroke={color} strokeWidth={1.7} strokeLinecap="round" fill="none" />
      <Path d="M19,14 C19,18.5 16,20.5 12.5,20.9" stroke={color} strokeWidth={1.7} strokeLinecap="round" fill="none" />
    </Svg>
  );
}

function TogetherIcon({ color }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Circle cx="9.2" cy="12" r="5.6" stroke={color} strokeWidth={1.6} />
      <Circle cx="14.8" cy="12" r="5.6" stroke={color} strokeWidth={1.6} />
    </Svg>
  );
}

function RecordIcon({ color }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12,6 C9.5,4.7 6,4.7 3.5,5.6 L3.5,17.6 C6,16.7 9.5,16.7 12,18"
        stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" fill="none"
      />
      <Path
        d="M12,6 C14.5,4.7 18,4.7 20.5,5.6 L20.5,17.6 C18,16.7 14.5,16.7 12,18"
        stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" fill="none"
      />
      <Line x1="12" y1="6" x2="12" y2="18" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}

const ICONS = { home: AnchorIcon, together: TogetherIcon, record: RecordIcon };

export default function TabBarItem({ name, label, focused }) {
  const Icon = ICONS[name];
  const color = focused ? colors.gold : colors.textDim;
  return (
    <View style={[s.wrap, focused && s.wrapActive]}>
      <Icon color={color} />
      <Text style={[s.label, { color }, focused && s.labelActive]}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    alignItems: 'center', justifyContent: 'center', gap: 3,
    paddingVertical: 7, paddingHorizontal: 16,
    borderRadius: radius.lg,
  },
  wrapActive: { backgroundColor: colors.goldBg },
  label: { fontFamily: fonts.regular, fontSize: 10, letterSpacing: 0.3 },
  labelActive: { fontFamily: fonts.semiBold },
});
