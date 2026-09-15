/**
 * ShopSelectScreen — modern card-based shop picker.
 */
import React, {useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../components/ThemeProvider';
import {useAuth} from '../../components/AuthProvider';
import {spacing, radii, shadows, typeScale} from '../../theme';
import type {Shop} from '../../lib/api';
import {Store, ChevronRight} from 'lucide-react-native';

export default function ShopSelectScreen() {
  const {tokens} = useTheme();
  const {shops, selectShop, error, clearError} = useAuth();
  const insets = useSafeAreaInsets();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleSelect = async (shop: Shop) => {
    setLoadingId(shop.id);
    clearError();
    try {
      await selectShop(shop.id);
    } catch {
      // Error set in AuthProvider
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <View style={{flex: 1, backgroundColor: tokens.bg}}>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          paddingHorizontal: spacing.xxl,
          paddingTop: insets.top + spacing.xxxl,
          paddingBottom: insets.bottom + spacing.xxxl,
        }}>
        {/* Header */}
        <View style={{alignItems: 'center', marginBottom: spacing.xxxl}}>
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 20,
              backgroundColor: tokens.accentGlow,
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: spacing.lg,
            }}>
            <Store size={28} color={tokens.navAccent} strokeWidth={2} />
          </View>
          <Text style={[typeScale.heading, {color: tokens.text}]}>
            Select Shop
          </Text>
          <Text
            style={[
              typeScale.body,
              {color: tokens.text3, marginTop: spacing.xs},
            ]}>
            Which workspace do you want to open?
          </Text>
        </View>

        {/* Error */}
        {error ? (
          <View
            style={{
              backgroundColor: tokens.dangerDim,
              borderRadius: radii.md,
              padding: spacing.md,
              marginBottom: spacing.lg,
            }}>
            <Text style={[typeScale.caption, {color: tokens.danger}]}>
              {error}
            </Text>
          </View>
        ) : null}

        {/* Shop list */}
        {shops.length === 0 ? (
          <Text
            style={[
              typeScale.body,
              {
                color: tokens.text3,
                textAlign: 'center',
                marginTop: spacing.xxxl,
              },
            ]}>
            No shops found. Create one on the web app first.
          </Text>
        ) : (
          <View style={{gap: spacing.md}}>
            {shops.map(shop => {
              const isLoading = loadingId === shop.id;
              return (
                <TouchableOpacity
                  key={shop.id}
                  activeOpacity={0.7}
                  onPress={() => handleSelect(shop)}
                  disabled={loadingId !== null}
                  style={{
                    backgroundColor: tokens.surface,
                    borderRadius: radii.lg,
                    borderWidth: 1,
                    borderColor: isLoading ? tokens.navAccent : tokens.border,
                    padding: spacing.lg,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    opacity: loadingId !== null && !isLoading ? 0.5 : 1,
                    ...shadows.sm,
                  }}>
                  <View style={{flex: 1}}>
                    <Text style={[typeScale.title, {color: tokens.text}]}>
                      {shop.name}
                    </Text>
                    <Text
                      style={[
                        typeScale.caption,
                        {color: tokens.text3, marginTop: 2},
                      ]}>
                      /{shop.slug}
                    </Text>
                    <Text
                      style={[
                        typeScale.tiny,
                        {color: tokens.navAccent, marginTop: spacing.xs},
                      ]}>
                      {shop.currency_code} · {shop.timezone}
                    </Text>
                  </View>
                  {isLoading ? (
                    <ActivityIndicator color={tokens.navAccent} />
                  ) : (
                    <ChevronRight
                      size={20}
                      color={tokens.text3}
                      strokeWidth={2}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
