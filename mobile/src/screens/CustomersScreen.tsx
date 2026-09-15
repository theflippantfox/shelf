/**
 * CustomersScreen — customer list with search, tiers, and add form.
 */
import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
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
  PageHeadingBlock,
} from '../components/ui';
import {spacing, radii, typeScale} from '../theme';
import {Users, Plus, User, Phone, Mail, X, Search} from 'lucide-react-native';

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
  const navigation = useNavigation();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
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
    }
  }, [shop]);

  useEffect(() => {
    load();
  }, [load]);

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

  const renderCustomer = (item: Customer) => {
    const tier = getTier(item);
    return (
      <Card
        key={item.id}
        onPress={() =>
          navigation.navigate(
            'CustomerDetail' as never,
            {customerId: item.id, customerName: item.name} as never,
          )
        }
        variant="outlined"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: spacing.md,
          marginBottom: spacing.sm,
        }}>
        {/* Avatar */}
        <Avatar name={item.name} size={42} />

        {/* Info */}
        <View style={{flex: 1, marginLeft: spacing.md}}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm,
              marginBottom: 2,
            }}>
            <Text
              style={[
                typeScale.title,
                {color: tokens.text, fontWeight: '600', flex: 1},
              ]}
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
              size="sm"
            />
          </View>
          <Text style={[typeScale.caption, {color: tokens.text3}]}>
            {item.phone ?? item.email ?? 'No contact'}{' '}
            {item.visit_count > 0 ? `· ${item.visit_count} visits` : ''}
          </Text>
        </View>

        {/* Total spent */}
        <View style={{alignItems: 'flex-end', marginLeft: spacing.sm}}>
          <Text
            style={[
              typeScale.heading,
              {color: tokens.text, fontWeight: '700'},
            ]}>
            {shop ? formatPrice(item.total_spent, shop) : '₹0'}
          </Text>
          <Text style={[typeScale.tiny, {color: tokens.text3}]}>spent</Text>
        </View>
      </Card>
    );
  };

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: tokens.bg,
          justifyContent: 'center',
          alignItems: 'center',
        }}>
        <ActivityIndicator size="large" color={tokens.navAccent} />
      </View>
    );
  }

  return (
    <View style={{flex: 1, backgroundColor: tokens.bg}}>
      <ScrollView
        style={{flex: 1}}
        contentContainerStyle={{
          paddingTop: spacing.xxl + spacing.lg,
          paddingBottom: spacing.xxxl,
        }}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: spacing.xl,
            marginBottom: spacing.md,
          }}>
          <PageHeadingBlock heading="Customers" eyebrow={shop?.name ?? ''} />
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              resetForm();
              setShowAdd(true);
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm + 2,
              borderRadius: radii.lg,
              backgroundColor: tokens.navAccent,
            }}>
            <Plus size={18} color="#fff" strokeWidth={2.5} />
            <Text
              style={{
                ...typeScale.caption,
                color: '#fff',
                fontWeight: '600',
              }}>
              Add
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={{paddingHorizontal: spacing.xl, marginBottom: spacing.lg}}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: tokens.surface,
              borderColor: tokens.border,
              borderWidth: 1,
              borderRadius: radii.lg,
              paddingHorizontal: 14,
              height: 48,
              gap: 8,
            }}>
            <Search size={16} color={tokens.text3} strokeWidth={1.75} />
            <TextInput
              style={{
                flex: 1,
                ...typeScale.body,
                color: tokens.text,
                paddingVertical: 0,
              }}
              value={search}
              onChangeText={setSearch}
              placeholder="Search by name or phone..."
              placeholderTextColor={tokens.text3}
            />
            {search ? (
              <TouchableOpacity onPress={() => setSearch('')}>
                <X size={14} color={tokens.text3} strokeWidth={2} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* Customers list */}
        {filtered.length === 0 ? (
          <View style={{paddingHorizontal: spacing.xl}}>
            <EmptyState
              icon={<Users size={48} color={tokens.text3} strokeWidth={1} />}
              title={search ? 'No customers found' : 'No customers yet'}
              subtitle={
                search
                  ? 'Try a different search term'
                  : 'Add your first customer to get started'
              }
            />
          </View>
        ) : (
          <View style={{paddingHorizontal: spacing.xl}}>
            {filtered.map(item => renderCustomer(item))}
          </View>
        )}
      </ScrollView>

      {/* Add Customer Modal */}
      <Modal
        visible={showAdd}
        animationType="slide"
        presentationStyle="pageSheet">
        <KeyboardAvoidingView
          style={{flex: 1, backgroundColor: tokens.bg}}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={{flex: 1}}>
            {/* Modal header */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: spacing.xl,
                borderBottomWidth: 1,
                borderBottomColor: tokens.border,
              }}>
              <Text style={[typeScale.heading, {color: tokens.text}]}>
                Add Customer
              </Text>
              <TouchableOpacity onPress={() => setShowAdd(false)}>
                <X size={24} color={tokens.text3} strokeWidth={2} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{flex: 1}}
              contentContainerStyle={{padding: spacing.xl, gap: spacing.lg}}>
              {/* Name */}
              <View>
                <Text
                  style={[
                    typeScale.caption,
                    {color: tokens.text2, marginBottom: 6, fontWeight: '600'},
                  ]}>
                  Name *
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: tokens.surface,
                    borderColor: tokens.border,
                    borderWidth: 1,
                    borderRadius: radii.lg,
                    paddingHorizontal: 14,
                    height: 48,
                    gap: 8,
                  }}>
                  <User size={16} color={tokens.text3} strokeWidth={1.75} />
                  <TextInput
                    style={{
                      flex: 1,
                      ...typeScale.body,
                      color: tokens.text,
                      paddingVertical: 0,
                    }}
                    value={formName}
                    onChangeText={setFormName}
                    placeholder="Full name"
                    placeholderTextColor={tokens.text3}
                  />
                </View>
              </View>

              {/* Phone */}
              <View>
                <Text
                  style={[
                    typeScale.caption,
                    {color: tokens.text2, marginBottom: 6, fontWeight: '600'},
                  ]}>
                  Phone
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: tokens.surface,
                    borderColor: tokens.border,
                    borderWidth: 1,
                    borderRadius: radii.lg,
                    paddingHorizontal: 14,
                    height: 48,
                    gap: 8,
                  }}>
                  <Phone size={16} color={tokens.text3} strokeWidth={1.75} />
                  <TextInput
                    style={{
                      flex: 1,
                      ...typeScale.body,
                      color: tokens.text,
                      paddingVertical: 0,
                    }}
                    value={formPhone}
                    onChangeText={setFormPhone}
                    placeholder="Phone number"
                    placeholderTextColor={tokens.text3}
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              {/* Email */}
              <View>
                <Text
                  style={[
                    typeScale.caption,
                    {color: tokens.text2, marginBottom: 6, fontWeight: '600'},
                  ]}>
                  Email
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: tokens.surface,
                    borderColor: tokens.border,
                    borderWidth: 1,
                    borderRadius: radii.lg,
                    paddingHorizontal: 14,
                    height: 48,
                    gap: 8,
                  }}>
                  <Mail size={16} color={tokens.text3} strokeWidth={1.75} />
                  <TextInput
                    style={{
                      flex: 1,
                      ...typeScale.body,
                      color: tokens.text,
                      paddingVertical: 0,
                    }}
                    value={formEmail}
                    onChangeText={setFormEmail}
                    placeholder="Email address"
                    placeholderTextColor={tokens.text3}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              {/* Notes */}
              <View>
                <Text
                  style={[
                    typeScale.caption,
                    {color: tokens.text2, marginBottom: 6, fontWeight: '600'},
                  ]}>
                  Notes
                </Text>
                <View
                  style={{
                    backgroundColor: tokens.surface,
                    borderColor: tokens.border,
                    borderWidth: 1,
                    borderRadius: radii.lg,
                    padding: 14,
                  }}>
                  <TextInput
                    style={{
                      ...typeScale.body,
                      color: tokens.text,
                      minHeight: 80,
                      textAlignVertical: 'top',
                    }}
                    value={formNotes}
                    onChangeText={setFormNotes}
                    placeholder="Optional notes..."
                    placeholderTextColor={tokens.text3}
                    multiline
                  />
                </View>
              </View>
            </ScrollView>

            {/* Footer */}
            <View
              style={{
                flexDirection: 'row',
                gap: spacing.sm,
                padding: spacing.xl,
                borderTopWidth: 1,
                borderTopColor: tokens.border,
              }}>
              <Button
                label="Cancel"
                onPress={() => setShowAdd(false)}
                variant="secondary"
                style={{flex: 1}}
              />
              <Button
                label={saving ? 'Adding...' : 'Add Customer'}
                onPress={handleAdd}
                disabled={saving || !formName.trim()}
                style={{flex: 1}}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
