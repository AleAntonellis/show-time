import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MovieViewings } from '@/components/movie-viewings';
import {
  MovieWatchChoiceModal,
  type MovieWatchChoiceMode,
} from '@/components/movie-watch-choice-modal';
import {
  MediaFilter,
  type MediaFilterValue,
} from '@/components/media-filter';
import { SeriesEpisodes } from '@/components/series-episodes';
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
import {
  canReclassifyMovieWatch,
  getLibrary,
  MOVIE_STATUSES,
  recordMovieWatched,
  reclassifyMovieWatched,
  removeFromLibrary,
  STATUS_LABELS,
  STATUS_ORDER,
  updateStatus,
  type LibraryItem,
  type LibraryStatus,
  type MovieWatchSource,
} from '@/services/library';

export default function LibraryTabScreen() {
  const theme = useTheme();
  const safeAreaInsets = useSafeAreaInsets();
  const { session, configured, signOut } = useAuth();

  const [items, setItems] = useState<LibraryItem[]>([]);
  const [mediaFilter, setMediaFilter] = useState<MediaFilterValue>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSeries, setSelectedSeries] = useState<LibraryItem | null>(null);
  const [selectedMovie, setSelectedMovie] = useState<LibraryItem | null>(null);
  const [initialMovieRecord, setInitialMovieRecord] = useState(false);
  const [movieWatchChoice, setMovieWatchChoice] = useState<{
    item: LibraryItem;
    mode: MovieWatchChoiceMode;
  } | null>(null);

  const load = useCallback(() => {
    if (!configured || !session) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    getLibrary()
      .then(setItems)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'Impossibile caricare la libreria'),
      )
      .finally(() => setLoading(false));
  }, [configured, session]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function changeStatus(item: LibraryItem, status: LibraryStatus) {
    setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, status } : it)));
    try {
      await updateStatus(item.id, status);
    } catch {
      load();
    }
  }

  async function remove(item: LibraryItem) {
    setItems((prev) => prev.filter((it) => it.id !== item.id));
    try {
      await removeFromLibrary(item.id);
    } catch {
      load();
    }
  }

  async function markMovieWatched(
    item: LibraryItem,
    mode: MovieWatchChoiceMode,
    source: MovieWatchSource,
  ) {
    setMovieWatchChoice(null);
    setError(null);
    try {
      if (mode === 'reclassify') {
        await reclassifyMovieWatched(item, source);
      } else {
        await recordMovieWatched(item.id, source, item.importedViewings);
      }
      load();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Impossibile registrare la visione',
      );
    }
  }

  function selectMovieWatchSource(source: MovieWatchSource) {
    if (
      movieWatchChoice?.mode === 'record' &&
      source === 'tracked'
    ) {
      const item = movieWatchChoice.item;
      setMovieWatchChoice(null);
      setInitialMovieRecord(true);
      setSelectedMovie(item);
      return;
    }
    if (movieWatchChoice) {
      void markMovieWatched(
        movieWatchChoice.item,
        movieWatchChoice.mode,
        source,
      );
    }
  }

  const topInset =
    Platform.OS === 'web' ? WebTabTopInset : safeAreaInsets.top + Spacing.three;
  const bottomInset = safeAreaInsets.bottom + BottomTabInset + Spacing.four;
  const filteredItems =
    mediaFilter === 'all'
      ? items
      : items.filter((item) => item.mediaType === mediaFilter);

  if (configured && !session) {
    return null; // il gate mostra il login
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={{ width: '100%' }}
        contentContainerStyle={[
          styles.content,
          { paddingTop: topInset, paddingBottom: bottomInset },
        ]}>
        <View style={styles.headingRow}>
          <ThemedText type="subtitle" style={styles.heading}>
            La mia libreria
          </ThemedText>
          {Platform.OS !== 'web' && configured && session && (
            <Pressable onPress={() => signOut()} hitSlop={8}>
              <ThemedText type="small" themeColor="textSecondary">
                Esci
              </ThemedText>
            </Pressable>
          )}
        </View>

        <MediaFilter value={mediaFilter} onChange={setMediaFilter} />

        {!configured ? (
          <Message
            title="Supabase non configurato"
            body="Aggiungi URL e anon key in .env.local per salvare le tue liste."
          />
        ) : loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={Brand.glowBlue} />
          </View>
        ) : error ? (
          <Message title="Ops" body={error} />
        ) : items.length === 0 ? (
          <Message
            title="Libreria vuota"
            body="Cerca un film o una serie e premi “＋ Salva” per aggiungerlo."
          />
        ) : filteredItems.length === 0 ? (
          <Message
            title={mediaFilter === 'movie' ? 'Nessun film' : 'Nessuna serie TV'}
            body="Non ci sono titoli di questo tipo nella tua libreria."
          />
        ) : (
          STATUS_ORDER.map((status) => {
            const group = filteredItems.filter((item) => item.status === status);
            if (group.length === 0) {
              return null;
            }
            return (
              <View key={status} style={styles.section}>
                <ThemedText type="smallBold" themeColor="textSecondary">
                  {STATUS_LABELS[status]} · {group.length}
                </ThemedText>
                {group.map((item) => (
                  <ThemedView key={item.id} type="backgroundElement" style={styles.row}>
                    <Pressable
                      onPress={() =>
                        router.push({
                          pathname: '/title',
                          params: {
                            mediaType: item.mediaType,
                            id: String(item.tmdbId),
                            from: '/library',
                          },
                        })
                      }>
                      {item.posterUrl ? (
                        <Image
                          source={{ uri: item.posterUrl }}
                          style={styles.thumb}
                          contentFit="cover"
                        />
                      ) : (
                        <ThemedView type="backgroundSelected" style={styles.thumb} />
                      )}
                    </Pressable>
                    <View style={styles.rowBody}>
                      <Pressable
                        style={styles.detailTarget}
                        onPress={() =>
                          router.push({
                            pathname: '/title',
                            params: {
                              mediaType: item.mediaType,
                              id: String(item.tmdbId),
                              from: '/library',
                            },
                          })
                        }>
                        <ThemedText type="smallBold" numberOfLines={2}>
                          {item.mediaType === 'movie' ? '🎬' : '📺'} {item.title}
                        </ThemedText>
                        <View style={styles.detailMeta}>
                          {item.year && (
                            <ThemedText type="small" themeColor="textSecondary">
                              {item.year}
                            </ThemedText>
                          )}
                          <ThemedText type="small" style={styles.detailLink}>
                            Dettagli ›
                          </ThemedText>
                        </View>
                      </Pressable>

                      {item.mediaType === 'movie' ? (
                        <View style={styles.movieActions}>
                          <View style={styles.statusRow}>
                            {MOVIE_STATUSES.map((s) => {
                              const active = s === item.status;
                              return (
                                <Pressable
                                  key={s}
                                  onPress={() => {
                                    if (s === 'watched') {
                                      if (item.status !== 'watched') {
                                        setMovieWatchChoice({ item, mode: 'record' });
                                      } else if (canReclassifyMovieWatch(item)) {
                                        setMovieWatchChoice({
                                          item,
                                          mode: 'reclassify',
                                        });
                                      }
                                    } else {
                                      void changeStatus(item, s);
                                    }
                                  }}
                                  style={[styles.chip, active && styles.chipActive]}>
                                  <ThemedText
                                    type="small"
                                    style={
                                      active ? styles.chipTextActive : { color: theme.textSecondary }
                                    }>
                                    {STATUS_LABELS[s]}
                                  </ThemedText>
                                </Pressable>
                              );
                            })}
                          </View>
                          {item.status === 'watched' &&
                            (item.importedViewings > 0 || item.viewingCount > 0) && (
                            <View style={styles.watchSummary}>
                              <ThemedText type="small" themeColor="textSecondary">
                                {[
                                  item.importedViewings > 0
                                    ? `${item.importedViewings} ${
                                        item.importedViewings === 1
                                          ? 'visione importata'
                                          : 'visioni importate'
                                      }`
                                    : null,
                                  item.viewingCount > 0
                                    ? `${item.viewingCount} ${
                                        item.viewingCount === 1
                                          ? 'visione registrata'
                                          : 'visioni registrate'
                                      }`
                                    : null,
                                ]
                                  .filter(Boolean)
                                  .join(' · ')}
                              </ThemedText>
                              {canReclassifyMovieWatch(item) && (
                                <Pressable
                                  onPress={() =>
                                    setMovieWatchChoice({
                                      item,
                                      mode: 'reclassify',
                                    })
                                  }
                                  hitSlop={8}>
                                  <ThemedText type="smallBold" style={styles.originLink}>
                                    Modifica origine ›
                                  </ThemedText>
                                </Pressable>
                              )}
                            </View>
                          )}
                          <Pressable
                            style={styles.viewingsButton}
                            onPress={() => {
                              setInitialMovieRecord(false);
                              setSelectedMovie(item);
                            }}>
                            <ThemedText type="small" style={styles.viewingsText}>
                              Visioni ▸
                            </ThemedText>
                          </Pressable>
                        </View>
                      ) : (
                        <View style={styles.seriesRow}>
                          <ThemedText type="small" themeColor="textSecondary">
                            {STATUS_LABELS[item.status]} ·{' '}
                            {item.totalEpisodes != null
                              ? `${item.watchedEpisodes}/${item.totalEpisodes} ep.`
                              : `${item.watchedEpisodes} ep.`}
                          </ThemedText>
                          <Pressable
                            style={styles.episodesButton}
                            onPress={() => setSelectedSeries(item)}>
                            <ThemedText type="small" style={styles.episodesText}>
                              Episodi ▸
                            </ThemedText>
                          </Pressable>
                        </View>
                      )}
                    </View>
                    <Pressable onPress={() => remove(item)} style={styles.remove} hitSlop={8}>
                      <ThemedText type="small" themeColor="textSecondary">
                        ✕
                      </ThemedText>
                    </Pressable>
                  </ThemedView>
                ))}
              </View>
            );
          })
        )}
      </ScrollView>

      <SeriesEpisodes
        item={selectedSeries}
        onClose={() => setSelectedSeries(null)}
        onChanged={load}
      />
      {selectedMovie && (
        <MovieViewings
          item={selectedMovie}
          initialRecord={initialMovieRecord}
          onClose={() => {
            setSelectedMovie(null);
            setInitialMovieRecord(false);
          }}
          onChanged={load}
        />
      )}
      {movieWatchChoice && (
        <MovieWatchChoiceModal
          item={movieWatchChoice.item}
          mode={movieWatchChoice.mode}
          onClose={() => setMovieWatchChoice(null)}
          onSelect={selectMovieWatchSource}
        />
      )}
    </ThemedView>
  );
}

