/**
 * RegisterScreen — modern card-based registration.
 */
import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../components/ThemeProvider';
import {useAuth} from '../../components/AuthProvider';
import {spacing, radii, shadows, typeScale} from '../../theme';
import {Mail, Lock, User, UserPlus, Eye, EyeOff} from 'lucide-react-native';

export default function RegisterScreen() {
  const {tokens} = useTheme();
  const {register} = useAuth();
  const insets = useSafeAreaInsets();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!firstName.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Required', 'First name, email, and password are required');
      return;
    }
    setLoading(true);
    try {
      await register(firstName.trim(), lastName.trim(), email.trim(), password);
      Alert.alert('Success', 'Account created. Please sign in.');
    } catch (err) {
      Alert.alert(
        'Registration failed',
        err instanceof Error ? err.message : 'Try again',
      );
    } finally {
      setLoading(false);
    }
  };

  const inputRow = (icon: React.ReactNode, props: any) => (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: tokens.surface2,
        borderRadius: radii.md,
        borderWidth: 1,
        borderColor: tokens.border,
        paddingHorizontal: spacing.md,
        height: 48,
        gap: spacing.sm,
        marginBottom: spacing.md,
      }}>
      {icon}
      <TextInput
        style={{flex: 1, ...typeScale.body, color: tokens.text}}
        placeholderTextColor={tokens.text3}
        {...props}
      />
    </View>
  );

  return (
    <View style={{flex: 1, backgroundColor: tokens.bg}}>
      <KeyboardAvoidingView
        style={{flex: 1}}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: spacing.xxl,
            paddingTop: insets.top + spacing.xxxl,
            paddingBottom: insets.bottom + spacing.xxxl,
          }}
          keyboardShouldPersistTaps="handled">
          {/* Branding */}
          <View style={{alignItems: 'center', marginBottom: spacing.xxl}}>
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
              <Text
                style={{
                  fontSize: 28,
                  fontWeight: '800',
                  color: tokens.navAccent,
                }}>
                S
              </Text>
            </View>
            <Text style={[typeScale.heading, {color: tokens.text}]}>
              Create your account
            </Text>
          </View>

          {/* Form card */}
          <View
            style={{
              width: '100%',
              maxWidth: 380,
              backgroundColor: tokens.surface,
              borderRadius: radii['2xl'],
              padding: spacing.xxl,
              borderWidth: 1,
              borderColor: tokens.border,
              ...shadows.md,
            }}>
            {inputRow(
              <User size={18} color={tokens.text3} strokeWidth={1.75} />,
              {
                value: firstName,
                onChangeText: setFirstName,
                placeholder: 'First name *',
                autoCapitalize: 'words',
              },
            )}
            {inputRow(
              <User size={18} color={tokens.text3} strokeWidth={1.75} />,
              {
                value: lastName,
                onChangeText: setLastName,
                placeholder: 'Last name',
                autoCapitalize: 'words',
              },
            )}
            {inputRow(
              <Mail size={18} color={tokens.text3} strokeWidth={1.75} />,
              {
                value: email,
                onChangeText: setEmail,
                placeholder: 'Email *',
                keyboardType: 'email-address',
                autoCapitalize: 'none',
              },
            )}

            {/* Password with toggle */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: tokens.surface2,
                borderRadius: radii.md,
                borderWidth: 1,
                borderColor: tokens.border,
                paddingHorizontal: spacing.md,
                height: 48,
                gap: spacing.sm,
                marginBottom: spacing.xl,
              }}>
              <Lock size={18} color={tokens.text3} strokeWidth={1.75} />
              <TextInput
                style={{flex: 1, ...typeScale.body, color: tokens.text}}
                value={password}
                onChangeText={setPassword}
                placeholder="Password *"
                placeholderTextColor={tokens.text3}
                secureTextEntry={!showPw}
              />
              <TouchableOpacity
                onPress={() => setShowPw(!showPw)}
                activeOpacity={0.7}
                hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
                {showPw ? (
                  <EyeOff size={18} color={tokens.text3} strokeWidth={1.75} />
                ) : (
                  <Eye size={18} color={tokens.text3} strokeWidth={1.75} />
                )}
              </TouchableOpacity>
            </View>

            {/* Register button */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleRegister}
              disabled={loading}
              style={{
                height: 48,
                backgroundColor: tokens.navAccent,
                borderRadius: radii.md,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: spacing.sm,
                opacity: loading ? 0.7 : 1,
                ...shadows.sm,
              }}>
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <UserPlus size={18} color="#fff" strokeWidth={2} />
              )}
              <Text
                style={{color: '#fff', ...typeScale.body, fontWeight: '700'}}>
                {loading ? 'Creating...' : 'Create account'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
