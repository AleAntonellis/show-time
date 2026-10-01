import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import Head from 'expo-router/head';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, useColorScheme, View } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AuthScreen } from '@/components/auth-screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { UsernameSetupScreen } from '@/components/username-setup-screen';
import { Brand } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/hooks/use-auth';
import { getMyPublicAccount, type PublicAccount } from '@/services/social';

SplashScreen.preventAutoHideAsync();

function AuthGate() {
  const { session, loading, configured } = useAuth();

  if (configured && loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={Brand.glowBlue} />
      </View>
    );
  }

  if (configured && !session) {
    return <AuthScreen />;
  }

  return session ? (
    <UsernameGate key={session.user.id}>
      <Stack screenOptions={{ headerShown: false }} />
    </UsernameGate>
  ) : (
    <Stack screenOptions={{ headerShown: false }} />
  );
}

function UsernameGate({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<PublicAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getMyPublicAccount()
      .then((nextAccount) => {
        if (!cancelled) {
          setAccount(nextAccount);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Impossibile caricare il profilo',
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [retryKey]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={Brand.glowBlue} />
      </View>
    );
  }
  if (error) {
    return (
      <ThemedView
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          padding: 24,
        }}>
        <ThemedText type="smallBold">Impossibile caricare il profilo</ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center' }}>
          {error}
        </ThemedText>
        <Pressable
          onPress={() => {
            setLoading(true);
            setError(null);
            setRetryKey((value) => value + 1);
          }}>
          <ThemedText type="smallBold" style={{ color: Brand.glowBlue }}>
            Riprova
          </ThemedText>
        </Pressable>
      </ThemedView>
    );
  }
  if (account && !account.username) {
    return (
      <UsernameSetupScreen
        displayName={account.displayName}
        onComplete={(username) => setAccount({ ...account, username })}
      />
    );
  }
  return children;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Head>
        <title>ShowTime</title>
      </Head>
      <AuthProvider>
        <AnimatedSplashOverlay />
        <AuthGate />
      </AuthProvider>
    </ThemeProvider>
  );
}
