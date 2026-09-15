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
import {fetchCustomers, createCustomer, type Customer} from '../lib/api';
import {formatPrice} from '../lib/format';
import {spacing, radii, typeScale} from '../theme';
import {Users, Plus, User, Phone, Mail, FileText, X, UserPlus, ArrowLeft} from 'lucide-react-native';

// Customer tier logic (matches web app config)
function getTier(c: Customer): 'vip' | 'regular' | 'new' {
  if (c.visit_count >= 15 || c.total_spent >= 500000) {return 'vip';}
  if (c.visit_count >= 8 || c.total_spent >= 10000) {return 'regular';}
  return 'new';
}

const TIER_LABELS = {vip: 'VIP', regular: 'Regular', new: 'New'};
const TIER_COLORS = {vip: '#E11D48', regular: '#6366F1', new: '#06B6D4'};

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

// Hash name to a consistent color
function nameColor(name: string): string {
  const colors = [
    '#6366F1', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6',
    '#06B6D4', '#EF4444', '#F97316', '#14B8A6', '#3B82F6',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

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
      const data = await fetchCustomers();
      setCustomers(data);
    } catch (err) {
      console.error('[Customers] Failed to load:', err);
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Failed to load customers',
      );
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
    const color = nameColor(item.name);
    return (
      <View
        style={[
          styles.customerCard,
          {backgroundColor: tokens.surface, borderColor: tokens.border},
        ]}>
        {/* Avatar */}
        <View style={[styles.avatar, {backgroundColor: color + '20'}]}>
          <Text style={[styles.avatarText, {color}]}>
            {getInitials(item.name)}
          </Text>
        </View>

        {/* Info */}
        <View style={styles.customerInfo}>
          <View style={styles.nameRow}>
            <Text
              style={[styles.customerName, {color: tokens.text}]}
              numberOfLines={1}>
              {item.name}
            </Text>
            <View style={[styles.tierBadge, {backgroundColor: TIER_COLORS[tier] + '18'}]}>
              <Text style={[styles.tierText, {color: TIER_COLORS[tier]}]}>
                {TIER_LABELS[tier]}
              </Text>
            </View>
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
      </View>
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
    <View style={[styles.container, {backgroundColor: tokens.bg}]}>
      {/* Header */}
      <View style={[styles.header, {paddingTop: insets.top + spacing.lg}]}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
              <ArrowLeft size={22} color={tokens.text} strokeWidth={2} />
            </TouchableOpacity>
            <Text style={[typeScale.heading, {color: tokens.text}]}>
              Customers
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.addBtn, {backgroundColor: tokens.navAccent}]}
            onPress={() => {
              resetForm();
              setShowAdd(true);
            }}
            activeOpacity={0.7}>
            <Plus size={18} color="#fff" strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
      </View>

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
              <Text style={{color: tokens.text3, fontSize: 16}}>{'\u2715'}</Text>
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
          <View style={styles.emptyContainer}>
            <Users size={48} color={tokens.text3} strokeWidth={1.25} />
            <Text style={[styles.emptyTitle, {color: tokens.text}]}>
              No customers yet
            </Text>
            <Text style={[styles.emptySubtitle, {color: tokens.text3}]}>
              Add your first customer to start tracking visits.
            </Text>
            <TouchableOpacity
              style={[styles.emptyBtn, {backgroundColor: tokens.navAccent}]}
              onPress={() => {
                resetForm();
                setShowAdd(true);
              }}
              activeOpacity={0.7}>
              <UserPlus size={16} color="#fff" strokeWidth={2} />
              <Text style={styles.emptyBtnText}>Add customer</Text>
            </TouchableOpacity>
          </View>
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
                    {backgroundColor: tokens.surface2, borderColor: tokens.border},
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
                    {backgroundColor: tokens.surface2, borderColor: tokens.border},
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
                    {backgroundColor: tokens.surface2, borderColor: tokens.border},
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
                    {backgroundColor: tokens.surface2, borderColor: tokens.border},
                  ]}>
                  <FileText
                    size={16}
                    color={tokens.text3}
                    strokeWidth={1.75}
                    style={{marginTop: 4}}
                  />
                  <TextInput
                    style={[styles.input, styles.textArea, {color: tokens.text}]}
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
              <TouchableOpacity
                style={[styles.cancelBtn, {borderColor: tokens.border}]}
                onPress={() => setShowAdd(false)}
                activeOpacity={0.7}>
                <Text style={[styles.cancelBtnText, {color: tokens.text2}]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.saveBtn,
                  {backgroundColor: tokens.navAccent},
                  saving && styles.btnDisabled,
                ]}
                onPress={handleAdd}
                activeOpacity={0.7}
                disabled={saving}>
                <Text style={styles.saveBtnText}>
                  {saving ? 'Saving...' : 'Save'}
                </Text>
              </TouchableOpacity>
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
