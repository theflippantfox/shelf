/**
 * Shelf POS — React Native App
 *
 * Entry point. Wraps the app in ThemeProvider + SafeAreaProvider
 * and renders auth flow or main app depending on login state.
 */

import React from 'react';
import {StatusBar, View, ActivityIndicator, StyleSheet} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {ThemeProvider, useTheme} from './src/components/ThemeProvider';
import {AuthProvider, useAuth} from './src/components/AuthProvider';
import {BottomTabNavigator} from './src/navigation/BottomTabNavigator';

// Auth screens
import LoginScreen from './src/screens/auth/LoginScreen';
import RegisterScreen from './src/screens/auth/RegisterScreen';
import ShopSelectScreen from './src/screens/auth/ShopSelectScreen';

// Sub-screens (pushed over tabs)
import {CustomersScreen} from './src/screens/CustomersScreen';
import {CashRegisterScreen} from './src/screens/CashRegisterScreen';

const AuthStack = createNativeStackNavigator();
const MainStack = createNativeStackNavigator();

function AuthNavigator() {
  return (
    <AuthStack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

function AppContent() {
  const {tokens} = useTheme();
  const {loading, user, shop, needsShopSelect} = useAuth();

  // Show loading spinner while checking auth state
  if (loading) {
    return (
      <View style={loadingStyles.center}>
        <ActivityIndicator size="large" color={tokens.navAccent} />
      </View>
    );
  }

  // Not logged in → auth flow
  if (!user) {
    return <AuthNavigator />;
  }

  // Logged in but needs shop selection
  if (needsShopSelect || !shop) {
    return <ShopSelectScreen />;
  }

  // Logged in with shop selected → main app
  return (
    <MainStack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}>
      <MainStack.Screen name="Main" component={BottomTabNavigator} />
      <MainStack.Screen name="Customers" component={CustomersScreen} />
      <MainStack.Screen name="CashRegister" component={CashRegisterScreen} />
    </MainStack.Navigator>
  );
}

const loadingStyles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#08080A',
  },
});

function RootNavigator() {
  const {isDark, tokens} = useTheme();

  return (
    <>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={tokens.bg}
      />
      <NavigationContainer
        theme={{
          dark: isDark,
          colors: {
            primary: tokens.primary,
            background: tokens.bg,
            card: tokens.surface,
            text: tokens.text,
            border: tokens.border,
            notification: tokens.primary,
          },
          fonts: {
            regular: {fontFamily: 'System', fontWeight: '400'},
            medium: {fontFamily: 'System', fontWeight: '500'},
            bold: {fontFamily: 'System', fontWeight: '600'},
            heavy: {fontFamily: 'System', fontWeight: '700'},
          },
        }}>
        <AppContent />
      </NavigationContainer>
    </>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{flex: 1}}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <RootNavigator />
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
