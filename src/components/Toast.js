import React, { useEffect, useRef, useState } from 'react';
import { Animated, Text, StyleSheet } from 'react-native';
import { colors, radius, fonts } from '../lib/theme';

let showFn = null;

export function showToast(message) {
  if (showFn) showFn(message);
}

export default function ToastHost() {
  const [message, setMessage] = useState(null);
  const anim = useRef(new Animated.Value(0)).current;
  const hideTimer = useRef(null);

  useEffect(() => {
    showFn = (msg) => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      setMessage(msg);
      anim.setValue(0);
      Animated.spring(anim, { toValue: 1, useNativeDriver: true, speed: 18, bounciness: 6 }).start();
      hideTimer.current = setTimeout(() => {
        Animated.timing(anim, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => setMessage(null));
      }, 2200);
    };
    return () => { showFn = null; if (hideTimer.current) clearTimeout(hideTimer.current); };
  }, []);

  if (!message) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        st.wrap,
        {
          opacity: anim,
          transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
        },
      ]}
    >
      <Text style={st.text}>{message}</Text>
    </Animated.View>
  );
}

const st = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 32, right: 32, bottom: 128,
    backgroundColor: colors.text,
    borderRadius: radius.md,
    paddingVertical: 14, paddingHorizontal: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22, shadowRadius: 14, elevation: 6,
    zIndex: 999,
  },
  text: {
    fontFamily: fonts.regular, fontSize: 14, color: colors.bg,
    textAlign: 'center', lineHeight: 20,
  },
});
