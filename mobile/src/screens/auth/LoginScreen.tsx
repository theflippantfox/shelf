/**
 * LoginScreen — email + password authentication.
 */
import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {useTheme} from '../../components/ThemeProvider';
import {typeScale} from '../../theme';
import {useAuth} from '../../components/AuthProvider';

export default function LoginScreen({navigation}: {navigation: any}) {
  const {tokens} = useTheme();
  const {login, error, clearError} = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Missing fields', 'Please enter your email and password.');
      return;
    }

    setLoading(true);
    clearError();
    try {
      await login(email.trim().toLowerCase(), password);
    } catch {
      // Error is set in AuthProvider
    } finally {
      setLoading(false);
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
      marginBottom: 48,
    },
    logo: {
      fontSize: 42,
      fontWeight: '800' as const,
      color: tokens.navAccent,
      letterSpacing: -1,
    },
    subtitle: {
      ...typeScale.body,
      color: tokens.text3,
      marginTop: 8,
    },
    form: {
      gap: 16,
    },
    inputGroup: {
      gap: 6,
    },
    label: {
      ...typeScale.caption,
      fontWeight: '600' as const,
      color: tokens.text3,
      textTransform: 'uppercase' as const,
      letterSpacing: 0.5,
    },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: tokens.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: tokens.border,
    },
    input: {
      flex: 1,
      paddingVertical: 14,
      paddingHorizontal: 16,
      ...typeScale.body,
      color: tokens.text,
    },
    eyeButton: {
      paddingHorizontal: 16,
    },
    eyeText: {
      fontSize: 16,
      color: tokens.text3,
    },
    errorText: {
      ...typeScale.caption,
      color: '#EF4444',
      textAlign: 'center',
      marginBottom: 8,
    },
    loginButton: {
      backgroundColor: tokens.navAccent,
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: 'center',
      marginTop: 8,
    },
    loginButtonDisabled: {
      opacity: 0.6,
    },
    loginButtonText: {
      ...typeScale.body,
      fontWeight: '700' as const,
      color: '#fff',
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginTop: 24,
    },
    footerText: {
      ...typeScale.body,
      color: tokens.text3,
    },
    linkText: {
      ...typeScale.body,
      color: tokens.navAccent,
      fontWeight: '600' as const,
    },
  });

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>Shëlf</Text>
          <Text style={styles.subtitle}>Point of Sale</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="you@shop.com"
                placeholderTextColor={tokens.text3}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                editable={!loading}
              />
            </View>
          </View>

          {/* Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={tokens.text3}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoComplete="password"
                editable={!loading}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}>
                <Text style={styles.eyeText}>{showPassword ? '🙈' : '👁'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Error */}
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.loginButton, loading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.loginButtonText}>Sign In</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>New here? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.linkText}>Create account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
