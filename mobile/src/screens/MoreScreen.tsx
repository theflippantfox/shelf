/**
 * MoreScreen — settings, profile, shop info, and logout.
 */
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {useTheme} from '../components/ThemeProvider';
import {useAuth} from '../components/AuthProvider';
import {Card, Avatar, SectionHeader, TopBar} from '../components/ui';
import {spacing, radii, shadows, typeScale} from '../theme';
import {
  Palette,
  Store,
  Banknote,
  BarChart3,
  Globe,
  Calendar,
  Clock,
  User,
  Users,
  LogOut,
  ChevronRight,
  Wallet,
} from 'lucide-react-native';
import type {ComponentType} from 'react';

interface SettingItem {
  Icon: ComponentType<{size?: number; color?: string; strokeWidth?: number}>;
  iconColor: string;
  label: string;
  value?: string;
  danger?: boolean;
  onPress: () => void;
}

export function MoreScreen() {
  const {tokens, isDark, palette} =
    useTheme();
  const {shop, user, logout} = useAuth();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure?', [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Sign Out', style: 'destructive', onPress: logout},
    ]);
  };

  const iconSize = 20;

  const settings: SettingItem[] = [
    {
      Icon: Palette,
      iconColor: palette.accent,
      label: 'Appearance',
      value: `${palette.name} · ${isDark ? 'Dark' : 'Light'}`,
      onPress: () => navigation.navigate('Appearance'),
    },
  ];

  const shopSettings: SettingItem[] = shop
    ? [
        {
          Icon: Store,
          iconColor: '#10B981',
          label: 'Shop Name',
          value: shop.name,
          onPress: () => {},
        },
        {
          Icon: Banknote,
          iconColor: '#059669',
          label: 'Currency',
          value: `${shop.currency_symbol} (${shop.currency_code})`,
          onPress: () => {},
        },
        {
          Icon: BarChart3,
          iconColor: '#F59E0B',
          label: 'Tax',
          value:
            shop.tax_rate > 0 ? `${shop.tax_name} ${shop.tax_rate}%` : 'None',
          onPress: () => {},
        },
        {
          Icon: Globe,
          iconColor: '#6366F1',
          label: 'Timezone',
          value: shop.timezone,
          onPress: () => {},
        },
        {
          Icon: Calendar,
          iconColor: '#EC4899',
          label: 'Date Format',
          value: shop.date_format,
          onPress: () => {},
        },
        {
          Icon: Clock,
          iconColor: '#F97316',
          label: 'Time Format',
          value: (shop.time_format ?? '24h').toUpperCase(),
          onPress: () => {},
        },
      ]
    : [];

  const quickActions: SettingItem[] = [
    {
      Icon: Users,
      iconColor: '#EC4899',
      label: 'Customers',
      value: undefined,
      onPress: () => navigation.navigate('Customers'),
    },
    {
      Icon: Wallet,
      iconColor: '#8B5CF6',
      label: 'Cash Register',
      value: undefined,
      onPress: () => navigation.navigate('CashRegister'),
    },
  ];

  const renderSection = (title: string, items: SettingItem[]) => (
    <View style={styles.section}>
      <SectionHeader title={title} />
      <Card variant="outlined" padding={0} style={styles.sectionCard}>
        {items.map((item, i) => (
          <TouchableOpacity
            key={item.label}
            style={[
              styles.settingRow,
              i < items.length - 1 && {
                borderBottomColor: tokens.border,
                borderBottomWidth: StyleSheet.hairlineWidth,
              },
            ]}
            onPress={item.onPress}
            activeOpacity={0.6}>
            <View
              style={[
                styles.settingIconWrap,
                {backgroundColor: item.iconColor + '18'},
              ]}>
              <item.Icon
                size={iconSize}
                color={item.iconColor}
                strokeWidth={1.75}
              />
            </View>
            <Text style={[styles.settingLabel, {color: tokens.text}]}>
              {item.label}
            </Text>
            {item.value ? (
              <Text
                style={[styles.settingValue, {color: tokens.text3}]}
                numberOfLines={1}>
                {item.value}
              </Text>
            ) : (
              <ChevronRight size={16} color={tokens.text3} strokeWidth={2} />
            )}
          </TouchableOpacity>
        ))}
      </Card>
    </View>
  );

  return (
    <ScrollView
      style={[styles.container, {backgroundColor: tokens.bg}]}
      contentContainerStyle={{paddingBottom: insets.bottom + 20}}>
      {/* Header */}
      <View style={{paddingTop: insets.top}}>
        <TopBar />
      </View>
      <View style={styles.header}>
        <Text
          style={[typeScale.display, {color: tokens.text, fontWeight: '800'}]}>
          More
        </Text>
        <Text style={[typeScale.body, {color: tokens.text3, marginTop: 2}]}>
          Settings & account
        </Text>
      </View>

      {/* Profile card */}
      {shop && (
        <View style={styles.profileCardWrapper}>
          <View
            style={[styles.profileAccent, {backgroundColor: tokens.navAccent}]}
          />
          <Card
            variant="outlined"
            style={styles.profileCard}
            padding={spacing.lg}>
            <View style={styles.profileRow}>
              <Avatar name={shop.name} size={56} />
              <View style={styles.profileInfo}>
                <Text style={[styles.profileName, {color: tokens.text}]}>
                  {shop.name}
                </Text>
                <Text style={[styles.profileSlug, {color: tokens.text3}]}>
                  /{shop.slug}
                </Text>
                {user?.email && (
                  <Text style={[styles.profileEmail, {color: tokens.text3}]}>
                    {user.email}
                  </Text>
                )}
              </View>
            </View>
          </Card>
        </View>
      )}

      {/* Settings */}
      {renderSection('Settings', settings)}

      {/* Shop Settings (read-only — edit on web) */}
      {shopSettings.length > 0 && renderSection('Shop Settings', shopSettings)}

      {/* Quick Actions */}
      {renderSection('Quick Actions', quickActions)}

      {/* Account */}
      <View style={styles.section}>
        <SectionHeader title="Account" />
        <Card variant="outlined" padding={0} style={styles.sectionCard}>
          <TouchableOpacity
            style={[
              styles.settingRow,
              {
                borderBottomColor: tokens.border,
                borderBottomWidth: StyleSheet.hairlineWidth,
              },
            ]}
            activeOpacity={0.6}>
            <View
              style={[styles.settingIconWrap, {backgroundColor: '#6366F118'}]}>
              <User size={iconSize} color="#6366F1" strokeWidth={1.75} />
            </View>
            <Text style={[styles.settingLabel, {color: tokens.text}]}>
              Profile
            </Text>
            <ChevronRight size={16} color={tokens.text3} strokeWidth={2} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.settingRow,
              {
                borderBottomColor: tokens.border,
                borderBottomWidth: StyleSheet.hairlineWidth,
              },
            ]}
            activeOpacity={0.6}>
            <View
              style={[styles.settingIconWrap, {backgroundColor: '#F59E0B18'}]}>
              <Users size={iconSize} color="#F59E0B" strokeWidth={1.75} />
            </View>
            <Text style={[styles.settingLabel, {color: tokens.text}]}>
              Team Members
            </Text>
            <Text style={[styles.settingValue, {color: tokens.text3}]}>
              Manage on web
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingRow}
            onPress={handleLogout}
            activeOpacity={0.6}>
            <View
              style={[styles.settingIconWrap, {backgroundColor: '#EF444418'}]}>
              <LogOut size={iconSize} color="#EF4444" strokeWidth={1.75} />
            </View>
            <Text style={[styles.settingLabel, {color: '#EF4444'}]}>
              Sign Out
            </Text>
          </TouchableOpacity>
        </Card>
      </View>

      {/* App info */}
      <View style={styles.footer}>
        <Text style={[styles.footerText, {color: tokens.text3}]}>
          Shelf POS · v0.1.0
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
  header: {paddingHorizontal: spacing.xl, marginBottom: spacing.lg},

  // Profile
  profileCardWrapper: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.lg,
    borderRadius: radii.lg,
    overflow: 'hidden',
    ...shadows.sm,
  },
  profileAccent: {
    height: 4,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
  },
  profileCard: {
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderWidth: 1,
    borderTopWidth: 0,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileInfo: {flex: 1, marginLeft: spacing.md},
  profileName: {...typeScale.heading, fontWeight: '700'},
  profileSlug: {...typeScale.caption, marginTop: 2},
  profileEmail: {...typeScale.tiny, marginTop: 2},

  // Sections
  section: {marginHorizontal: spacing.xl, marginBottom: spacing.lg},
  sectionCard: {borderRadius: radii.lg, borderWidth: 1, overflow: 'hidden'},
  paletteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  paletteDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: spacing.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  paletteName: {
    ...typeScale.body,
    fontWeight: '500',
  },
  paletteTagline: {
    ...typeScale.tiny,
    marginTop: 1,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkMark: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  settingIconWrap: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  settingLabel: {...typeScale.body, flex: 1},
  settingValue: {...typeScale.caption, maxWidth: 150, textAlign: 'right'},

  // Footer
  footer: {alignItems: 'center', paddingVertical: spacing.xxl},
  footerText: {...typeScale.caption},
});
