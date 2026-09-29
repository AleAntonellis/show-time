import { Image } from 'expo-image';
import { Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Brand, MaxContentWidth, Spacing } from '@/constants/theme';

export default function HomeScreen() {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.heroSection}>
          <Image
            source={require('@/assets/images/showtime-logo.png')}
            style={styles.logo}
            contentFit="contain"
          />
          <ThemedText type="subtitle" style={styles.tagline}>
            La tua serata sul divano, organizzata.
          </ThemedText>
        </ThemedView>

        <ThemedView type="backgroundElement" style={styles.card}>
          <ThemedText type="smallBold">🎬 Prossimi passi</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Catalogo personale, lista “Da vedere”, storico visioni e reminder.
          </ThemedText>
          <ThemedText type="small" themeColor="accent">
            Scaffold pronto — iniziamo a costruire le funzionalità.
          </ThemedText>
        </ThemedView>

        {Platform.OS === 'web' && (
          <ThemedText type="small" themeColor="textSecondary">
            Suggerimento: “Aggiungi a Home” per installarla come app.
          </ThemedText>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    flexDirection: 'row',
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    gap: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.three,
    maxWidth: MaxContentWidth,
  },
  heroSection: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
  logo: {
    width: 220,
    height: 220,
    borderRadius: Spacing.four,
  },
  tagline: {
    textAlign: 'center',
    color: Brand.pureWhite,
  },
  card: {
    gap: Spacing.two,
    alignSelf: 'stretch',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.four,
    borderRadius: Spacing.four,
  },
});
