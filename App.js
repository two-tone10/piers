import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { Text } from 'react-native';

import { useUser } from './src/hooks/useUser';
import { colors } from './src/lib/theme';

import OnboardingScreen from './src/screens/OnboardingScreen';
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

const stackOptions = {
  headerShown: false,
  contentStyle: { backgroundColor: colors.bg },
  animation: 'slide_from_right',
};

const tabBarStyle = {
  backgroundColor: colors.bgCard,
  borderTopColor: colors.border,
  borderTopWidth: 1,
  paddingBottom: 8,
  paddingTop: 8,
  height: 64,
};

function TabIcon({ label, focused }) {
  const icons = { Home: '⛵', Harbor: '⚓', Logbook: '📖' };
  return (
    <Text style={{ fontSize: focused ? 22 : 18, opacity: focused ? 1 : 0.45 }}>
      {icons[label]}
    </Text>
  );
}

function Tabs({ user }) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle,
        tabBarLabel: () => null,
        tabBarIcon: ({ focused }) => <TabIcon label={route.name} focused={focused} />,
      })}
    >
      <Tab.Screen name="Home">
        {(props) => <HomeScreen {...props} user={user} />}
      </Tab.Screen>
      <Tab.Screen name="Harbor" component={HarborScreen} />
      <Tab.Screen name="Logbook">
        {(props) => <LogbookScreen {...props} user={user} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

export default function App() {
  const { user, loading, createUser } = useUser();

  if (loading) return null;

  if (!user) {
    return (
      <>
        <StatusBar style="light" />
        <OnboardingScreen onCreated={createUser} />
      </>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <NavigationContainer>
        <Stack.Navigator screenOptions={stackOptions}>
          <Stack.Screen name="Tabs">
            {(props) => <Tabs {...props} user={user} />}
          </Stack.Screen>
          <Stack.Screen name="CastOff">
            {(props) => <CastOffScreen {...props} user={user} />}
          </Stack.Screen>
          <Stack.Screen name="MyVoyage" component={MyVoyageScreen} />
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
    </>
  );
}
