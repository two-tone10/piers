import React, { useEffect, useRef } from 'react';
import { View, Text, Image, ActivityIndicator, Dimensions, Animated } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import ToastHost from './src/components/Toast';

const SPLASH_IMAGE = require('./assets/splash-pier.png');
import {
  useFonts,
  Raleway_300Light,
  Raleway_400Regular,
  Raleway_400Regular_Italic,
  Raleway_600SemiBold,
  Raleway_700Bold,
  Raleway_700Bold_Italic,
} from '@expo-google-fonts/raleway';

import { useUser } from './src/hooks/useUser';
import { colors, fonts, radius } from './src/lib/theme';
import TabBarItem from './src/components/TabBarItem';

import OnboardingFlow from './src/screens/OnboardingFlow';
import HomeScreen from './src/screens/HomeScreen';
import HarborScreen from './src/screens/HarborScreen';
import LogbookScreen from './src/screens/LogbookScreen';
import CastOffScreen from './src/screens/CastOffScreen';
import MyVoyageScreen from './src/screens/MyVoyageScreen';
import JoinPierScreen from './src/screens/JoinPierScreen';
import PierWatchScreen from './src/screens/PierWatchScreen';
import ReckoningScreen from './src/screens/ReckoningScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const { width: W } = Dimensions.get('window');

const stackOptions = {
  headerShown: false,
  contentStyle: { backgroundColor: colors.bg },
  animation: 'slide_from_right',
};

function Tabs({ user }) {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          position: 'absolute',
          left: 20, right: 20,
          bottom: Math.max(insets.bottom, 12) + 6,
          height: 68,
          borderRadius: radius.lg + 6,
          backgroundColor: colors.bgCard,
          borderWidth: 1, borderColor: colors.borderStrong,
          borderTopWidth: 1,
          shadowColor: '#1a1714', shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.14, shadowRadius: 20, elevation: 8,
          paddingHorizontal: 8,
        },
        tabBarItemStyle: { paddingVertical: 4 },
      }}
    >
      <Tab.Screen
        name="Home"
        options={{ tabBarIcon: ({ focused }) => <TabBarItem name="home" label="Home" focused={focused} /> }}
      >
        {(props) => <HomeScreen {...props} user={user} />}
      </Tab.Screen>

      <Tab.Screen
        name="Together"
        component={HarborScreen}
        options={{ tabBarIcon: ({ focused }) => <TabBarItem name="together" label="Together" focused={focused} /> }}
      />

      <Tab.Screen
        name="Record"
        options={{ tabBarIcon: ({ focused }) => <TabBarItem name="record" label="Record" focused={focused} /> }}
      >
        {(props) => <LogbookScreen {...props} user={user} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

function SplashScreen() {
  const fade = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 700, delay: 150, useNativeDriver: true }),
      Animated.timing(rise, { toValue: 0, duration: 700, delay: 150, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
      <Image
        source={SPLASH_IMAGE}
        style={{ width: W, height: W * 1.05 }}
        resizeMode="contain"
      />
      <Animated.View style={{
        position: 'absolute', bottom: 70, alignItems: 'center', gap: 10,
        opacity: fade, transform: [{ translateY: rise }],
      }}>
        <Text style={{
          fontFamily: fonts.bold,
          fontSize: 36,
          color: colors.text,
          letterSpacing: 10,
        }}>
          piers
        </Text>
        <ActivityIndicator color={colors.textDim} style={{ opacity: 0.5 }} />
      </Animated.View>
    </View>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Raleway_300Light,
    Raleway_400Regular,
    Raleway_400Regular_Italic,
    Raleway_600SemiBold,
    Raleway_700Bold,
    Raleway_700Bold_Italic,
  });

  const { user, loading, createUser } = useUser();

  if (!fontsLoaded || loading) {
    return (
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <SplashScreen />
      </SafeAreaProvider>
    );
  }

  if (!user) {
    return (
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <OnboardingFlow onCreated={createUser} />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <NavigationContainer>
        <Stack.Navigator screenOptions={stackOptions}>
          <Stack.Screen name="Tabs">
            {(props) => <Tabs {...props} user={user} />}
          </Stack.Screen>
          <Stack.Screen name="CastOff">
            {(props) => <CastOffScreen {...props} user={user} />}
          </Stack.Screen>
          <Stack.Screen name="MyVoyage">
            {(props) => <MyVoyageScreen {...props} user={user} />}
          </Stack.Screen>
          <Stack.Screen name="JoinPier">
            {(props) => <JoinPierScreen {...props} user={user} />}
          </Stack.Screen>
          <Stack.Screen name="PierWatch">
            {(props) => <PierWatchScreen {...props} user={user} />}
          </Stack.Screen>
          <Stack.Screen
            name="Reckoning"
            component={ReckoningScreen}
            options={{ animation: 'slide_from_bottom' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
      <ToastHost />
    </SafeAreaProvider>
  );
}
