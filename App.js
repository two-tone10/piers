import React from 'react';
import { View, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts, InstrumentSans_400Regular, InstrumentSans_600SemiBold } from '@expo-google-fonts/instrument-sans';

import { useUser } from './src/hooks/useUser';
import { colors, fonts } from './src/lib/theme';
import OnboardingScreen from './src/screens/OnboardingScreen';
import ThisWeekScreen from './src/screens/ThisWeekScreen';
import WitnessingScreen from './src/screens/WitnessingScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import SetGoalScreen from './src/screens/SetGoalScreen';
import FriendWeekScreen from './src/screens/FriendWeekScreen';
import EndWeekScreen from './src/screens/EndWeekScreen';
import JoinCodeScreen from './src/screens/JoinCodeScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function TabLabel({ label, focused }) {
  return (
    <Text numberOfLines={1} style={{ fontFamily: focused ? fonts.semiBold : fonts.regular, fontSize: 17, color: colors.ink }}>
      {label}
    </Text>
  );
}

const tab = (label) => ({ tabBarLabel: ({ focused }) => <TabLabel label={label} focused={focused} />, tabBarAccessibilityLabel: label });

function Tabs({ user }) {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarIcon: () => null,
        tabBarIconStyle: { display: 'none' },
        tabBarStyle: { backgroundColor: colors.ground, borderTopWidth: 0, elevation: 0, height: 88 },
        tabBarItemStyle: { justifyContent: 'center' },
        sceneStyle: { backgroundColor: colors.ground },
      }}
    >
      <Tab.Screen name="ThisWeek" options={tab('This week')}>{(p) => <ThisWeekScreen {...p} user={user} />}</Tab.Screen>
      <Tab.Screen name="Witnessing" options={tab('Witnessing')}>{(p) => <WitnessingScreen {...p} user={user} />}</Tab.Screen>
      <Tab.Screen name="History" options={tab('History')}>{(p) => <HistoryScreen {...p} user={user} />}</Tab.Screen>
    </Tab.Navigator>
  );
}

export default function App() {
  const { user, loading, createUser } = useUser();
  const [fontsLoaded] = useFonts({ InstrumentSans_400Regular, InstrumentSans_600SemiBold });

  let body;
  if (!fontsLoaded || loading) body = <View style={{ flex: 1, backgroundColor: colors.ground }} />;
  else if (!user) body = <OnboardingScreen onCreated={createUser} />;
  else {
    body = (
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.ground } }}>
          <Stack.Screen name="Tabs">{(p) => <Tabs {...p} user={user} />}</Stack.Screen>
          <Stack.Screen name="SetGoal" component={SetGoalScreen} />
          <Stack.Screen name="FriendWeek">{(p) => <FriendWeekScreen {...p} user={user} />}</Stack.Screen>
          <Stack.Screen name="EndWeek" component={EndWeekScreen} />
          <Stack.Screen name="JoinCode" component={JoinCodeScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {body}
    </SafeAreaProvider>
  );
}
