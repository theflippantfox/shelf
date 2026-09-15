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
import {radii, shadows} from '../theme';

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

export function BottomTabNavigator() {
  const {tokens} = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: tokens.navBg,
          borderTopColor: tokens.border,
          borderTopWidth: 1,
          height: 64 + (Platform.OS === 'ios' ? 20 : 0),
          paddingBottom: Platform.OS === 'ios' ? 20 : 8,
          paddingTop: 8,
          ...shadows.sm,
        },
        tabBarActiveTintColor: tokens.navActive,
        tabBarInactiveTintColor: tokens.navMuted,
        tabBarLabelStyle: {
          fontSize: 10.5,
          fontWeight: '500',
          marginTop: 2,
        },
      }}>
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarIcon: ({color, focused}) => (
            <TabIcon
              icon={LayoutDashboard}
              color={color}
              focused={focused}
              accentColor={tokens.navAccent}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Inventory"
        component={InventoryScreen}
        options={{
          tabBarIcon: ({color, focused}) => (
            <TabIcon
              icon={Package}
              color={color}
              focused={focused}
              accentColor={tokens.navAccent}
            />
          ),
        }}
      />
      <Tab.Screen
        name="POS"
        component={POSScreen}
        options={{
          tabBarIcon: () => null,
          tabBarLabel: () => null,
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
          tabBarIcon: ({color, focused}) => (
            <TabIcon
              icon={Clock}
              color={color}
              focused={focused}
              accentColor={tokens.navAccent}
            />
          ),
        }}
      />
      <Tab.Screen
        name="More"
        component={MoreScreen}
        options={{
          tabBarIcon: ({color, focused}) => (
            <TabIcon
              icon={MoreHorizontal}
              color={color}
              focused={focused}
              accentColor={tokens.navAccent}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// ─── Helpers ──────────────────────────────────────────────

function TabIcon({
  icon: Icon,
  color,
  focused,
  accentColor,
}: {
  icon: React.ComponentType<{
    size: number;
    color: string;
    strokeWidth?: number;
  }>;
  color: string;
  focused: boolean;
  accentColor: string;
}) {
  return (
    <View style={styles.tabIconContainer}>
      <Icon
        size={ICON_SIZE}
        color={color}
        strokeWidth={focused ? 2.25 : 1.75}
      />
      {focused && (
        <View
          style={[styles.activeIndicator, {backgroundColor: accentColor}]}
        />
      )}
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
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel="New sale"
      accessibilityState={{selected: isSelected}}>
      <View
        style={[
          styles.fabButton,
          {
            backgroundColor: tokens.primary,
            ...shadows.glow(tokens.primary),
          },
        ]}>
        <ShoppingCart size={24} color={tokens.primaryFg} strokeWidth={2} />
      </View>
      {/* Active indicator dot below the FAB */}
      <View
        style={[
          styles.fabActiveIndicator,
          {
            backgroundColor: isSelected ? tokens.navAccent : 'transparent',
          },
        ]}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeIndicator: {
    position: 'absolute',
    top: -8,
    width: 32,
    height: 3,
    borderRadius: 2,
  },
  fabContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 0,
    marginTop: -20,
  },
  fabButton: {
    width: 56,
    height: 56,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabActiveIndicator: {
    marginTop: 4,
    width: 32,
    height: 3,
    borderRadius: 2,
  },
});
