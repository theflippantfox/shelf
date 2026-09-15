/**
 * CustomerDetailScreen — profile card, stats, purchase history, edit/delete.
 */
import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import {useTheme} from '../components/ThemeProvider';
import {useAuth} from '../components/AuthProvider';
import {
  fetchCustomerById,
  updateCustomer,
  deleteCustomer,
  fetchSales,
  type Customer,
  type Sale,
} from '../lib/api';
import {formatPrice, formatDateTime} from '../lib/format';
import {Card, Badge, Button, Avatar} from '../components/ui';
import {spacing, radii, typeScale} from '../theme';
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Phone,
  Mail,
  FileText,
  Calendar,
  ShoppingCart,
  X,
} from 'lucide-react-native';

// Tier logic (matches web)
function getTier(c: Customer): 'vip' | 'regular' | 'new' {
  if (c.visit_count >= 15 || c.total_spent >= 500000) {
    return 'vip';
  }
  if (c.visit_count >= 8 || c.total_spent >= 10000) {
    return 'regular';
  }
  return 'new';
}

const TIER_LABELS = {vip: 'VIP', regular: 'Regular', new: 'New'};

type ParamList = {
  CustomerDetail: {customerId: string; customerName?: string};
};

export function CustomerDetailScreen() {
  const {tokens} = useTheme();
  const {shop} = useAuth();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<ParamList, 'CustomerDetail'>>();

  const customerId = route.params.customerId;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit modal
  const [editVisible, setEditVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Delete confirmation
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      const [cust, allSales] = await Promise.all([
        fetchCustomerById(customerId),
        fetchSales({limit: 200}),
      ]);
      setCustomer(cust);
      // Filter sales to this customer client-side
      // (sales endpoint doesn't support customer_id filter)
      setSales(allSales.filter((s) => (s as any).customer_id === customerId));
    } catch (err) {
      console.error('[CustomerDetail] Failed to load:', err);
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Failed to load customer',
      );
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    load();
  }, [load]);

  // ── Edit ────────────────────────────────────────────────

  const openEdit = () => {
    if (!customer) {
      return;
    }
    setEditName(customer.name);
    setEditPhone(customer.phone ?? '');
    setEditEmail(customer.email ?? '');
    setEditNotes(customer.notes ?? '');
    setEditVisible(true);
  };

  const handleSave = async () => {
    if (!editName.trim()) {
      Alert.alert('Required', 'Customer name is required');
      return;
    }
    setSaving(true);
    try {
      const updated = await updateCustomer(customerId, {
        name: editName.trim(),
        phone: editPhone.trim() || undefined,
        email: editEmail.trim() || undefined,
        notes: editNotes.trim() || undefined,
      });
      setCustomer(updated);
      setEditVisible(false);
    } catch (err) {
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Failed to update customer',
      );
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ──────────────────────────────────────────────

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteCustomer(customerId);
      setDeleteVisible(false);
      navigation.goBack();
    } catch (err) {
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Failed to delete customer',
      );
    } finally {
      setDeleting(false);
    }
  };

  // ── Render ──────────────────────────────────────────────

  if (loading) {
    return (
      <View style={[styles.loadingContainer, {backgroundColor: tokens.bg}]}>
        <ActivityIndicator size="large" color={tokens.navAccent} />
      </View>
    );
  }

  if (!customer) {
    return (
      <View style={[styles.loadingContainer, {backgroundColor: tokens.bg}]}>
        <Text style={{color: tokens.text3}}>Customer not found</Text>
      </View>
    );
  }

  const tier = getTier(customer);

  return (
    <View style={[styles.container, {backgroundColor: tokens.bg}]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + spacing.lg,
            borderBottomColor: tokens.border,
          },
        ]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
            style={styles.backBtn}>
            <ArrowLeft size={22} color={tokens.text} strokeWidth={2} />
          </TouchableOpacity>
          <Text
            style={[
              typeScale.title,
              {color: tokens.text, flex: 1, textAlign: 'center'},
            ]}>
            Customer
          </Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={openEdit}
              activeOpacity={0.7}
              style={[styles.iconBtn, {backgroundColor: tokens.surface2}]}>
              <Pencil size={16} color={tokens.text2} strokeWidth={1.75} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setDeleteVisible(true)}
              activeOpacity={0.7}
              style={[styles.iconBtn, {backgroundColor: '#FEE2E220'}]}>
              <Trash2 size={16} color="#EF4444" strokeWidth={1.75} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{paddingBottom: insets.bottom + 40}}
        keyboardShouldPersistTaps="handled">
        {/* ── Profile Card ───────────────────────────────── */}
        <Card variant="outlined" style={styles.card} padding={spacing.xl}>
          {/* Avatar + Name + Tier */}
          <View style={styles.profileRow}>
            <View style={{marginRight: spacing.md}}>
              <Avatar name={customer.name} size={56} />
            </View>
            <View style={{flex: 1}}>
              <Text
                style={[styles.profileName, {color: tokens.text}]}
                numberOfLines={1}>
                {customer.name}
              </Text>
              <Badge
                label={TIER_LABELS[tier]}
                variant={tier === 'vip' ? 'danger' : tier === 'regular' ? 'info' : 'default'}
                style={{alignSelf: 'flex-start', marginTop: 4}}
              />
            </View>
          </View>

          {/* Stats row */}
          <View style={[styles.statsRow, {borderTopColor: tokens.border}]}>
            <View style={styles.stat}>
              <Text style={[styles.statValue, {color: tokens.text}]}>
                {shop ? formatPrice(customer.total_spent, shop) : '0'}
              </Text>
              <Text style={[styles.statLabel, {color: tokens.text3}]}>
                Total spent
              </Text>
            </View>
            <View
              style={[styles.statDivider, {backgroundColor: tokens.border}]}
            />
            <View style={styles.stat}>
              <Text style={[styles.statValue, {color: tokens.text}]}>
                {customer.visit_count}
              </Text>
              <Text style={[styles.statLabel, {color: tokens.text3}]}>
                Visits
              </Text>
            </View>
          </View>

          {/* Contact info */}
          <View style={styles.contactSection}>
            {customer.phone ? (
              <TouchableOpacity
                style={styles.contactRow}
                onPress={() => Linking.openURL(`tel:${customer.phone}`)}
                activeOpacity={0.6}>
                <Phone size={16} color={tokens.navAccent} strokeWidth={1.75} />
                <Text style={[styles.contactText, {color: tokens.navAccent}]}>
                  {customer.phone}
                </Text>
              </TouchableOpacity>
            ) : null}
            {customer.email ? (
              <TouchableOpacity
                style={styles.contactRow}
                onPress={() => Linking.openURL(`mailto:${customer.email}`)}
                activeOpacity={0.6}>
                <Mail size={16} color={tokens.navAccent} strokeWidth={1.75} />
                <Text
                  style={[styles.contactText, {color: tokens.navAccent}]}
                  numberOfLines={1}>
                  {customer.email}
                </Text>
              </TouchableOpacity>
            ) : null}
            {customer.last_visit ? (
              <View style={styles.contactRow}>
                <Calendar size={16} color={tokens.text3} strokeWidth={1.75} />
                <Text style={[styles.contactText, {color: tokens.text2}]}>
                  Last visit: {formatDateTime(customer.last_visit, shop!)}
                </Text>
              </View>
            ) : null}
            {customer.notes ? (
              <View
                style={[
                  styles.contactRow,
                  {
                    borderTopColor: tokens.border,
                    borderTopWidth: 1,
                    paddingTop: 12,
                    marginTop: 4,
                  },
                ]}>
                <FileText size={16} color={tokens.text3} strokeWidth={1.75} />
                <Text
                  style={[styles.contactText, {color: tokens.text2, flex: 1}]}>
                  {customer.notes}
                </Text>
              </View>
            ) : null}
          </View>
        </Card>

        {/* ── Purchase History ───────────────────────────── */}
        <View style={styles.sectionHeader}>
          <ShoppingCart size={16} color={tokens.text3} strokeWidth={1.75} />
          <Text style={[styles.sectionTitle, {color: tokens.text3}]}>
            Purchase history
          </Text>
        </View>

        {sales.length === 0 ? (
          <View
            style={[
              styles.emptyCard,
              {backgroundColor: tokens.surface, borderColor: tokens.border},
            ]}>
            <ShoppingCart size={32} color={tokens.text3} strokeWidth={1.25} />
            <Text
              style={[styles.emptyText, {color: tokens.text3, marginTop: 8}]}>
              No purchases yet
            </Text>
          </View>
        ) : (
          <View
            style={[
              styles.salesCard,
              {backgroundColor: tokens.surface, borderColor: tokens.border},
            ]}>
            {sales.map((s, i) => (
              <View
                key={s.id}
                style={[
                  styles.saleRow,
                  {
                    borderBottomColor: tokens.border,
                    borderBottomWidth: i < sales.length - 1 ? 1 : 0,
                  },
                ]}>
                <View
                  style={[
                    styles.saleIcon,
                    {backgroundColor: tokens.navAccent + '15'},
                  ]}>
                  <ShoppingCart
                    size={14}
                    color={tokens.navAccent}
                    strokeWidth={1.75}
                  />
                </View>
                <View style={{flex: 1}}>
                  <Text style={[styles.saleRef, {color: tokens.text}]}>
                    {s.sale_ref}
                  </Text>
                  <Text style={[styles.saleDate, {color: tokens.text3}]}>
                    {formatDateTime(s.created_at, shop!)}
                  </Text>
                </View>
                <Text style={[styles.saleTotal, {color: tokens.text}]}>
                  {shop ? formatPrice(s.total, shop) : `\u20B9${s.total}`}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* ── Edit Modal ───────────────────────────────────── */}
      <Modal
        visible={editVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEditVisible(false)}>
        <KeyboardAvoidingView
          style={{flex: 1}}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.modal, {backgroundColor: tokens.bg}]}>
            <View
              style={[styles.modalHeader, {borderBottomColor: tokens.border}]}>
              <TouchableOpacity onPress={() => setEditVisible(false)}>
                <X size={22} color={tokens.text} strokeWidth={2} />
              </TouchableOpacity>
              <Text
                style={[
                  typeScale.title,
                  {
                    color: tokens.text,
                    flex: 1,
                    textAlign: 'center',
                    marginHorizontal: 12,
                  },
                ]}>
                Edit customer
              </Text>
              <TouchableOpacity onPress={handleSave} disabled={saving}>
                <Text
                  style={[
                    typeScale.body,
                    {
                      color: tokens.navAccent,
                      fontWeight: '700',
                      opacity: saving ? 0.5 : 1,
                    },
                  ]}>
                  {saving ? 'Saving...' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{flex: 1}}
              contentContainerStyle={{padding: spacing.xl}}
              keyboardShouldPersistTaps="handled">
              <Text style={styles.fieldLabel}>Name *</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: tokens.text,
                    borderColor: tokens.border,
                    backgroundColor: tokens.surface,
                  },
                ]}
                value={editName}
                onChangeText={setEditName}
                placeholder="Full name"
                placeholderTextColor={tokens.text3}
              />

              <Text style={styles.fieldLabel}>Phone</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: tokens.text,
                    borderColor: tokens.border,
                    backgroundColor: tokens.surface,
                  },
                ]}
                value={editPhone}
                onChangeText={setEditPhone}
                placeholder="Phone number"
                placeholderTextColor={tokens.text3}
                keyboardType="phone-pad"
              />

              <Text style={styles.fieldLabel}>Email</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: tokens.text,
                    borderColor: tokens.border,
                    backgroundColor: tokens.surface,
                  },
                ]}
                value={editEmail}
                onChangeText={setEditEmail}
                placeholder="Email address"
                placeholderTextColor={tokens.text3}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={styles.fieldLabel}>Notes</Text>
              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  {
                    color: tokens.text,
                    borderColor: tokens.border,
                    backgroundColor: tokens.surface,
                  },
                ]}
                value={editNotes}
                onChangeText={setEditNotes}
                placeholder="Optional notes"
                placeholderTextColor={tokens.text3}
                multiline
                numberOfLines={3}
              />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Delete Confirmation ──────────────────────────── */}
      <Modal
        visible={deleteVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteVisible(false)}>
        <View style={styles.overlay}>
          <View
            style={[
              styles.confirmCard,
              {backgroundColor: tokens.surface, borderColor: tokens.border},
            ]}>
            <Text style={[typeScale.title, {color: tokens.text}]}>
              Delete customer?
            </Text>
            <Text style={[typeScale.body, {color: tokens.text2, marginTop: 8}]}>
              {customer.name} will be permanently deleted. This cannot be
              undone.
            </Text>
            <View style={styles.confirmActions}>
              <Button
                label="Cancel"
                variant="secondary"
                onPress={() => setDeleteVisible(false)}
                style={{flex: 1}}
              />
              <Button
                label={deleting ? 'Deleting...' : 'Delete'}
                variant="danger"
                onPress={handleDelete}
                disabled={deleting}
                style={{flex: 1}}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {flex: 1},
  loadingContainer: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  header: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {padding: 4},
  headerActions: {flexDirection: 'row', gap: 8},
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Profile card
  card: {
    margin: spacing.xl,
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.xl,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  tierBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tierText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  stat: {flex: 1, alignItems: 'center'},
  statValue: {fontSize: 17, fontWeight: '700'},
  statLabel: {marginTop: 2, ...typeScale.tiny},
  statDivider: {width: 1, marginVertical: -4},

  // Contact
  contactSection: {gap: 10},
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  contactText: {
    ...typeScale.body,
    flex: 1,
  },

  // Purchase history
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  sectionTitle: {
    ...typeScale.caption,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyCard: {
    marginHorizontal: spacing.xl,
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {...typeScale.body},
  salesCard: {
    marginHorizontal: spacing.xl,
    borderRadius: radii.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  saleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    gap: 10,
  },
  saleIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saleRef: {...typeScale.body, fontWeight: '600'},
  saleDate: {...typeScale.tiny, marginTop: 1},
  saleTotal: {...typeScale.body, fontWeight: '600'},

  // Modal
  modal: {flex: 1},
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  fieldLabel: {
    ...typeScale.caption,
    fontWeight: '600',
    color: '#9CA3AF',
    marginBottom: 6,
    marginTop: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    ...typeScale.body,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },

  // Confirm
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  confirmCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
  },
  confirmActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 20,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  deleteBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#EF4444',
  },
});
