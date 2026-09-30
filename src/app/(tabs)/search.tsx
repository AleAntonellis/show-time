import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TitleCard } from '@/components/title-card';
import {
  BottomTabInset,
  Brand,
  MaxContentWidth,
  Spacing,
  WebTabTopInset,
} from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useTheme } from '@/hooks/use-theme';
import { addToLibrary, getSavedKeys } from '@/services/library';
import { isTmdbConfigured, searchTitles, type Title } from '@/services/tmdb';

const NUM_COLUMNS = 3;

export default function SearchTabScreen() {
  const theme = useTheme();
  const safeAreaInsets = useSafeAreaInsets();
  const { session, configured: supabaseConfigured } = useAuth();
  const configured = useMemo(() => isTmdbConfigured(), []);
  const canSave = supabaseConfigured && Boolean(session);

  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query, 400);

  const [results, setResults] = useState<Title[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set());
  const [savingKey, setSavingKey] = useState<string | null>(null);

  useEffect(() => {
    if (!canSave) {
      setSavedKeys(new Set());
      return;
    }
    let cancelled = false;
    getSavedKeys()
      .then((keys) => {
        if (!cancelled) {
          setSavedKeys(keys);
        }
      })
      .catch(() => {
        /* la libreria si aggiornerà al prossimo salvataggio */
      });
    return () => {
      cancelled = true;
    };
  }, [canSave]);

  async function handleSave(title: Title) {
    const key = `${title.mediaType}-${title.id}`;
    setSavingKey(key);
    try {
      await addToLibrary(title, 'to_watch');
      setSavedKeys((prev) => new Set(prev).add(key));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossibile salvare il titolo');
    } finally {
      setSavingKey(null);
    }
  }

  useEffect(() => {
    if (!configured) {
      return;
    }
    const trimmed = debouncedQuery.trim();
    if (!trimmed) {
      setResults([]);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    searchTitles(trimmed)
      .then((items) => {
        if (!cancelled) {
          setResults(items);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setResults([]);
          setError(err instanceof Error ? err.message : 'Errore durante la ricerca');
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
  }, [debouncedQuery, configured]);

  const topInset =
    Platform.OS === 'web' ? WebTabTopInset : safeAreaInsets.top + Spacing.three;
  const bottomInset = safeAreaInsets.bottom + BottomTabInset + Spacing.four;

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.content, { paddingTop: topInset }]}>
        <ThemedText type="subtitle" style={styles.heading}>
          Cerca
        </ThemedText>

        <ThemedView type="backgroundElement" style={styles.searchBar}>
          <ThemedText type="small" themeColor="textSecondary">
            🔎
          </ThemedText>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Cerca film o serie TV…"
            placeholderTextColor={theme.textSecondary}
            style={[styles.input, { color: theme.text }]}
            autoCorrect={false}
            returnKeyType="search"
            editable={configured}
          />
        </ThemedView>

        {!configured ? (
          <StateMessage
            title="TMDB non configurato"
            body={
              'Aggiungi la tua chiave in .env.local\n' +
              '(EXPO_PUBLIC_TMDB_ACCESS_TOKEN) e riavvia il server.'
            }
          />
        ) : loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator color={Brand.glowBlue} />
          </View>
        ) : error ? (
          <StateMessage title="Ops" body={error} />
        ) : results.length === 0 ? (
          <StateMessage
            title={debouncedQuery.trim() ? 'Nessun risultato' : 'Inizia a digitare'}
            body={
              debouncedQuery.trim()
                ? 'Prova con un altro titolo.'
                : 'Cerca un film o una serie per aggiungerlo alle tue liste.'
            }
          />
        ) : (
          <FlatList
            showsVerticalScrollIndicator={false}
            data={results}
            keyExtractor={(item) => `${item.mediaType}-${item.id}`}
            numColumns={NUM_COLUMNS}
            columnWrapperStyle={styles.row}
            contentContainerStyle={[styles.grid, { paddingBottom: bottomInset }]}
            renderItem={({ item }) => {
              const key = `${item.mediaType}-${item.id}`;
              return (
                <View style={styles.cell}>
                  <TitleCard
                    title={item}
                    saved={savedKeys.has(key)}
                    busy={savingKey === key}
                    onOpen={() =>
                      router.push({
                        pathname: '/title',
                        params: {
                          mediaType: item.mediaType,
                          id: String(item.id),
                          from: '/search',
                        },
                      })
                    }
                    onSave={canSave ? () => handleSave(item) : undefined}
                  />
                </View>
              );
            }}
            keyboardShouldPersistTaps="handled"
          />
        )}
      </View>
    </ThemedView>
  );
}

function StateMessage({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.centerState}>
      <ThemedText type="smallBold" style={styles.centerText}>
        {title}
      </ThemedText>
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
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
  heading: {
    textAlign: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Spacing.four,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: Spacing.one,
  },
  grid: {
    gap: Spacing.three,
    paddingTop: Spacing.two,
  },
  row: {
    gap: Spacing.three,
  },
  cell: {
    flex: 1 / NUM_COLUMNS,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  centerText: {
    textAlign: 'center',
  },
});
