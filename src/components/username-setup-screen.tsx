import { Image } from 'expo-image';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  isUsernameAvailable,
  normalizeUsername,
  setPublicUsername,
  usernameValidationError,
} from '@/services/social';

export function UsernameSetupScreen({
  displayName,
  onComplete,
}: {
  displayName: string | null;
  onComplete: (username: string) => void;
}) {
  const theme = useTheme();
  const [username, setUsername] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    const normalized = normalizeUsername(username);
    const validationError = usernameValidationError(normalized);
    if (validationError) {
      setError(validationError);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (!(await isUsernameAvailable(normalized))) {
        throw new Error('Username già in uso.');
      }
      const savedUsername = await setPublicUsername(normalized);
      onComplete(savedUsername);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossibile salvare lo username');
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
            contentFit="contain"
            style={styles.logo}
          />
          <ThemedText type="subtitle" style={styles.centerText}>
            Scegli il tuo username
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.centerText}>
            {displayName ? `${displayName}, ` : ''}
            servirà agli altri utenti per trovarti e condividere titoli con te.
          </ThemedText>
        </View>

        <ThemedView type="backgroundElement" style={styles.form}>
          <TextInput
            value={username}
            onChangeText={setUsername}
            placeholder="username"
            placeholderTextColor={theme.textSecondary}
            style={[styles.input, { color: theme.text }]}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={24}
            onSubmitEditing={save}
          />
          <ThemedText type="small" themeColor="textSecondary">
            3-24 caratteri: lettere minuscole, numeri e underscore.
          </ThemedText>

          {error && (
            <ThemedText type="small" style={styles.error}>
              {error}
            </ThemedText>
          )}

          <Pressable
            onPress={save}
            disabled={busy}
            style={({ pressed }) => [
              styles.button,
              pressed && styles.pressed,
              busy && styles.disabled,
            ]}>
            {busy ? (
              <ActivityIndicator color={Brand.pureWhite} />
            ) : (
              <ThemedText type="smallBold" style={styles.buttonText}>
                Continua
              </ThemedText>
            )}
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
    maxWidth: 460,
    justifyContent: 'center',
    gap: Spacing.four,
    paddingHorizontal: Spacing.four,
  },
  hero: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: Spacing.four,
  },
  centerText: {
    textAlign: 'center',
  },
  form: {
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: Spacing.four,
  },
  input: {
    minHeight: 48,
    fontSize: 16,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  button: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Spacing.three,
    backgroundColor: Brand.glowBlue,
  },
  buttonText: {
    color: Brand.pureWhite,
  },
  error: {
    color: Brand.sunsetOrange,
  },
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.6,
  },
});
