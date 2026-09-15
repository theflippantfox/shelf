/**
 * Shelf POS — React Native App
 *
 * Entry point. Wraps the app in ThemeProvider + SafeAreaProvider
 * and renders auth flow or main app depending on login state.
 */

import React, {useEffect} from 'react';
import {
  StatusBar,
  View,
  ActivityIndicator,
  StyleSheet,
  Text,
} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {ThemeProvider, useTheme} from './src/components/ThemeProvider';
import {AuthProvider, useAuth} from './src/components/AuthProvider';
import {BottomTabNavigator} from './src/navigation/BottomTabNavigator';
import {useLoadFonts} from './src/hooks/useLoadFonts';

// Auth screens
import LoginScreen from './src/screens/auth/LoginScreen';
import RegisterScreen from './src/screens/auth/RegisterScreen';
import ShopSelectScreen from './src/screens/auth/ShopSelectScreen';

// Sub-screens (pushed over tabs)
import {CustomersScreen} from './src/screens/CustomersScreen';
import {CustomerDetailScreen} from './src/screens/CustomerDetailScreen';
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
      <MainStack.Screen
        name="CustomerDetail"
        component={CustomerDetailScreen}
      />
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
  logo: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: 'rgba(232,181,60,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#E8B53C',
  },
  brandName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FAFAFA',
    letterSpacing: -0.3,
  },
  tagline: {
    fontSize: 13,
    color: '#71717A',
    marginTop: 4,
  },
});

function RootNavigator() {
  const {isDark, tokens} = useTheme();
  const fontsLoaded = useLoadFonts();

  if (!fontsLoaded) {
    return (
      <View style={loadingStyles.center}>
        <View style={loadingStyles.logo}>
          <Text style={loadingStyles.logoText}>S</Text>
        </View>
        <Text style={loadingStyles.brandName}>Shelf</Text>
        <Text style={loadingStyles.tagline}>Point of Sale</Text>
      </View>
    );
  }

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
            regular: {fontFamily: 'PlusJakartaSans-Regular', fontWeight: '400'},
            medium: {fontFamily: 'PlusJakartaSans-Medium', fontWeight: '500'},
            bold: {fontFamily: 'PlusJakartaSans-SemiBold', fontWeight: '600'},
            heavy: {fontFamily: 'PlusJakartaSans-Bold', fontWeight: '700'},
          },
        }}>
        <AppContent />
      </NavigationContainer>
    </>
  );
}

import {initDb} from './src/db';

export default function App() {
  useEffect(() => {
    initDb();
  }, []);

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
