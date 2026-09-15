/**
 * LoginScreen — modern card-based login with accent branding.
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
import {Mail, Lock, LogIn, Eye, EyeOff} from 'lucide-react-native';

export default function LoginScreen() {
  const {tokens} = useTheme();
  const {login} = useAuth();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Required', 'Enter email and password');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      Alert.alert(
        'Login failed',
        err instanceof Error ? err.message : 'Invalid credentials',
      );
    } finally {
      setLoading(false);
    }
  };

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
              <Text
                style={{
                  fontSize: 28,
                  fontWeight: '800',
                  color: tokens.navAccent,
                }}>
                S
              </Text>
            </View>
            <Text style={[typeScale.display, {color: tokens.text}]}>Shelf</Text>
            <Text style={[typeScale.body, {color: tokens.text3, marginTop: 4}]}>
              Point of Sale
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
            <Text
              style={[
                typeScale.heading,
                {color: tokens.text, marginBottom: spacing.xl},
              ]}>
              Sign in
            </Text>

            {/* Email */}
            <View style={{marginBottom: spacing.md}}>
              <Text
                style={[
                  typeScale.caption,
                  {color: tokens.text3, marginBottom: 6, fontWeight: '600'},
                ]}>
                Email
              </Text>
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
                }}>
                <Mail size={18} color={tokens.text3} strokeWidth={1.75} />
                <TextInput
                  style={{flex: 1, ...typeScale.body, color: tokens.text}}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  placeholderTextColor={tokens.text3}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />
              </View>
            </View>

            {/* Password */}
            <View style={{marginBottom: spacing.xl}}>
              <Text
                style={[
                  typeScale.caption,
                  {color: tokens.text3, marginBottom: 6, fontWeight: '600'},
                ]}>
                Password
              </Text>
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
                }}>
                <Lock size={18} color={tokens.text3} strokeWidth={1.75} />
                <TextInput
                  style={{flex: 1, ...typeScale.body, color: tokens.text}}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Your password"
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
            </View>

            {/* Sign in button */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleLogin}
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
                <LogIn size={18} color="#fff" strokeWidth={2} />
              )}
              <Text
                style={{
                  color: '#fff',
                  ...typeScale.body,
                  fontWeight: '700',
                }}>
                {loading ? 'Signing in...' : 'Sign in'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
