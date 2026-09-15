/**
 * CashRegisterScreen — balance view, entry history, and add expense/injection.
 */
import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
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
import {
  fetchRegisterBalance,
  createCashEntry,
  type RegisterBalance,
} from '../lib/api';
import {formatPrice} from '../lib/format';
import {spacing, radii, typeScale} from '../theme';
import {
  Wallet,
  Building2,
  Box,
  TrendingUp,
  TrendingDown,
  Plus,
  X,
  DollarSign,
  FileText,
  ArrowLeft,
} from 'lucide-react-native';

type EntryTab = 'expense' | 'injection';

export function CashRegisterScreen() {
  const {tokens} = useTheme();
  const {shop} = useAuth();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const [balances, setBalances] = useState<RegisterBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Add entry modal
  const [showAdd, setShowAdd] = useState(false);
  const [entryTab, setEntryTab] = useState<EntryTab>('expense');
  const [amount, setAmount] = useState('');
  const [destination, setDestination] = useState<'counter' | 'bank' | 'other'>(
    'counter',
  );
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!shop) {
      setLoading(false);
      return;
    }
    try {
      const data = await fetchRegisterBalance();
      setBalances(data);
    } catch (err) {
      console.error('[CashRegister] Failed to load:', err);
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Failed to load register',
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

  const counterBal =
    balances.find(b => b.destination === 'counter')?.balance ?? 0;
  const bankBal = balances.find(b => b.destination === 'bank')?.balance ?? 0;
  const otherBal = balances.find(b => b.destination === 'other')?.balance ?? 0;
  const totalBalance = counterBal + bankBal + otherBal;

  const handleSubmit = async () => {
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt === 0) {
      Alert.alert('Error', 'Enter a valid amount');
      return;
    }
    setSaving(true);
    try {
      const signed = entryTab === 'expense' ? -Math.abs(amt) : Math.abs(amt);
      await createCashEntry({
        destination,
        amount: signed,
        entry_type: entryTab,
        notes: notes.trim(),
      });
      // Reload balances
      const data = await fetchRegisterBalance();
      setBalances(data);
      setShowAdd(false);
      resetForm();
      Alert.alert(
        'Success',
        entryTab === 'expense' ? 'Expense recorded' : 'Injection recorded',
      );
    } catch (err) {
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Failed to save entry',
      );
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setAmount('');
    setNotes('');
    setDestination('counter');
  };

  const destIcon = (d: string) => {
    switch (d) {
      case 'counter':
        return Wallet;
      case 'bank':
        return Building2;
      default:
        return Box;
    }
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
        <View style={styles.headerLeft}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}>
            <ArrowLeft size={22} color={tokens.text} strokeWidth={2} />
          </TouchableOpacity>
          <Text style={[typeScale.heading, {color: tokens.text}]}>
            Cash Register
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

      <FlatList
        data={[]}
        renderItem={null}
        refreshing={refreshing}
        onRefresh={onRefresh}
        contentContainerStyle={{
          paddingHorizontal: spacing.xl,
          paddingBottom: insets.bottom + 20,
        }}
        ListHeaderComponent={
          <>
            {/* Total balance card */}
            <View
              style={[
                styles.balanceCard,
                {backgroundColor: tokens.surface, borderColor: tokens.border},
              ]}>
              <Text style={[styles.balanceLabel, {color: tokens.text3}]}>
                Total Balance
              </Text>
              <Text style={[styles.balanceValue, {color: tokens.text}]}>
                {shop ? formatPrice(totalBalance, shop) : '0'}
              </Text>

              {/* Destination splits */}
              <View style={styles.destRow}>
                {[
                  {
                    dest: 'counter',
                    bal: counterBal,
                    Icon: Wallet,
                    label: 'Counter',
                  },
                  {dest: 'bank', bal: bankBal, Icon: Building2, label: 'Bank'},
                  ...(otherBal !== 0
                    ? [
                        {
                          dest: 'other',
                          bal: otherBal,
                          Icon: Box,
                          label: 'Other',
                        },
                      ]
                    : []),
                ].map(item => (
                  <View key={item.dest} style={styles.destItem}>
                    <View
                      style={[
                        styles.destIcon,
                        {backgroundColor: tokens.surface2},
                      ]}>
                      <item.Icon
                        size={14}
                        color={tokens.text2}
                        strokeWidth={1.75}
                      />
                    </View>
                    <Text style={[styles.destLabel, {color: tokens.text3}]}>
                      {item.label}
                    </Text>
                    <Text style={[styles.destValue, {color: tokens.text}]}>
                      {shop ? formatPrice(item.bal, shop) : '0'}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Quick actions */}
            <View style={styles.quickActions}>
              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  {backgroundColor: tokens.surface, borderColor: tokens.border},
                ]}
                onPress={() => {
                  setEntryTab('expense');
                  resetForm();
                  setShowAdd(true);
                }}
                activeOpacity={0.7}>
                <TrendingDown size={18} color="#EF4444" strokeWidth={2} />
                <Text style={[styles.actionLabel, {color: tokens.text}]}>
                  Expense
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  {backgroundColor: tokens.surface, borderColor: tokens.border},
                ]}
                onPress={() => {
                  setEntryTab('injection');
                  resetForm();
                  setShowAdd(true);
                }}
                activeOpacity={0.7}>
                <TrendingUp size={18} color="#10B981" strokeWidth={2} />
                <Text style={[styles.actionLabel, {color: tokens.text}]}>
                  Injection
                </Text>
              </TouchableOpacity>
            </View>

            {/* Info text */}
            <Text style={[styles.infoText, {color: tokens.text3}]}>
              Sales are automatically added to the register. Use Expense and
              Injection for manual adjustments.
            </Text>
          </>
        }
      />

      {/* Add entry modal */}
      <Modal visible={showAdd} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}>
          <View
            style={[
              styles.modalSheet,
              {backgroundColor: tokens.surface, borderTopColor: tokens.border},
            ]}>
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <Text style={[typeScale.title, {color: tokens.text}]}>
                {entryTab === 'expense' ? 'Log Expense' : 'Log Injection'}
              </Text>
              <TouchableOpacity onPress={() => setShowAdd(false)}>
                <X size={22} color={tokens.text3} strokeWidth={2} />
              </TouchableOpacity>
            </View>

            {/* Tab chooser */}
            <View style={styles.tabChooser}>
              {(['expense', 'injection'] as EntryTab[]).map(tab => (
                <TouchableOpacity
                  key={tab}
                  style={[
                    styles.tabBtn,
                    entryTab === tab && {
                      backgroundColor: tokens.surface,
                      ...shadows.sm,
                    },
                  ]}
                  onPress={() => setEntryTab(tab)}
                  activeOpacity={0.7}>
                  <Text
                    style={[
                      styles.tabText,
                      {
                        color: entryTab === tab ? tokens.text : tokens.text3,
                      },
                    ]}>
                    {tab === 'expense' ? 'Expense' : 'Injection'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalBody}>
              {/* Destination */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, {color: tokens.text3}]}>
                  Destination
                </Text>
                <View style={styles.destPicker}>
                  {(['counter', 'bank', 'other'] as const).map(d => {
                    const DIcon = destIcon(d);
                    const isSelected = destination === d;
                    return (
                      <TouchableOpacity
                        key={d}
                        style={[
                          styles.destOption,
                          {
                            backgroundColor: isSelected
                              ? tokens.navAccent + '18'
                              : tokens.surface2,
                            borderColor: isSelected
                              ? tokens.navAccent
                              : tokens.border,
                          },
                        ]}
                        onPress={() => setDestination(d)}
                        activeOpacity={0.7}>
                        <DIcon
                          size={14}
                          color={isSelected ? tokens.navAccent : tokens.text3}
                          strokeWidth={1.75}
                        />
                        <Text
                          style={[
                            styles.destOptionText,
                            {
                              color: isSelected
                                ? tokens.navAccent
                                : tokens.text,
                            },
                          ]}>
                          {d === 'counter'
                            ? 'Counter'
                            : d === 'bank'
                            ? 'Bank'
                            : 'Other'}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Amount */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, {color: tokens.text3}]}>
                  Amount {entryTab === 'expense' ? '(negative)' : '(positive)'}
                </Text>
                <View
                  style={[
                    styles.inputRow,
                    {
                      backgroundColor: tokens.surface2,
                      borderColor: tokens.border,
                    },
                  ]}>
                  <DollarSign
                    size={16}
                    color={tokens.text3}
                    strokeWidth={1.75}
                  />
                  <TextInput
                    style={[styles.input, {color: tokens.text}]}
                    value={amount}
                    onChangeText={setAmount}
                    placeholder="0.00"
                    placeholderTextColor={tokens.text3}
                    keyboardType="decimal-pad"
                    autoFocus
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
                    {
                      backgroundColor: tokens.surface2,
                      borderColor: tokens.border,
                    },
                  ]}>
                  <FileText size={16} color={tokens.text3} strokeWidth={1.75} />
                  <TextInput
                    style={[styles.input, {color: tokens.text}]}
                    value={notes}
                    onChangeText={setNotes}
                    placeholder={
                      entryTab === 'expense'
                        ? 'e.g. Rent for September'
                        : 'e.g. Owner added capital'
                    }
                    placeholderTextColor={tokens.text3}
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
                  {
                    backgroundColor:
                      entryTab === 'expense' ? '#EF4444' : '#10B981',
                  },
                  saving && styles.btnDisabled,
                ]}
                onPress={handleSubmit}
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

