import { Image } from 'expo-image';
import { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';

export function AuthScreen() {
  const theme = useTheme();
  const { signIn, signUp } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const isSignup = mode === 'signup';

  async function submit() {
    setError(null);
    setInfo(null);
    if (!email.trim() || !password) {
      setError('Inserisci email e password.');
      return;
    }
    setBusy(true);
    try {
      if (isSignup) {
        await signUp(email.trim(), password, displayName.trim() || email.split('@')[0]);
        setInfo('Registrazione completata. Se richiesto, conferma la mail, poi accedi.');
        setMode('signin');
      } else {
        await signIn(email.trim(), password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Qualcosa è andato storto.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.hero}>
          <Image
            source={require('@/assets/images/showtime-logo.png')}
            style={styles.logo}
            contentFit="contain"
          />
          <ThemedText type="small" themeColor="textSecondary" style={styles.centerText}>
            {isSignup ? 'Crea il tuo account' : 'Bentornato'}
          </ThemedText>
        </View>

        <ThemedView type="backgroundElement" style={styles.form}>
          {isSignup && (
            <TextInput
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Nome"
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { color: theme.text }]}
              autoCapitalize="words"
            />
          )}
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            placeholderTextColor={theme.textSecondary}
            style={[styles.input, { color: theme.text }]}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            inputMode="email"
          />
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            placeholderTextColor={theme.textSecondary}
            style={[styles.input, { color: theme.text }]}
            secureTextEntry
            autoCapitalize="none"
          />

          {error && (
            <ThemedText type="small" style={styles.error}>
              {error}
            </ThemedText>
          )}
          {info && (
            <ThemedText type="small" themeColor="textSecondary">
              {info}
            </ThemedText>
          )}

          <Pressable
            onPress={submit}
            disabled={busy}
            style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
            {busy ? (
              <ActivityIndicator color={Brand.pureWhite} />
            ) : (
              <ThemedText type="smallBold" style={styles.buttonText}>
                {isSignup ? 'Registrati' : 'Accedi'}
              </ThemedText>
            )}
          </Pressable>

          <Pressable onPress={() => setMode(isSignup ? 'signin' : 'signup')}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.centerText}>
              {isSignup ? 'Hai già un account? Accedi' : 'Non hai un account? Registrati'}
            </ThemedText>
          </Pressable>
        </ThemedView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  safeArea: {
    flex: 1,
    width: '100%',
    maxWidth: 420,
    paddingHorizontal: Spacing.four,
    justifyContent: 'center',
    gap: Spacing.five,
    ...(Platform.OS === 'web' ? { maxWidth: Math.min(420, MaxContentWidth) } : null),
  },
  hero: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  logo: {
    width: 140,
    height: 140,
    borderRadius: Spacing.four,
  },
  form: {
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: Spacing.four,
  },
  input: {
    fontSize: 16,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  button: {
    backgroundColor: Brand.glowBlue,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: Brand.pureWhite,
  },
  pressed: {
    opacity: 0.8,
  },
  error: {
    color: Brand.sunsetOrange,
  },
  centerText: {
    textAlign: 'center',
  },
});
