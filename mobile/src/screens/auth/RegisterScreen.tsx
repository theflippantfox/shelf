/**
 * RegisterScreen — create a new account.
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

export default function RegisterScreen({navigation}: {navigation: any}) {
  const {tokens} = useTheme();
  const {register, error, clearError} = useAuth();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleRegister = async () => {
    if (!firstName.trim() || !email.trim() || !password) {
      Alert.alert(
        'Missing fields',
        'Please fill in your name, email, and password.',
      );
      return;
    }
    if (password.length < 8) {
      Alert.alert(
        'Password too short',
        'Password must be at least 8 characters.',
      );
      return;
    }
    if (password !== confirm) {
      Alert.alert("Passwords don't match", 'Please re-enter your password.');
      return;
    }

    setLoading(true);
    clearError();
    try {
      await register(
        firstName.trim(),
        lastName.trim(),
        email.trim().toLowerCase(),
        password,
      );
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
      marginBottom: 36,
    },
    logo: {
      fontSize: 36,
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
      gap: 14,
    },
    row: {
      flexDirection: 'row',
      gap: 12,
    },
    inputGroup: {
      flex: 1,
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
      marginBottom: 4,
    },
    registerButton: {
      backgroundColor: tokens.navAccent,
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: 'center',
      marginTop: 8,
    },
    registerButtonDisabled: {
      opacity: 0.6,
    },
    registerButtonText: {
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
        <View style={styles.header}>
          <Text style={styles.logo}>Create Account</Text>
          <Text style={styles.subtitle}>Set up your Shëlf workspace</Text>
        </View>

        <View style={styles.form}>
          {/* Name row */}
          <View style={styles.row}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>First Name</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="Jane"
                  placeholderTextColor={tokens.text3}
                  autoCapitalize="words"
                  editable={!loading}
                />
              </View>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Last Name</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Smith"
                  placeholderTextColor={tokens.text3}
                  autoCapitalize="words"
                  editable={!loading}
                />
              </View>
            </View>
          </View>

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
                placeholder="8+ characters"
                placeholderTextColor={tokens.text3}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                editable={!loading}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}>
                <Text style={styles.eyeText}>{showPassword ? '🙈' : '👁'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Confirm Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirm Password</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                value={confirm}
                onChangeText={setConfirm}
                placeholder="Re-enter password"
                placeholderTextColor={tokens.text3}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                editable={!loading}
              />
            </View>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[
              styles.registerButton,
              loading && styles.registerButtonDisabled,
            ]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.8}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.registerButtonText}>Create Account</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.linkText}>Sign in</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
