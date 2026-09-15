/**
 * BottomTabNavigator — mobile-first navigation shell.
 *
 * 5 destinations: Dashboard, Inventory, POS (FAB), History, More.
 * The POS button is elevated as a circular FAB — the single most-used action.
 * Ported from the web app's BottomNav.svelte.
 */

import React from 'react';
import {View, TouchableOpacity, StyleSheet, Platform} from 'react-native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Clock,
  MoreHorizontal,
} from 'lucide-react-native';
import {useTheme} from '../components/ThemeProvider';
import {shadows} from '../theme';

// Screens
import {DashboardScreen} from '../screens/DashboardScreen';
import {InventoryScreen} from '../screens/InventoryScreen';
import {POSScreen} from '../screens/POSScreen';
import {HistoryScreen} from '../screens/HistoryScreen';
import {MoreScreen} from '../screens/MoreScreen';

export type TabParamList = {
  Dashboard: undefined;
  Inventory: undefined;
  POS: undefined;
  History: undefined;
  More: undefined;
};

export type RootStackParamList = {
  Main: undefined;
  Customers: undefined;
  CashRegister: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

const ICON_SIZE = 22;

import {Svg, Defs, LinearGradient, Stop, Rect} from 'react-native-svg';

export function BottomTabNavigator() {
  const {tokens} = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
          tabBarStyle: {
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: tokens.surface + 'F2', // 95% opacity
            borderTopWidth: 1,
            borderTopColor: tokens.border,
            elevation: 0,
            height: 64,
            paddingBottom: Platform.OS === 'ios' ? 20 : 8,
            paddingTop: 8,
            borderRadius: 0,
          },
        tabBarActiveTintColor: tokens.navActive,
        tabBarInactiveTintColor: tokens.navMuted,
      }}>
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarIcon: ({focused}) => (
            <TabIcon icon={LayoutDashboard} focused={focused} tokens={tokens} />
          ),
        }}
      />
      <Tab.Screen
        name="Inventory"
        component={InventoryScreen}
        options={{
          tabBarIcon: ({focused}) => (
            <TabIcon icon={Package} focused={focused} tokens={tokens} />
          ),
        }}
      />
      <Tab.Screen
        name="POS"
        component={POSScreen}
        options={{
          tabBarIcon: () => null,
          tabBarButton: props => (
            <POSSab
              onPress={props.onPress ?? undefined}
              isSelected={props.accessibilityState?.selected ?? false}
              tokens={tokens}
            />
          ),
        }}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{
          tabBarIcon: ({focused}) => (
            <TabIcon icon={Clock} focused={focused} tokens={tokens} />
          ),
        }}
      />
      <Tab.Screen
        name="More"
        component={MoreScreen}
        options={{
          tabBarIcon: ({focused}) => (
            <TabIcon icon={MoreHorizontal} focused={focused} tokens={tokens} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// ─── Helpers ──────────────────────────────────────────────

function TabIcon({
  icon: Icon,
  focused,
  tokens,
}: {
  icon: React.ComponentType<{
    size: number;
    color: string;
    strokeWidth?: number;
  }>;
  focused: boolean;
  tokens: ReturnType<typeof useTheme>['tokens'];
}) {
  return (
    <View style={styles.tabIconContainer}>
      {focused && (
        <View
          style={[styles.activeTopBar, {backgroundColor: tokens.navAccent}]}
        />
      )}
      <Icon
        size={ICON_SIZE}
        color={focused ? tokens.navAccent : tokens.text3}
        strokeWidth={focused ? 2 : 1.75}
      />
    </View>
  );
}

function POSSab({
  onPress,
  isSelected,
  tokens,
}: {
  onPress?: (e: any) => void;
  isSelected?: boolean;
  tokens: ReturnType<typeof useTheme>['tokens'];
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.fabContainer}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel="New sale"
      accessibilityState={{selected: isSelected}}>
      <View style={[styles.fabButton, shadows.glow(tokens.primary)]}>
        <View style={StyleSheet.absoluteFillObject}>
          <Svg width="100%" height="100%" style={{borderRadius: 28}}>
            <Defs>
              <LinearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor="#8B5CF6" stopOpacity="1" />
                <Stop offset="1" stopColor="#3B82F6" stopOpacity="1" />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#grad)" />
          </Svg>
        </View>
        <ShoppingCart size={24} color={'#FFFFFF'} strokeWidth={2.5} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  activeTopBar: {
    position: 'absolute',
    top: -8,
    width: 32,
    height: 3,
    borderRadius: 99,
  },
  tabIconFocused: {},
  activeIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  fabContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 0,
    marginTop: -20,
  },
  fabButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
