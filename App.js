import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
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
import { colors, fonts } from './src/lib/theme';

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

const stackOptions = {
  headerShown: false,
  contentStyle: { backgroundColor: colors.bg },
  animation: 'slide_from_right',
};

function Tabs({ user }) {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.bgCard,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 64,
        },
        tabBarShowLabel: true,
        tabBarIconStyle: { display: 'none' },
        tabBarLabelStyle: {
          fontSize: 13,
          letterSpacing: 0.3,
          marginBottom: 12,
          marginTop: 12,
        },
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: colors.textDim,
        tabBarLabelPosition: 'below-icon',
      }}
    >
      <Tab.Screen
        name="Home"
        options={{ tabBarLabel: 'Home' }}
      >
        {(props) => <HomeScreen {...props} user={user} />}
      </Tab.Screen>

      <Tab.Screen
        name="Together"
        component={HarborScreen}
        options={{ tabBarLabel: 'Together' }}
      />

      <Tab.Screen
        name="Record"
        options={{ tabBarLabel: 'Record' }}
      >
        {(props) => <LogbookScreen {...props} user={user} />}
      </Tab.Screen>
    </Tab.Navigator>
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
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

  if (!user) {
    return (
      <>
        <StatusBar style="light" />
        <OnboardingFlow onCreated={createUser} />
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
    </>
  );
}
