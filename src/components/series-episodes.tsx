import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EpisodeViewingPanel } from '@/components/episode-viewings';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  deriveSeriesStatus,
  getWatchedEpisodes,
  setEpisodeWatched,
  setSeasonWatched,
  setWatchedEpisodesSource,
  STATUS_LABELS,
  type EpisodeWatchSource,
  type LibraryItem,
  type WatchedEpisodes,
} from '@/services/library';
import {
  getSeasonEpisodes,
  getTvDetails,
  type Episode,
  type SeasonSummary,
} from '@/services/tmdb';

type Props = {
  item: LibraryItem | null;
  onClose: () => void;
  onChanged: () => void;
};

type ContentProps = {
  item: LibraryItem | null;
  tmdbId: number;
  seasons: SeasonSummary[];
  totalEpisodes: number | null;
  adding?: boolean;
  onAddToLibrary?: () => void | Promise<void>;
  onChanged: () => void | Promise<void>;
};

const episodeKey = (season: number, episode: number) => `${season}-${episode}`;

export function SeriesEpisodes({ item, onClose, onChanged }: Props) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [seasons, setSeasons] = useState<SeasonSummary[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const tmdbId = item?.tmdbId ?? 0;

  useEffect(() => {
    if (!item) {
      return;
    }
    let cancelled = false;

    getTvDetails(tmdbId)
      .then((details) => {
        if (!cancelled) {
          setSeasons(details.seasons);
          setTotal(details.numberOfEpisodes || item.totalEpisodes);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Impossibile caricare gli episodi');
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
  }, [item, tmdbId]);

  if (!item) {
    return null;
  }

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <ThemedView style={styles.container}>
        <View style={[styles.inner, { paddingTop: insets.top + Spacing.three }]}>
          <View style={styles.header}>
            <ThemedText type="smallBold" numberOfLines={2} style={styles.headerTitle}>
              📺 {item?.title}
            </ThemedText>
            <Pressable onPress={onClose} hitSlop={8} style={styles.close}>
              <ThemedText type="smallBold">Chiudi</ThemedText>
            </Pressable>
          </View>

          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator color={Brand.glowBlue} />
            </View>
          ) : error ? (
            <View style={styles.center}>
              <ThemedText type="small" themeColor="textSecondary" style={styles.centerText}>
                {error}
              </ThemedText>
            </View>
          ) : (
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{
                paddingBottom: insets.bottom + Spacing.five,
              }}>
              <SeriesEpisodesContent
                key={item.id}
                item={item}
                tmdbId={tmdbId}
                seasons={seasons}
                totalEpisodes={total}
                onChanged={onChanged}
              />
            </ScrollView>
          )}
        </View>
      </ThemedView>
    </Modal>
  );
}

