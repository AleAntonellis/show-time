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
  STATUS_LABELS,
  type LibraryItem,
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
  const [watched, setWatched] = useState<Set<string>>(new Set());
  const [watchedLoading, setWatchedLoading] = useState(itemId != null);
  const [expandedSeason, setExpandedSeason] = useState<number | null>(null);
  const [episodesBySeason, setEpisodesBySeason] = useState<Record<number, Episode[]>>({});
  const [loadingSeason, setLoadingSeason] = useState<number | null>(null);
  const [seasonErrors, setSeasonErrors] = useState<Record<number, string>>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [busySeason, setBusySeason] = useState<number | null>(null);
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
    const optimistic = new Set(watched);
    if (nextWatched) {
      optimistic.add(key);
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

  async function markSeason(season: SeasonSummary, watchAll: boolean) {
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
      const optimistic = new Set(watched);
      for (const episodeNumber of episodeNumbers) {
        const key = episodeKey(season.seasonNumber, episodeNumber);
        if (watchAll) {
          optimistic.add(key);
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
      );
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

  const watchedCount = watched.size;
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
        const watchedInSeason = Array.from(watched).filter((key) =>
          key.startsWith(`${season.seasonNumber}-`),
        ).length;
        const allWatched =
          season.episodeCount > 0 && watchedInSeason >= season.episodeCount;

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
                  </ThemedText>
                </View>
              </Pressable>
              <Pressable
                style={styles.seasonAction}
                disabled={busySeason === season.seasonNumber || adding}
                onPress={() => markSeason(season, !allWatched)}>
                {busySeason === season.seasonNumber ? (
                  <ActivityIndicator color={Brand.glowBlue} size="small" />
                ) : (
                  <ThemedText type="small" style={styles.seasonActionText}>
                    {!item ? 'Traccia' : allWatched ? 'Azzera' : 'Segna tutti'}
                  </ThemedText>
                )}
              </Pressable>
            </View>

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
                                {
                                  borderColor: isWatched
                                    ? Brand.glowBlue
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
  check: {
    color: Brand.pureWhite,
  },
  episodeTitle: {
    flex: 1,
    gap: Spacing.half,
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
