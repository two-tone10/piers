import React from 'react';
import { View, Text, ActivityIndicator, Dimensions } from 'react-native';
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
import PierIllustration from './src/components/PierIllustration';

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

function TabLabel({ label, focused }) {
  return (
    <Text style={{
      fontFamily: focused ? fonts.semiBold : fonts.regular,
      fontSize: 12,
      color: focused ? colors.gold : colors.textDim,
      letterSpacing: 0.4,
      textAlign: 'center',
      marginTop: 2,
    }}>
      {label}
    </Text>
  );
}

function Tabs({ user }) {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.bgCard,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 62,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabel: () => null,
      }}
    >
      <Tab.Screen
        name="Home"
        options={{ tabBarIcon: ({ focused }) => <TabLabel label="Home" focused={focused} /> }}
      >
        {(props) => <HomeScreen {...props} user={user} />}
      </Tab.Screen>

      <Tab.Screen
        name="Together"
        component={HarborScreen}
        options={{ tabBarIcon: ({ focused }) => <TabLabel label="Together" focused={focused} /> }}
      />

      <Tab.Screen
        name="Record"
        options={{ tabBarIcon: ({ focused }) => <TabLabel label="Record" focused={focused} /> }}
      >
        {(props) => <LogbookScreen {...props} user={user} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

function SplashScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
      <PierIllustration width={W} height={W * 1.1} />
      <View style={{ position: 'absolute', bottom: 70, alignItems: 'center', gap: 6 }}>
        <Text style={{
          fontSize: 38,
          fontWeight: '300',
          color: colors.gold,
          letterSpacing: 12,
        }}>
          piers
        </Text>
        <ActivityIndicator color={colors.gold} style={{ opacity: 0.4 }} />
      </View>
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
      <>
        <StatusBar style="light" />
        <SplashScreen />
      </>
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