export function SeriesEpisodesContent({
  item,
  tmdbId,
  seasons,
  totalEpisodes,
  adding = false,
  onAddToLibrary,
  onChanged,
}: ContentProps) {
  const theme = useTheme();
  const itemId = item?.id;
  const [watched, setWatched] = useState<WatchedEpisodes>(new Map());
  const [watchedLoading, setWatchedLoading] = useState(itemId != null);
  const [expandedSeason, setExpandedSeason] = useState<number | null>(null);
  const [episodesBySeason, setEpisodesBySeason] = useState<Record<number, Episode[]>>({});
  const [loadingSeason, setLoadingSeason] = useState<number | null>(null);
  const [seasonErrors, setSeasonErrors] = useState<Record<number, string>>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [busySeason, setBusySeason] = useState<number | null>(null);
  const [busySourceScope, setBusySourceScope] = useState<string | null>(null);
  const [seasonChoice, setSeasonChoice] = useState<number | null>(null);
  const [viewingKey, setViewingKey] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!itemId) {
      return;
    }
    let cancelled = false;

    getWatchedEpisodes(itemId)
      .then((watchedEpisodes) => {
        if (!cancelled) {
          setWatched(watchedEpisodes);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setActionError(
            err instanceof Error ? err.message : 'Impossibile caricare il progresso',
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setWatchedLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [itemId]);

  async function requireLibrary() {
    if (onAddToLibrary && !adding) {
      await onAddToLibrary();
    }
  }

  async function notifyChanged() {
    await onChanged();
  }

  async function refreshWatched() {
    if (!item) {
      return;
    }
    try {
      setWatched(await getWatchedEpisodes(item.id));
      setActionError(null);
      await notifyChanged();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Impossibile aggiornare il progresso',
      );
    }
  }

  async function toggleSeason(seasonNumber: number) {
    const opening = expandedSeason !== seasonNumber;
    setExpandedSeason(opening ? seasonNumber : null);
    setViewingKey(null);
    if (!opening || episodesBySeason[seasonNumber]) {
      return;
    }

    setLoadingSeason(seasonNumber);
    setSeasonErrors((previous) => {
      const next = { ...previous };
      delete next[seasonNumber];
      return next;
    });
    try {
      const episodes = await getSeasonEpisodes(tmdbId, seasonNumber);
      setEpisodesBySeason((previous) => ({ ...previous, [seasonNumber]: episodes }));
    } catch (err) {
      setSeasonErrors((previous) => ({
        ...previous,
        [seasonNumber]:
          err instanceof Error ? err.message : 'Impossibile caricare gli episodi',
      }));
    } finally {
      setLoadingSeason(null);
    }
  }

  async function toggleEpisode(season: number, episode: number) {
    if (!item) {
      await requireLibrary();
      return;
    }
    const key = episodeKey(season, episode);
    const nextWatched = !watched.has(key);
    const previous = watched;
    const optimistic = new Map(watched);
    if (nextWatched) {
      optimistic.set(key, 'tracked');
    } else {
      optimistic.delete(key);
    }
    setWatched(optimistic);
    setBusyKey(key);
    setActionError(null);

    try {
      await setEpisodeWatched(
        item.id,
        season,
        episode,
        nextWatched,
        optimistic.size,
        totalEpisodes,
        'tracked',
      );
      await notifyChanged();
    } catch (err) {
      setWatched(previous);
      setActionError(
        err instanceof Error ? err.message : 'Impossibile aggiornare l’episodio',
      );
    } finally {
      setBusyKey(null);
    }
  }

  async function markSeason(
    season: SeasonSummary,
    watchAll: boolean,
    source: EpisodeWatchSource = 'tracked',
  ) {
    if (!item) {
      await requireLibrary();
      return;
    }
    setBusySeason(season.seasonNumber);
    setActionError(null);
    const previous = watched;
    try {
      let episodes = episodesBySeason[season.seasonNumber];
      if (!episodes) {
        episodes = await getSeasonEpisodes(tmdbId, season.seasonNumber);
        setEpisodesBySeason((current) => ({
          ...current,
          [season.seasonNumber]: episodes,
        }));
      }
      const episodeNumbers = episodes.map((episode) => episode.episodeNumber);
      const optimistic = new Map(watched);
      for (const episodeNumber of episodeNumbers) {
        const key = episodeKey(season.seasonNumber, episodeNumber);
        if (watchAll) {
          optimistic.set(key, source);
        } else {
          optimistic.delete(key);
        }
      }
      setWatched(optimistic);
      await setSeasonWatched(
        item.id,
        season.seasonNumber,
        episodeNumbers,
        watchAll,
        optimistic.size,
        totalEpisodes,
        source,
      );
      setSeasonChoice(null);
      await notifyChanged();
    } catch (err) {
      setWatched(previous);
      setActionError(
        err instanceof Error ? err.message : 'Impossibile aggiornare la stagione',
      );
    } finally {
      setBusySeason(null);
    }
  }

  async function changeWatchedSource(
    seasonNumber: number | null,
    source: EpisodeWatchSource,
  ) {
    if (!item) {
      return;
    }
    const scope = seasonNumber == null ? 'series' : `season-${seasonNumber}`;
    const previous = watched;
    const optimistic = new Map(watched);
    for (const [key] of optimistic) {
      if (seasonNumber == null || key.startsWith(`${seasonNumber}-`)) {
        optimistic.set(key, source);
      }
    }
    setWatched(optimistic);
    setBusySourceScope(scope);
    setActionError(null);
    try {
      await setWatchedEpisodesSource(item.id, seasonNumber, source);
      await notifyChanged();
    } catch (err) {
      setWatched(previous);
      setActionError(
        err instanceof Error ? err.message : 'Impossibile aggiornare la cronologia',
      );
    } finally {
      setBusySourceScope(null);
    }
  }

  const watchedCount = watched.size;
  const importedCount = Array.from(watched.values()).filter(
    (source) => source === 'imported',
  ).length;
  const trackedCount = watchedCount - importedCount;
  const status = deriveSeriesStatus(watchedCount, totalEpisodes);

  return (
    <View style={styles.content}>
      <View style={styles.summary}>
        <View style={styles.summaryText}>
          <ThemedText type="smallBold">Stagioni ed episodi</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {!item
              ? `${totalEpisodes ?? seasons.reduce((total, season) => total + season.episodeCount, 0)} episodi · anteprima`
              : watchedLoading
              ? 'Caricamento progresso…'
              : `${STATUS_LABELS[status]} · ${
                  totalEpisodes != null
                    ? `${watchedCount}/${totalEpisodes} ep.`
                    : `${watchedCount} ep.`
                }`}
          </ThemedText>
        </View>
        {watchedLoading && <ActivityIndicator color={Brand.glowBlue} size="small" />}
      </View>

      {item && watchedCount > 0 && !watchedLoading && (
        <Pressable
          onPress={() =>
            changeWatchedSource(null, trackedCount > 0 ? 'imported' : 'tracked')
          }
          disabled={busySourceScope === 'series'}
          style={styles.seriesHistoryAction}>
          {busySourceScope === 'series' ? (
            <ActivityIndicator color={Brand.softViolet} size="small" />
          ) : (
            <>
              <ThemedText type="smallBold" style={styles.historyActionText}>
                {trackedCount > 0
                  ? 'Escludi tutti dalla cronologia'
                  : 'Includi tutti nella cronologia da oggi'}
              </ThemedText>
              {importedCount > 0 && (
                <ThemedText type="small" themeColor="textSecondary">
                  {importedCount} episodi importati
                </ThemedText>
              )}
            </>
          )}
        </Pressable>
      )}

      {!item && (
        <ThemedView type="backgroundElement" style={styles.libraryPrompt}>
          <ThemedText type="small" themeColor="textSecondary" style={styles.centerText}>
            Aggiungi la serie alla libreria dal pannello in alto per tracciare episodi,
            note e visioni.
          </ThemedText>
        </ThemedView>
      )}

      {actionError && (
        <ThemedText type="small" style={styles.error}>
          {actionError}
        </ThemedText>
      )}

      {seasons.map((season) => {
        const isOpen = expandedSeason === season.seasonNumber;
        const episodes = episodesBySeason[season.seasonNumber];
        const watchedEntriesInSeason = Array.from(watched.entries()).filter(([key]) =>
          key.startsWith(`${season.seasonNumber}-`),
        );
        const watchedInSeason = watchedEntriesInSeason.length;
        const importedInSeason = watchedEntriesInSeason.filter(
          ([, source]) => source === 'imported',
        ).length;
        const trackedInSeason = watchedInSeason - importedInSeason;
        const allWatched =
          season.episodeCount > 0 && watchedInSeason >= season.episodeCount;
        const choosingSource = seasonChoice === season.seasonNumber;
        const sourceScope = `season-${season.seasonNumber}`;

        return (
          <ThemedView
            key={season.seasonNumber}
            type="backgroundElement"
            style={styles.season}>
            <View style={styles.seasonHeader}>
              <Pressable
                style={styles.seasonTitle}
                onPress={() => toggleSeason(season.seasonNumber)}>
                {season.posterUrl ? (
                  <Image
                    source={{ uri: season.posterUrl }}
                    contentFit="cover"
                    style={styles.seasonPoster}
                  />
                ) : (
                  <ThemedView type="backgroundSelected" style={styles.seasonPoster} />
                )}
                <View style={styles.seasonCopy}>
                  <ThemedText type="smallBold">
                    {isOpen ? '▾' : '▸'} {season.name}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {item && !watchedLoading ? `${watchedInSeason}/` : ''}
                    {season.episodeCount} episodi
                    {importedInSeason > 0 ? ` · ${importedInSeason} importati` : ''}
                  </ThemedText>
                </View>
              </Pressable>
              <Pressable
                style={styles.seasonAction}
                disabled={busySeason === season.seasonNumber || adding}
                onPress={() => {
                  if (allWatched) {
                    void markSeason(season, false);
                  } else {
                    setSeasonChoice(choosingSource ? null : season.seasonNumber);
                  }
                }}>
                {busySeason === season.seasonNumber ? (
                  <ActivityIndicator color={Brand.glowBlue} size="small" />
                ) : (
                  <ThemedText type="small" style={styles.seasonActionText}>
                    {!item
                      ? 'Traccia'
                      : allWatched
                        ? 'Azzera'
                        : choosingSource
                          ? 'Annulla'
                          : 'Segna tutti'}
                  </ThemedText>
                )}
              </Pressable>
            </View>

            {item && choosingSource && !allWatched && (
              <ThemedView type="backgroundSelected" style={styles.sourceChooser}>
                <View style={styles.sourceChooserCopy}>
                  <ThemedText type="smallBold">Come vuoi registrarli?</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    Gli episodi importati contano nel progresso e nelle ore complessive,
                    ma non nell’attività mensile.
                  </ThemedText>
                </View>
                <View style={styles.sourceChooserActions}>
                  <Pressable
                    onPress={() => markSeason(season, true, 'tracked')}
                    style={styles.trackedButton}>
                    <ThemedText type="smallBold" style={styles.trackedButtonText}>
                      Visti oggi
                    </ThemedText>
                  </Pressable>
                  <Pressable
                    onPress={() => markSeason(season, true, 'imported')}
                    style={styles.importButton}>
                    <ThemedText type="smallBold" style={styles.importButtonText}>
                      Già visti prima
                    </ThemedText>
                  </Pressable>
                </View>
              </ThemedView>
            )}

            {item && watchedInSeason > 0 && !choosingSource && (
              <Pressable
                onPress={() =>
                  changeWatchedSource(
                    season.seasonNumber,
                    trackedInSeason > 0 ? 'imported' : 'tracked',
                  )
                }
                disabled={busySourceScope === sourceScope}
                style={styles.seasonHistoryAction}>
                {busySourceScope === sourceScope ? (
                  <ActivityIndicator color={Brand.softViolet} size="small" />
                ) : (
                  <ThemedText type="small" style={styles.historyActionText}>
                    {trackedInSeason > 0
                      ? 'Escludi la stagione dalla cronologia'
                      : 'Includi la stagione da oggi'}
                  </ThemedText>
                )}
              </Pressable>
            )}

            {isOpen &&
              (loadingSeason === season.seasonNumber ? (
                <View style={styles.center}>
                  <ActivityIndicator color={Brand.glowBlue} size="small" />
                </View>
              ) : seasonErrors[season.seasonNumber] ? (
                <ThemedText type="small" style={styles.error}>
                  {seasonErrors[season.seasonNumber]}
                </ThemedText>
              ) : (
                (episodes ?? []).map((episode) => {
                  const key = episodeKey(season.seasonNumber, episode.episodeNumber);
                  const isWatched = watched.has(key);
                  const isImported = watched.get(key) === 'imported';
                  const viewingsOpen = viewingKey === key;
                  return (
                    <View key={key} style={styles.episode}>
                      <View style={styles.episodeHeader}>
                        <Pressable
                          onPress={() =>
                            toggleEpisode(season.seasonNumber, episode.episodeNumber)
                          }
                          disabled={busyKey === key || adding}
                          hitSlop={6}
                          style={styles.checkboxButton}>
                          {busyKey === key ? (
                            <ActivityIndicator color={Brand.glowBlue} size="small" />
                          ) : (
                            <View
                              style={[
                                styles.checkbox,
                                isWatched && styles.checkboxOn,
                                isImported && styles.checkboxImported,
                                {
                                  borderColor: isWatched
                                    ? isImported
                                      ? Brand.softViolet
                                      : Brand.glowBlue
                                    : theme.textSecondary,
                                },
                              ]}>
                              {isWatched && (
                                <ThemedText type="small" style={styles.check}>
                                  ✓
                                </ThemedText>
                              )}
                            </View>
                          )}
                        </Pressable>
                        <View style={styles.episodeTitle}>
                          <ThemedText type="smallBold">
                            E{episode.episodeNumber} · {episode.name}
                          </ThemedText>
                          {episode.airDate ? (
                            <ThemedText type="small" themeColor="textSecondary">
                              {episode.airDate.split('-').reverse().join('/')}
                            </ThemedText>
                          ) : null}
                          {isImported && (
                            <ThemedText type="small" style={styles.importedLabel}>
                              Importato
                            </ThemedText>
                          )}
                        </View>
                      </View>

                      {episode.overview ? (
                        <ThemedText
                          type="small"
                          themeColor="textSecondary"
                          numberOfLines={viewingsOpen ? undefined : 3}>
                          {episode.overview}
                        </ThemedText>
                      ) : null}

                      <Pressable
                        onPress={() => {
                          if (!item) {
                            void requireLibrary();
                            return;
                          }
                          setViewingKey(viewingsOpen ? null : key);
                        }}
                        style={styles.viewingsButton}>
                        <ThemedText type="smallBold" style={styles.viewingsButtonText}>
                          {viewingsOpen ? 'Chiudi note' : 'Note e visioni ›'}
                        </ThemedText>
                      </Pressable>

                      {item && viewingsOpen && (
                        <EpisodeViewingPanel
                          key={`${item.id}-${key}`}
                          item={item}
                          seasonNumber={season.seasonNumber}
                          episodeNumber={episode.episodeNumber}
                          totalEpisodes={totalEpisodes}
                          onChanged={refreshWatched}
                        />
                      )}
                    </View>
                  );
                })
              ))}
          </ThemedView>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inner: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  headerTitle: {
    flex: 1,
  },
  close: {
    paddingVertical: Spacing.one,
  },
  content: {
    gap: Spacing.two,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingBottom: Spacing.one,
  },
  summaryText: {
    flex: 1,
    gap: Spacing.half,
  },
  seriesHistoryAction: {
    alignItems: 'center',
    gap: Spacing.half,
    padding: Spacing.two,
    borderRadius: Spacing.three,
    backgroundColor: 'rgba(106,76,255,0.12)',
  },
  historyActionText: {
    color: Brand.softViolet,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.five,
  },
  centerText: {
    textAlign: 'center',
  },
  libraryPrompt: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  disabled: {
    opacity: 0.6,
  },
  error: {
    color: Brand.sunsetOrange,
  },
  season: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  seasonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  seasonTitle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  seasonPoster: {
    width: 48,
    height: 72,
    borderRadius: Spacing.two,
  },
  seasonCopy: {
    flex: 1,
    gap: Spacing.half,
  },
  seasonAction: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.three,
    backgroundColor: 'rgba(47,107,255,0.18)',
    minWidth: 76,
    alignItems: 'center',
  },
  seasonActionText: {
    color: Brand.glowBlue,
  },
  sourceChooser: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  sourceChooserCopy: {
    gap: Spacing.half,
  },
  sourceChooserActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  trackedButton: {
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
    backgroundColor: 'rgba(47,107,255,0.18)',
  },
  trackedButtonText: {
    color: Brand.glowBlue,
  },
  importButton: {
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
    backgroundColor: 'rgba(106,76,255,0.18)',
  },
  importButtonText: {
    color: Brand.softViolet,
  },
  seasonHistoryAction: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.three,
    backgroundColor: 'rgba(106,76,255,0.10)',
  },
  episode: {
    gap: Spacing.two,
    paddingTop: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.12)',
  },
  episodeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  checkboxButton: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: Spacing.one,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: {
    backgroundColor: Brand.glowBlue,
  },
  checkboxImported: {
    backgroundColor: Brand.softViolet,
  },
  check: {
    color: Brand.pureWhite,
  },
  episodeTitle: {
    flex: 1,
    gap: Spacing.half,
  },
  importedLabel: {
    alignSelf: 'flex-start',
    color: Brand.softViolet,
  },
  viewingsButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.three,
    backgroundColor: 'rgba(255,106,44,0.18)',
  },
  viewingsButtonText: {
    color: Brand.sunsetOrange,
  },
});