function Message({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.center}>
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
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
  heading: {
    textAlign: 'center',
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
  },
  section: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    borderRadius: Spacing.three,
    overflow: 'hidden',
    alignItems: 'center',
    padding: Spacing.two,
    gap: Spacing.three,
  },
  thumb: {
    width: 54,
    height: 81,
    borderRadius: Spacing.two,
  },
  rowBody: {
    flex: 1,
    gap: Spacing.one,
  },
  detailTarget: {
    gap: Spacing.half,
  },
  detailMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  detailLink: {
    color: Brand.sunsetOrange,
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
    marginTop: Spacing.one,
  },
  movieActions: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  watchSummary: {
    gap: Spacing.half,
  },
  originLink: {
    color: Brand.softViolet,
  },
  viewingsButton: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Spacing.three,
    backgroundColor: 'rgba(255,106,44,0.18)',
  },
  viewingsText: {
    color: Brand.sunsetOrange,
  },
  seriesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  episodesButton: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Spacing.three,
    backgroundColor: Brand.glowBlue,
  },
  episodesText: {
    color: Brand.pureWhite,
  },
  chip: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Spacing.three,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  chipActive: {
    backgroundColor: Brand.glowBlue,
  },
  chipTextActive: {
    color: Brand.pureWhite,
  },
  remove: {
    paddingHorizontal: Spacing.two,
    alignSelf: 'flex-start',
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
});