// Import shadows for the tab button
import {shadows} from '../theme';

const styles = StyleSheet.create({
  container: {flex: 1},
  loadingContainer: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  header: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.lg,
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

  // Balance card
  balanceCard: {
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  balanceLabel: {
    ...typeScale.tiny,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  balanceValue: {
    fontSize: 32,
    fontWeight: '700',
    marginTop: spacing.xs,
    fontVariant: ['tabular-nums'],
  },
  destRow: {
    flexDirection: 'row',
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  destItem: {flex: 1},
  destIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  destLabel: {...typeScale.tiny},
  destValue: {
    ...typeScale.body,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },

  // Quick actions
  quickActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  actionLabel: {...typeScale.body, fontWeight: '600'},

  // Info
  infoText: {
    ...typeScale.caption,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },

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
    marginBottom: spacing.md,
  },
  tabChooser: {
    flexDirection: 'row',
    marginHorizontal: spacing.xl,
    marginBottom: spacing.md,
    backgroundColor: 'transparent',
    borderRadius: radii.md,
    padding: 2,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: radii.sm,
    alignItems: 'center',
  },
  tabText: {...typeScale.body, fontWeight: '600'},
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
  input: {flex: 1, ...typeScale.body},
  destPicker: {flexDirection: 'row', gap: spacing.sm},
  destOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  destOptionText: {...typeScale.caption, fontWeight: '600'},
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
