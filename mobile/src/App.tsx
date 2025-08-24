import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar, LogBox } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Screens
import DashboardScreen from './screens/DashboardScreen';
import TripsScreen from './screens/TripsScreen';
import CoachingScreen from './screens/CoachingScreen';
import SettingsScreen from './screens/SettingsScreen';
import OBDConnectionScreen from './screens/OBDConnectionScreen';

// Services
import OBDService from './services/OBDService';
import AIService from './services/AIService';
import LocationService from './services/LocationService';

// Context
import { AppProvider } from './context/AppContext';

// Ignore specific warnings
LogBox.ignoreLogs(['Require cycle:']);

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#4CAF50',
        tabBarInactiveTintColor: '#666',
        headerStyle: { backgroundColor: '#2C3E50' },
        headerTintColor: '#fff',
      }}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardScreen}
        options={{ title: 'Drive' }}
      />
      <Tab.Screen 
        name="Trips" 
        component={TripsScreen}
        options={{ title: 'History' }}
      />
      <Tab.Screen 
        name="Coaching" 
        component={CoachingScreen}
        options={{ title: 'Coach' }}
      />
      <Tab.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Initialize services
      await OBDService.initialize();
      await AIService.initialize();
      await LocationService.initialize();
      
      setIsInitialized(true);
    } catch (error) {
      console.error('Failed to initialize app:', error);
      setIsInitialized(true); // Continue anyway
    }
  };

  if (!isInitialized) {
    return null; // Or a loading screen
  }

  return (
    <SafeAreaProvider>
      <AppProvider>
        <NavigationContainer>
          <StatusBar barStyle="light-content" backgroundColor="#2C3E50" />
          <Stack.Navigator
            screenOptions={{
              headerStyle: { backgroundColor: '#2C3E50' },
              headerTintColor: '#fff',
            }}
          >
            <Stack.Screen 
              name="OBDConnection" 
              component={OBDConnectionScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="Main" 
              component={MainTabs}
              options={{ headerShown: false }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </AppProvider>
    </SafeAreaProvider>
  );
}
