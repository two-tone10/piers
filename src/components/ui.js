import React from 'react';
import { View, Text, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { colors, type, radius, border } from '../lib/theme';

export function Screen({ children, footer }) {
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.ground }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 28, paddingTop: 72, paddingBottom: footer ? 32 : 40, gap: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
      {footer ? <View style={{ paddingHorizontal: 28, paddingBottom: 40, gap: 12 }}>{footer}</View> : null}
    </KeyboardAvoidingView>
  );
}

export const Group = ({ children, gap = 12 }) => <View style={{ gap }}>{children}</View>;
export const Row = ({ children }) => <View style={{ flexDirection: 'row', gap: 12 }}>{children}</View>;

export const Title = ({ children }) => <Text style={type.title}>{children}</Text>;
export const Count = ({ children }) => <Text style={type.count}>{children}</Text>;
export const Body = ({ children, color, bold, onLongPress }) => (
  <Text onLongPress={onLongPress} style={[type.body, color && { color }, bold && { fontFamily: type.button.fontFamily }]}>{children}</Text>
);

function Button({ label, onPress, primary, busy, flex }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={busy ? undefined : onPress}
      style={({ pressed }) => ({
        flex: flex ? 1 : undefined,
        minHeight: primary ? 60 : 56,
        borderRadius: radius,
        borderWidth: border,
        borderColor: colors.ink,
        backgroundColor: primary ? colors.ink : 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      {busy
        ? <ActivityIndicator color={primary ? colors.onInk : colors.ink} />
        : <Text style={[type.button, { color: primary ? colors.onInk : colors.ink, textAlign: 'center' }]}>{label}</Text>}
    </Pressable>
  );
}

export const PrimaryButton = (props) => <Button {...props} primary />;
export const SecondaryButton = (props) => <Button {...props} />;

export function Choice({ label, options, value, onChange }) {
  return (
    <Group>
      {label ? <Body>{label}</Body> : null}
      {options.map((o) => (
        <Button key={o.value} label={o.label} primary={o.value === value} onPress={() => onChange(o.value)} />
      ))}
    </Group>
  );
}

export function Field({ label, labelColor, ...props }) {
  return (
    <Group gap={8}>
      <Body color={labelColor}>{label}</Body>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.ink}
        style={[type.body, {
          minHeight: 56, backgroundColor: colors.field, borderWidth: border, borderColor: labelColor || colors.ink,
          borderRadius: radius, paddingHorizontal: 16, paddingVertical: 14,
        }]}
        {...props}
      />
    </Group>
  );
}

export function Back({ navigation }) {
  return (
    <Pressable accessibilityRole="button" onPress={() => navigation.goBack()} style={{ minHeight: 56, justifyContent: 'center', alignSelf: 'flex-start', marginTop: -40 }}>
      <Body>Back</Body>
    </Pressable>
  );
}

export function ListItem({ children, onPress }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => ({ minHeight: 56, justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}>
      <Body>{children}</Body>
    </Pressable>
  );
}
