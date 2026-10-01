import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  BottomTabInset,
  Brand,
  MaxContentWidth,
  Spacing,
  WebTabTopInset,
} from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';
import type { WatchProviderRegion } from '@/services/tmdb';
import { getWatchRegion, setWatchRegion } from '@/services/watch-preferences';
import { getCachedWatchProviderRegions } from '@/services/watch-providers';

function formatUpdatedAt(timestamp: number): string {
  const elapsedMinutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
  if (elapsedMinutes < 1) {
    return 'appena aggiornato';
  }
  if (elapsedMinutes < 60) {
    return `aggiornato ${elapsedMinutes} min fa`;
  }
  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) {
    return `aggiornato ${elapsedHours} h fa`;
  }
  return `aggiornato ${Math.floor(elapsedHours / 24)} giorni fa`;
}

export default function SettingsTabScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { configured, session } = useAuth();
  const [region, setRegion] = useState<string | null>(null);
  const [regions, setRegions] = useState<WatchProviderRegion[]>([]);
  const [regionsUpdatedAt, setRegionsUpdatedAt] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingRegion, setSavingRegion] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!configured || !session) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    setWarning(null);
    try {
      const [savedRegion, regionsResult] = await Promise.all([
        getWatchRegion(),
        getCachedWatchProviderRegions(),
      ]);
      setRegion(savedRegion);
      setRegions(regionsResult.value);
      setRegionsUpdatedAt(regionsResult.updatedAt);
      setWarning(regionsResult.warning);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Impossibile caricare le impostazioni',
      );
    } finally {
      setLoading(false);
    }
  }, [configured, session]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const selectedRegion = regions.find((item) => item.code === region);
  const filteredRegions = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('it');
    if (!normalized) {
      return [];
    }
    return regions
      .filter(
        (item) =>
          item.code.toLocaleLowerCase('it').includes(normalized) ||
          item.name.toLocaleLowerCase('it').includes(normalized),
      )
      .slice(0, 30);
  }, [query, regions]);
  const topInset =
    Platform.OS === 'web' ? WebTabTopInset : insets.top + Spacing.three;
  const bottomInset = insets.bottom + BottomTabInset + Spacing.four;

  if (configured && !session) {
    return null;
  }

  async function refreshRegions() {
    if (refreshing) {
      return;
    }
    setRefreshing(true);
    setError(null);
    setWarning(null);
    try {
      const result = await getCachedWatchProviderRegions(true);
      setRegions(result.value);
      setRegionsUpdatedAt(result.updatedAt);
      setWarning(result.warning);
      setFeedback('Elenco dei paesi aggiornato.');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Impossibile aggiornare i paesi',
      );
    } finally {
      setRefreshing(false);
    }
  }

  async function chooseRegion(nextRegion: WatchProviderRegion) {
    if (savingRegion || nextRegion.code === region) {
      return;
    }
    setSavingRegion(nextRegion.code);
    setError(null);
    setFeedback(null);
    try {
      const saved = await setWatchRegion(nextRegion.code);
      setRegion(saved);
      setQuery('');
      setFeedback(`Paese impostato su ${nextRegion.name}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossibile salvare il paese');
    } finally {
      setSavingRegion(null);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.content,
          { paddingTop: topInset, paddingBottom: bottomInset },
        ]}>
        <ThemedView type="backgroundElement" style={styles.hero}>
          <View style={styles.heroCopy}>
            <ThemedText type="small" themeColor="textSecondary">
              Preferenze personali
            </ThemedText>
            <ThemedText type="subtitle" style={styles.heroTitle}>
              Impostazioni
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Personalizza ShowTime senza rendere pubbliche le tue preferenze.
            </ThemedText>
          </View>
        </ThemedView>

        {!configured ? (
          <StateMessage
            title="Supabase non configurato"
            body="Configura Supabase per salvare le impostazioni."
          />
        ) : loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={Brand.glowBlue} />
          </View>
        ) : error && !region ? (
          <StateMessage title="Impostazioni non disponibili" body={error} />
        ) : (
          <ThemedView type="backgroundElement" style={styles.section}>
            <View style={styles.sectionHeading}>
              <View style={styles.sectionCopy}>
                <ThemedText type="smallBold">Dove guardarlo</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Disponibilità streaming, noleggio e acquisto per il paese scelto.
                </ThemedText>
              </View>
              <View style={styles.privateBadge}>
                <ThemedText type="smallBold" style={styles.privateText}>
                  Privato
                </ThemedText>
              </View>
            </View>

            <ThemedView type="backgroundSelected" style={styles.currentRegion}>
              <View style={styles.currentCopy}>
                <ThemedText type="small" themeColor="textSecondary">
                  Paese attuale
                </ThemedText>
                <ThemedText type="smallBold">
                  {selectedRegion?.name ?? region} · {region}
                </ThemedText>
                {regionsUpdatedAt != null && (
                  <ThemedText type="small" themeColor="textSecondary">
                    Elenco {formatUpdatedAt(regionsUpdatedAt)}
                  </ThemedText>
                )}
              </View>
              <Pressable
                onPress={refreshRegions}
                disabled={refreshing}
                style={({ pressed }) => [
                  styles.refreshButton,
                  pressed && styles.pressed,
                ]}>
                {refreshing ? (
                  <ActivityIndicator color={Brand.glowBlue} size="small" />
                ) : (
                  <ThemedText type="smallBold" style={styles.refreshText}>
                    Aggiorna
                  </ThemedText>
                )}
              </Pressable>
            </ThemedView>

            <View style={styles.search}>
              <ThemedText type="smallBold">Cambia paese</ThemedText>
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Cerca Italia, Francia, US…"
                placeholderTextColor={theme.textSecondary}
                autoCapitalize="words"
                autoCorrect={false}
                style={[styles.input, { color: theme.text }]}
              />
              {!query.trim() && (
                <ThemedText type="small" themeColor="textSecondary">
                  Digita il nome o il codice di un paese supportato da TMDB.
                </ThemedText>
              )}
            </View>

            {query.trim().length > 0 && filteredRegions.length === 0 && (
              <ThemedText type="small" themeColor="textSecondary">
                Nessun paese trovato.
              </ThemedText>
            )}

            {filteredRegions.length > 0 && (
              <View style={styles.results}>
                {filteredRegions.map((item) => {
                  const active = item.code === region;
                  const saving = savingRegion === item.code;
                  return (
                    <Pressable
                      key={item.code}
                      onPress={() => chooseRegion(item)}
                      disabled={active || savingRegion != null}
                      style={({ pressed }) => [
                        styles.regionRow,
                        active && styles.regionRowActive,
                        pressed && styles.pressed,
                      ]}>
                      <View style={styles.regionCopy}>
                        <ThemedText type="smallBold">{item.name}</ThemedText>
                        <ThemedText type="small" themeColor="textSecondary">
                          {item.code}
                        </ThemedText>
                      </View>
                      {saving ? (
                        <ActivityIndicator color={Brand.glowBlue} size="small" />
                      ) : active ? (
                        <ThemedText type="smallBold" style={styles.selectedText}>
                          Selezionato
                        </ThemedText>
                      ) : (
                        <ThemedText type="small" themeColor="textSecondary">
                          Scegli
                        </ThemedText>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            )}

            {feedback && (
              <ThemedText type="small" style={styles.feedback}>
                {feedback}
              </ThemedText>
            )}
            {warning && (
              <ThemedText type="small" style={styles.warning}>
                {warning}
              </ThemedText>
            )}
            {error && (
              <ThemedText type="small" style={styles.error}>
                {error}
              </ThemedText>
            )}
          </ThemedView>
        )}
      </ScrollView>
    </ThemedView>
  );
}

function StateMessage({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.center}>
      <ThemedText type="smallBold">{title}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.centerText}>
        {body}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
  hero: {
    padding: Spacing.four,
    borderRadius: Spacing.four,
  },
  heroCopy: {
    gap: Spacing.one,
  },
  heroTitle: {
    fontSize: 30,
    lineHeight: 36,
  },
  section: {
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  sectionCopy: {
    flex: 1,
    gap: Spacing.half,
  },
  privateBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.three,
    backgroundColor: 'rgba(106,76,255,0.18)',
  },
  privateText: {
    color: Brand.softViolet,
  },
  currentRegion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  currentCopy: {
    flex: 1,
    gap: Spacing.half,
  },
  refreshButton: {
    minWidth: 88,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Spacing.three,
    backgroundColor: 'rgba(47,107,255,0.16)',
  },
  refreshText: {
    color: Brand.glowBlue,
  },
  search: {
    gap: Spacing.two,
  },
  input: {
    minHeight: 44,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  results: {
    gap: Spacing.two,
  },
  regionRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  regionRowActive: {
    backgroundColor: 'rgba(47,107,255,0.14)',
  },
  regionCopy: {
    flex: 1,
    gap: Spacing.half,
  },
  selectedText: {
    color: Brand.glowBlue,
  },
  feedback: {
    color: Brand.glowBlue,
    textAlign: 'center',
  },
  warning: {
    color: Brand.sunsetOrange,
    textAlign: 'center',
  },
  error: {
    color: Brand.sunsetOrange,
    textAlign: 'center',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.six,
  },
  centerText: {
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.8,
  },
});
