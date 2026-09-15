/**
 * ShopSelectScreen — choose which shop to work in.
 *
 * Shown when a user belongs to multiple shops.
 */
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import {useTheme} from '../../components/ThemeProvider';
import {typeScale} from '../../theme';
import {useAuth} from '../../components/AuthProvider';
import type {Shop} from '../../lib/api';

export default function ShopSelectScreen() {
  const {tokens} = useTheme();
  const {shops, selectShop, error, clearError} = useAuth();
  const [loadingId, setLoadingId] = React.useState<string | null>(null);

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

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: tokens.bg,
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: 'center',
      padding: 24,
    },
    header: {
      alignItems: 'center',
      marginBottom: 36,
    },
    logo: {
      fontSize: 32,
      fontWeight: '800' as const,
      color: tokens.navAccent,
      letterSpacing: -0.5,
    },
    subtitle: {
      ...typeScale.body,
      color: tokens.text3,
      marginTop: 8,
      textAlign: 'center',
    },
    list: {
      gap: 12,
    },
    shopCard: {
      backgroundColor: tokens.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: tokens.border,
      padding: 18,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    shopCardActive: {
      borderColor: tokens.navAccent,
      backgroundColor: tokens.surface2,
    },
    shopInfo: {
      flex: 1,
    },
    shopName: {
      ...typeScale.title,
      color: tokens.text,
    },
    shopSlug: {
      ...typeScale.caption,
      color: tokens.text3,
      marginTop: 2,
    },
    shopRole: {
      ...typeScale.tiny,
      color: tokens.navAccent,
      marginTop: 6,
    },
    chevron: {
      fontSize: 20,
      color: tokens.text3,
      marginLeft: 12,
    },
    errorText: {
      ...typeScale.caption,
      color: '#EF4444',
      textAlign: 'center',
      marginBottom: 12,
    },
    emptyText: {
      ...typeScale.body,
      color: tokens.text3,
      textAlign: 'center',
      marginTop: 48,
    },
  });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Text style={styles.logo}>Select Shop</Text>
        <Text style={styles.subtitle}>
          Which workspace do you want to open?
        </Text>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {shops.length === 0 ? (
        <Text style={styles.emptyText}>
          No shops found. Create one on the web app first.
        </Text>
      ) : (
        <View style={styles.list}>
          {shops.map(shop => {
            const isLoading = loadingId === shop.id;
            return (
              <TouchableOpacity
                key={shop.id}
                style={[styles.shopCard, isLoading && styles.shopCardActive]}
                onPress={() => handleSelect(shop)}
                disabled={loadingId !== null}
                activeOpacity={0.7}>
                <View style={styles.shopInfo}>
                  <Text style={styles.shopName}>{shop.name}</Text>
                  <Text style={styles.shopSlug}>/{shop.slug}</Text>
                </View>
                {isLoading ? (
                  <ActivityIndicator color={tokens.navAccent} />
                ) : (
                  <Text style={styles.chevron}>›</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}
