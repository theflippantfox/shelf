/**
 * CustomersScreen — customer list with search, tiers, and add form.
 */
import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {useTheme} from '../components/ThemeProvider';
import {useAuth} from '../components/AuthProvider';
import {createCustomer, type Customer} from '../lib/api';
import {isOnline, syncCustomersDown, getLocalCustomers} from '../lib/sync';
import {formatPrice} from '../lib/format';
import {
  Card,
  Badge,
  Button,
  Avatar,
  EmptyState,
  TopBar,
  PageHeadingBlock,
} from '../components/ui';
import {spacing, radii, typeScale} from '../theme';
import {Users, Plus, User, Phone, Mail, FileText, X} from 'lucide-react-native';

// Customer tier logic (matches web app config)
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

export function CustomersScreen() {
  const {tokens} = useTheme();
  const {shop} = useAuth();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formNotes, setFormNotes] = useState('');

  const load = useCallback(async () => {
    if (!shop) {
      setLoading(false);
      return;
    }
    try {
      const local = await getLocalCustomers();
      if (local.length > 0) {
        setCustomers(local);
      }

      if (await isOnline()) {
        await syncCustomersDown(shop.id);
        const fresh = await getLocalCustomers();
        setCustomers(fresh);
      }
    } catch (err) {
      console.error('[Customers] Failed to load:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [shop]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const filtered = search
    ? customers.filter(
        c =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.phone?.toLowerCase().includes(search.toLowerCase()) ||
          c.email?.toLowerCase().includes(search.toLowerCase()),
      )
    : customers;

  const handleAdd = async () => {
    if (!formName.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }
    setSaving(true);
    try {
      const newCustomer = await createCustomer({
        name: formName.trim(),
        phone: formPhone.trim() || undefined,
        email: formEmail.trim() || undefined,
        notes: formNotes.trim() || undefined,
      });
      setCustomers(prev => [newCustomer, ...prev]);
      setShowAdd(false);
      resetForm();
    } catch (err) {
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Failed to add customer',
      );
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormName('');
    setFormPhone('');
    setFormEmail('');
    setFormNotes('');
  };

  const renderCustomer = ({item}: {item: Customer}) => {
    const tier = getTier(item);
    return (
      <Card
        onPress={() =>
          navigation.navigate(
            'CustomerDetail' as never,
            {customerId: item.id, customerName: item.name} as never,
          )
        }
        variant="outlined"
        style={styles.customerCard}>
        {/* Avatar */}
        <Avatar name={item.name} size={42} />

        {/* Info */}
        <View style={styles.customerInfo}>
          <View style={styles.nameRow}>
            <Text
              style={[styles.customerName, {color: tokens.text}]}
              numberOfLines={1}>
              {item.name}
            </Text>
            <Badge
              label={TIER_LABELS[tier]}
              variant={
                tier === 'vip'
                  ? 'danger'
                  : tier === 'regular'
                  ? 'info'
                  : 'default'
              }
            />
          </View>
          <Text style={[styles.customerMeta, {color: tokens.text3}]}>
            {item.phone ?? item.email ?? 'No contact'}{' '}
            {item.visit_count > 0 ? `\u00B7 ${item.visit_count} visits` : ''}
          </Text>
        </View>

        {/* Total spent */}
        <View style={styles.spentCol}>
          <Text style={[styles.spentValue, {color: tokens.text}]}>
            {shop ? formatPrice(item.total_spent, shop) : '0'}
          </Text>
          <Text style={[styles.spentLabel, {color: tokens.text3}]}>spent</Text>
        </View>
      </Card>
    );
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, {backgroundColor: tokens.bg}]}>
        <ActivityIndicator size="large" color={tokens.navAccent} />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        {backgroundColor: tokens.bg, paddingTop: insets.top},
      ]}>
      {/* Header */}
      <TopBar
        onBack={() => navigation.goBack()}
        trailingIcons={[
          <Plus
            key="add"
            size={24}
            color={tokens.navAccent}
            onPress={() => {
              resetForm();
              setShowAdd(true);
            }}
          />,
        ]}
      />

      <PageHeadingBlock
        heading="Customers"
        eyebrow={`${filtered.length} customers`}
      />

      {/* Search */}
      <View style={styles.searchRow}>
        <View
          style={[
            styles.searchBar,
            {backgroundColor: tokens.surface2, borderColor: tokens.border},
          ]}>
          <TextInput
            style={[styles.searchInput, {color: tokens.text}]}
            value={search}
            onChangeText={setSearch}
            placeholder="Search by name or phone..."
            placeholderTextColor={tokens.text3}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Text style={{color: tokens.text3, fontSize: 16}}>
                {'\u2715'}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Customer list */}
      <FlatList
        data={filtered}
        renderItem={renderCustomer}
        keyExtractor={item => item.id}
        refreshing={refreshing}
        onRefresh={onRefresh}
        contentContainerStyle={{
          paddingHorizontal: spacing.xl,
          paddingBottom: insets.bottom + 20,
        }}
        ListEmptyComponent={
          <EmptyState
            icon={<Users size={48} color={tokens.text3} strokeWidth={1.25} />}
            title="No customers yet"
            subtitle="Add your first customer to start tracking visits."
            actionLabel="Add customer"
            onAction={() => {
              resetForm();
              setShowAdd(true);
            }}
          />
        }
      />

      {/* Add customer modal */}
      <Modal visible={showAdd} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}>
          <View
            style={[
              styles.modalSheet,
              {backgroundColor: tokens.surface, borderTopColor: tokens.border},
            ]}>
            {/* Handle */}
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <Text style={[typeScale.title, {color: tokens.text}]}>
                New customer
              </Text>
              <TouchableOpacity onPress={() => setShowAdd(false)}>
                <X size={22} color={tokens.text3} strokeWidth={2} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              {/* Name */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, {color: tokens.text3}]}>
                  Full name
                </Text>
                <View
                  style={[
                    styles.inputRow,
                    {
                      backgroundColor: tokens.surface2,
                      borderColor: tokens.border,
                    },
                  ]}>
                  <User size={16} color={tokens.text3} strokeWidth={1.75} />
                  <TextInput
                    style={[styles.input, {color: tokens.text}]}
                    value={formName}
                    onChangeText={setFormName}
                    placeholder="John Doe"
                    placeholderTextColor={tokens.text3}
                    autoFocus
                  />
                </View>
              </View>

              {/* Phone */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, {color: tokens.text3}]}>
                  Phone
                </Text>
                <View
                  style={[
                    styles.inputRow,
                    {
                      backgroundColor: tokens.surface2,
                      borderColor: tokens.border,
                    },
                  ]}>
                  <Phone size={16} color={tokens.text3} strokeWidth={1.75} />
                  <TextInput
                    style={[styles.input, {color: tokens.text}]}
                    value={formPhone}
                    onChangeText={setFormPhone}
                    placeholder="+91 98765 43210"
                    placeholderTextColor={tokens.text3}
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              {/* Email */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, {color: tokens.text3}]}>
                  Email
                </Text>
                <View
                  style={[
                    styles.inputRow,
                    {
                      backgroundColor: tokens.surface2,
                      borderColor: tokens.border,
                    },
                  ]}>
                  <Mail size={16} color={tokens.text3} strokeWidth={1.75} />
                  <TextInput
                    style={[styles.input, {color: tokens.text}]}
                    value={formEmail}
                    onChangeText={setFormEmail}
                    placeholder="john@example.com"
                    placeholderTextColor={tokens.text3}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              {/* Notes */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, {color: tokens.text3}]}>
                  Notes
                </Text>
                <View
                  style={[
                    styles.inputRow,
                    styles.textAreaRow,
                    {
                      backgroundColor: tokens.surface2,
                      borderColor: tokens.border,
                    },
                  ]}>
                  <FileText
                    size={16}
                    color={tokens.text3}
                    strokeWidth={1.75}
                    style={{marginTop: 4}}
                  />
                  <TextInput
                    style={[
                      styles.input,
                      styles.textArea,
                      {color: tokens.text},
                    ]}
                    value={formNotes}
                    onChangeText={setFormNotes}
                    placeholder="Any notes..."
                    placeholderTextColor={tokens.text3}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                </View>
              </View>
            </View>

            {/* Actions */}
            <View style={styles.modalActions}>
              <Button
                label="Cancel"
                variant="secondary"
                onPress={() => setShowAdd(false)}
                style={{flex: 1}}
              />
              <Button
                label={saving ? 'Saving...' : 'Save'}
                variant="primary"
                onPress={handleAdd}
                disabled={saving}
                style={{flex: 1}}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
  loadingContainer: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  header: {paddingHorizontal: spacing.xl, marginBottom: spacing.sm},
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Search
  searchRow: {paddingHorizontal: spacing.xl, marginBottom: spacing.md},
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    height: 44,
  },
  searchInput: {
    flex: 1,
    ...typeScale.body,
    marginLeft: spacing.sm,
  },

  // Customer card
  customerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  avatarText: {fontSize: 15, fontWeight: '700'},
  customerInfo: {flex: 1, minWidth: 0},
  nameRow: {flexDirection: 'row', alignItems: 'center', gap: 6},
  customerName: {...typeScale.title, flexShrink: 0},
  tierBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.sm,
  },
  tierText: {fontSize: 10, fontWeight: '700', textTransform: 'uppercase'},
  customerMeta: {...typeScale.caption, marginTop: 2},
  spentCol: {alignItems: 'flex-end', marginLeft: spacing.sm},
  spentValue: {...typeScale.title, fontVariant: ['tabular-nums']},
  spentLabel: {...typeScale.tiny, marginTop: 2},

  // Empty
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: spacing.sm,
  },
  emptyTitle: {...typeScale.title, marginTop: spacing.sm},
  emptySubtitle: {...typeScale.body, textAlign: 'center', maxWidth: 260},
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    marginTop: spacing.md,
  },
  emptyBtnText: {color: '#fff', ...typeScale.body, fontWeight: '600'},

  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalSheet: {
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    borderTopWidth: 1,
    paddingBottom: 40,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#666',
    alignSelf: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.lg,
  },
  modalBody: {paddingHorizontal: spacing.xl},
  fieldGroup: {marginBottom: spacing.md},
  fieldLabel: {...typeScale.caption, marginBottom: 6, fontWeight: '600'},
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    height: 44,
    gap: spacing.sm,
  },
  textAreaRow: {
    height: undefined,
    alignItems: 'flex-start',
    paddingTop: spacing.sm,
  },
  input: {flex: 1, ...typeScale.body},
  textArea: {minHeight: 64, paddingTop: 2},
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    marginTop: spacing.lg,
  },
  cancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: radii.md,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {...typeScale.body, fontWeight: '600'},
  saveBtn: {
    flex: 1,
    height: 44,
    borderRadius: radii.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnDisabled: {opacity: 0.5},
  saveBtnText: {color: '#fff', ...typeScale.body, fontWeight: '600'},
});
