import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';

import { useUser } from './src/hooks/useUser';
import { colors } from './src/lib/theme';

import OnboardingScreen from './src/screens/OnboardingScreen';
import HomeScreen from './src/screens/HomeScreen';
import CastOffScreen from './src/screens/CastOffScreen';
import MyVoyageScreen from './src/screens/MyVoyageScreen';
import JoinPierScreen from './src/screens/JoinPierScreen';
import PierWatchScreen from './src/screens/PierWatchScreen';

const Stack = createNativeStackNavigator();

const screenOptions = {
  headerShown: false,
  contentStyle: { backgroundColor: colors.bg },
  animation: 'slide_from_right',
};

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
        <Stack.Navigator screenOptions={screenOptions}>
          <Stack.Screen name="Home">
            {(props) => <HomeScreen {...props} user={user} />}
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
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}
