/**
 * AppearanceScreen — palette picker + dark/light mode toggle.
 */
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {useTheme} from '../components/ThemeProvider';
import {Card, SectionHeader} from '../components/ui';
import {spacing, radii, typeScale} from '../theme';
import {PALETTES} from '../theme/palettes';
import type {ThemeMode} from '../components/ThemeProvider';
import {ArrowLeft, Sun, Moon, Monitor} from 'lucide-react-native';

const MODES: {id: ThemeMode; label: string; icon: typeof Sun}[] = [
  {id: 'light', label: 'Light', icon: Sun},
  {id: 'dark', label: 'Dark', icon: Moon},
  {id: 'system', label: 'System', icon: Monitor},
];

export function AppearanceScreen() {
  const {tokens, paletteId, setPaletteId, setMode, mode} =
    useTheme();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, {backgroundColor: tokens.bg}]}>
      <ScrollView
        style={{flex: 1}}
        contentContainerStyle={{
          paddingTop: insets.top + spacing.md,
          paddingBottom: spacing.xxxl,
        }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[styles.backBtn, {backgroundColor: tokens.surface}]}>
            <ArrowLeft size={20} color={tokens.text} strokeWidth={2} />
          </TouchableOpacity>
          <Text style={[typeScale.heading, {color: tokens.text}]}>
            Appearance
          </Text>
          <View style={{width: 40}} />
        </View>

        {/* Mode picker */}
        <View style={styles.section}>
          <SectionHeader title="Theme" />
          <Card variant="outlined" padding={0} style={styles.sectionCard}>
            <View style={styles.modeRow}>
              {MODES.map((m, i) => {
                const Icon = m.icon;
                const active = mode === m.id;
                return (
                  <TouchableOpacity
                    key={m.id}
                    onPress={() => setMode(m.id)}
                    style={[
                      styles.modeBtn,
                      {
                        backgroundColor: active
                          ? tokens.navAccent
                          : tokens.surface2,
                        borderColor: active ? tokens.navAccent : tokens.border,
                      },
                      i < MODES.length - 1 && {marginRight: spacing.sm},
                    ]}
                    activeOpacity={0.7}>
                    <Icon
                      size={18}
                      color={active ? '#fff' : tokens.text2}
                      strokeWidth={2}
                    />
                    <Text
                      style={[
                        styles.modeLabel,
                        {color: active ? '#fff' : tokens.text2},
                      ]}>
                      {m.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Card>
        </View>

        {/* Palette picker */}
        <View style={styles.section}>
          <SectionHeader title="Palette" />
          <Card variant="outlined" padding={0} style={styles.sectionCard}>
            {PALETTES.map((p, i) => {
              const active = paletteId === p.id;
              return (
                <TouchableOpacity
                  key={p.id}
                  onPress={() => setPaletteId(p.id)}
                  style={[
                    styles.paletteRow,
                    i < PALETTES.length - 1 && {
                      borderBottomColor: tokens.border,
                      borderBottomWidth: StyleSheet.hairlineWidth,
                    },
                  ]}
                  activeOpacity={0.6}>
                  {/* Accent dot */}
                  <View style={styles.paletteDotWrap}>
                    <View
                      style={[
                        styles.paletteDot,
                        {backgroundColor: p.accent},
                        active && {
                          borderColor: tokens.text,
                          borderWidth: 2.5,
                        },
                      ]}
                    />
                    {/* Light/dark mini dots */}
                    <View style={styles.miniDots}>
                      <View
                        style={[
                          styles.miniDot,
                          {backgroundColor: p.light.bg},
                        ]}
                      />
                      <View
                        style={[
                          styles.miniDot,
                          {backgroundColor: p.dark.bg},
                        ]}
                      />
                    </View>
                  </View>
                  {/* Name + tagline */}
                  <View style={{flex: 1}}>
                    <Text
                      style={[
                        styles.paletteName,
                        {color: active ? tokens.text : tokens.text2},
                      ]}>
                      {p.name}
                    </Text>
                    <Text
                      style={[styles.paletteTagline, {color: tokens.text3}]}>
                      {p.tagline}
                    </Text>
                  </View>
                  {/* Checkmark */}
                  {active && (
                    <View
                      style={[
                        styles.checkCircle,
                        {backgroundColor: tokens.navAccent},
                      ]}>
                      <Text style={styles.checkMark}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </Card>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.lg,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {marginHorizontal: spacing.xl, marginBottom: spacing.lg},
  sectionCard: {borderRadius: radii.lg, borderWidth: 1, overflow: 'hidden'},

  // Mode buttons
  modeRow: {
    flexDirection: 'row',
    padding: spacing.md,
  },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: radii.lg,
    borderWidth: 1,
  },
  modeLabel: {
    ...typeScale.caption,
    fontWeight: '600',
  },

  // Palette rows
  paletteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  paletteDotWrap: {
    alignItems: 'center',
    marginRight: spacing.md,
  },
  paletteDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  miniDots: {
    flexDirection: 'row',
    gap: 3,
    marginTop: 4,
  },
  miniDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
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
});
