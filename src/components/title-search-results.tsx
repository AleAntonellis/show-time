import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { TitleCard } from '@/components/title-card';
import { Brand, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { addToLibrary, getSavedKeys } from '@/services/library';
import {
  isTmdbConfigured,
  searchCatalog,
  type CatalogSearchResult,
  type Title,
} from '@/services/tmdb';

const SEARCH_DELAY_MS = 400;
const EMPTY_RESULT: CatalogSearchResult = { titles: [], personSections: [] };

type SearchState = {
  query: string;
  result: CatalogSearchResult;
  error: string | null;
};

export function TitleSearchResults({
  query,
  onOpenTitle,
  contentContainerStyle,
  initialScrollOffset = 0,
  onScrollOffsetChange,
}: {
  query: string;
  onOpenTitle: (title: Title) => void;
  contentContainerStyle?: StyleProp<ViewStyle>;
  initialScrollOffset?: number;
  onScrollOffsetChange?: (offset: number) => void;
}) {
  const scrollerRef = useRef<ScrollView>(null);
  const restoredQueryRef = useRef<string | null>(null);
  const { session, configured: supabaseConfigured } = useAuth();
  const tmdbConfigured = useMemo(() => isTmdbConfigured(), []);
  const canSave = supabaseConfigured && Boolean(session);
  const trimmedQuery = query.trim();
  const [searchState, setSearchState] = useState<SearchState>({
    query: '',
    result: EMPTY_RESULT,
    error: null,
  });
  const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set());
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [libraryError, setLibraryError] = useState<string | null>(null);

  useEffect(() => {
    if (!canSave) {
      return;
    }
    let cancelled = false;
    getSavedKeys()
      .then((keys) => {
        if (!cancelled) {
          setSavedKeys(keys);
          setLibraryError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setLibraryError(
            err instanceof Error
              ? `Libreria non disponibile: ${err.message}`
              : 'Libreria non disponibile',
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [canSave]);

  useEffect(() => {
    if (!tmdbConfigured) {
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      if (!trimmedQuery) {
        setSearchState({ query: '', result: EMPTY_RESULT, error: null });
        return;
      }
      searchCatalog(trimmedQuery)
        .then((result) => {
          if (!cancelled) {
            setSearchState({ query: trimmedQuery, result, error: null });
          }
        })
        .catch((err: unknown) => {
          if (!cancelled) {
            setSearchState({
              query: trimmedQuery,
              result: EMPTY_RESULT,
              error: err instanceof Error ? err.message : 'Errore durante la ricerca',
            });
          }
        });
    }, SEARCH_DELAY_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [tmdbConfigured, trimmedQuery]);

  async function saveTitle(title: Title) {
    const key = `${title.mediaType}-${title.id}`;
    setSavingKey(key);
    setLibraryError(null);
    try {
      await addToLibrary(title, 'to_watch');
      setSavedKeys((previous) => new Set(previous).add(key));
    } catch (err) {
      setLibraryError(
        err instanceof Error ? err.message : 'Impossibile salvare il titolo',
      );
    } finally {
      setSavingKey(null);
    }
  }

  const waitingForQuery =
    tmdbConfigured &&
    Boolean(trimmedQuery) &&
    searchState.query !== trimmedQuery;
  const hasResults =
    searchState.result.titles.length > 0 ||
    searchState.result.personSections.length > 0;

  function restoreScrollOffset() {
    if (
      initialScrollOffset <= 0 ||
      searchState.query !== trimmedQuery ||
      restoredQueryRef.current === trimmedQuery
    ) {
      return;
    }
    scrollerRef.current?.scrollTo({
      y: initialScrollOffset,
      animated: false,
    });
    restoredQueryRef.current = trimmedQuery;
  }

  return (
    <ScrollView
      ref={scrollerRef}
      style={styles.scroller}
      contentContainerStyle={[styles.content, contentContainerStyle]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      scrollEventThrottle={100}
      onContentSizeChange={restoreScrollOffset}
      onScroll={(event) =>
        onScrollOffsetChange?.(event.nativeEvent.contentOffset.y)
      }>
      {!tmdbConfigured ? (
        <StateMessage
          title="TMDB non configurato"
          body={
            'Aggiungi EXPO_PUBLIC_TMDB_ACCESS_TOKEN in .env.local e riavvia il server.'
          }
        />
      ) : waitingForQuery ? (
        <View style={styles.centerState}>
          <ActivityIndicator color={Brand.glowBlue} />
        </View>
      ) : searchState.error ? (
        <StateMessage title="Ops" body={searchState.error} />
      ) : !trimmedQuery ? (
        <StateMessage
          title="Inizia a digitare"
          body="Cerca un titolo, un attore, un’attrice o un regista."
        />
      ) : !hasResults ? (
        <StateMessage
          title="Nessun risultato"
          body="Prova con un altro titolo o nome."
        />
      ) : (
        <>
          {libraryError && (
            <ThemedText type="small" style={styles.warning}>
              {libraryError}
            </ThemedText>
          )}

          {searchState.result.titles.length > 0 && (
            <SearchSection
              title="Titoli"
              titles={searchState.result.titles}
              savedKeys={savedKeys}
              savingKey={savingKey}
              canSave={canSave}
              onOpenTitle={onOpenTitle}
              onSaveTitle={saveTitle}
            />
          )}

          {searchState.result.personSections.map((section) => (
            <SearchSection
              key={section.id}
              title={section.title}
              subtitle={
                section.kind === 'director'
                  ? 'Crediti come regista'
                  : 'Crediti nel cast'
              }
              titles={section.titles}
              savedKeys={savedKeys}
              savingKey={savingKey}
              canSave={canSave}
              onOpenTitle={onOpenTitle}
              onSaveTitle={saveTitle}
            />
          ))}
        </>
      )}
    </ScrollView>
  );
}

function SearchSection({
  title,
  subtitle,
  titles,
  savedKeys,
  savingKey,
  canSave,
  onOpenTitle,
  onSaveTitle,
}: {
  title: string;
  subtitle?: string;
  titles: Title[];
  savedKeys: Set<string>;
  savingKey: string | null;
  canSave: boolean;
  onOpenTitle: (title: Title) => void;
  onSaveTitle: (title: Title) => void;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeading}>
        <ThemedText type="smallBold">{title}</ThemedText>
        {subtitle && (
          <ThemedText type="small" themeColor="textSecondary">
            {subtitle}
          </ThemedText>
        )}
      </View>
      <View style={styles.grid}>
        {titles.map((item) => {
          const key = `${item.mediaType}-${item.id}`;
          return (
            <View key={key} style={styles.cell}>
              <TitleCard
                title={item}
                saved={savedKeys.has(key)}
                busy={savingKey === key}
                onOpen={() => onOpenTitle(item)}
                onSave={canSave ? () => onSaveTitle(item) : undefined}
              />
            </View>
          );
        })}
      </View>
    </View>
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
  scroller: {
    flex: 1,
    width: '100%',
  },
  content: {
    flexGrow: 1,
    gap: Spacing.four,
    paddingTop: Spacing.two,
  },
  section: {
    width: '100%',
    minWidth: 0,
    gap: Spacing.two,
  },
  sectionHeading: {
    gap: Spacing.half,
  },
  grid: {
    width: '100%',
    minWidth: 0,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  cell: {
    width: '31%',
    minWidth: 0,
  },
  centerState: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.six,
  },
  centerText: {
    textAlign: 'center',
  },
  warning: {
    color: Brand.sunsetOrange,
    textAlign: 'center',
  },
});
