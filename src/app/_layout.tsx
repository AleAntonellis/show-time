import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { ActivityIndicator, useColorScheme, View } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { AuthScreen } from '@/components/auth-screen';
import { Brand } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/hooks/use-auth';

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

  return <AppTabs />;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <AnimatedSplashOverlay />
        <AuthGate />
      </AuthProvider>
    </ThemeProvider>
  );
}
