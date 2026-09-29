import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
import { getSeasonEpisodes, getTvDetails, type Episode, type SeasonSummary } from '@/services/tmdb';

type Props = {
  item: LibraryItem | null;
  onClose: () => void;
  onChanged: () => void;
};

export function SeriesEpisodes({ item, onClose, onChanged }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [seasons, setSeasons] = useState<SeasonSummary[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [watched, setWatched] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [episodesBySeason, setEpisodesBySeason] = useState<Record<number, Episode[]>>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [busySeason, setBusySeason] = useState<number | null>(null);
  const [dirty, setDirty] = useState(false);

  const tmdbId = item?.tmdbId ?? 0;

  useEffect(() => {
    if (!item) {
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setExpanded(new Set());
    setEpisodesBySeason({});
    setDirty(false);

    Promise.all([getTvDetails(tmdbId), getWatchedEpisodes(item.id)])
      .then(([details, watchedSet]) => {
        if (cancelled) {
          return;
        }
        setSeasons(details.seasons);
        setTotal(details.numberOfEpisodes || item.totalEpisodes);
        setWatched(watchedSet);
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

  const toggleSeason = useCallback(
    async (season: SeasonSummary) => {
      const next = new Set(expanded);
      if (next.has(season.seasonNumber)) {
        next.delete(season.seasonNumber);
        setExpanded(next);
        return;
      }
      next.add(season.seasonNumber);
      setExpanded(next);
      if (!episodesBySeason[season.seasonNumber]) {
        try {
          const eps = await getSeasonEpisodes(tmdbId, season.seasonNumber);
          setEpisodesBySeason((prev) => ({ ...prev, [season.seasonNumber]: eps }));
        } catch {
          /* riprovabile riaprendo la stagione */
        }
      }
    },
    [expanded, episodesBySeason, tmdbId],
  );

  async function toggleEpisode(season: number, episode: number) {
    if (!item) {
      return;
    }
    const key = `${season}-${episode}`;
    const nextWatched = !watched.has(key);
    setBusyKey(key);

    const optimistic = new Set(watched);
    if (nextWatched) {
      optimistic.add(key);
    } else {
      optimistic.delete(key);
    }
    setWatched(optimistic);

    try {
      await setEpisodeWatched(item.id, season, episode, nextWatched, optimistic.size, total);
      setDirty(true);
    } catch {
      setWatched(watched); // rollback
    } finally {
      setBusyKey(null);
    }
  }

  async function markSeason(season: SeasonSummary, watchAll: boolean) {
    if (!item) {
      return;
    }
    setBusySeason(season.seasonNumber);
    const previous = watched;
    try {
      // Assicura di conoscere gli episodi della stagione.
      let eps = episodesBySeason[season.seasonNumber];
      if (!eps) {
        eps = await getSeasonEpisodes(tmdbId, season.seasonNumber);
        setEpisodesBySeason((prev) => ({ ...prev, [season.seasonNumber]: eps }));
      }
      const episodeNumbers = eps.map((e) => e.episodeNumber);

      const optimistic = new Set(watched);
      for (const n of episodeNumbers) {
        const key = `${season.seasonNumber}-${n}`;
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
        total,
      );
      setDirty(true);
    } catch {
      setWatched(previous); // rollback
    } finally {
      setBusySeason(null);
    }
  }

  function handleClose() {
    if (dirty) {
      onChanged();
    }
    onClose();
  }

  const watchedCount = watched.size;
  const status = deriveSeriesStatus(watchedCount, total);

  return (
    <Modal visible={item != null} animationType="slide" transparent onRequestClose={handleClose}>
      <ThemedView style={styles.container}>
        <View style={[styles.inner, { paddingTop: insets.top + Spacing.three }]}>
          <View style={styles.header}>
            <View style={styles.headerText}>
              <ThemedText type="smallBold" numberOfLines={2}>
                📺 {item?.title}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {STATUS_LABELS[status]} ·{' '}
                {total != null ? `${watchedCount}/${total} ep.` : `${watchedCount} ep.`}
              </ThemedText>
            </View>
            <Pressable onPress={handleClose} hitSlop={8} style={styles.close}>
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
              contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.five, gap: Spacing.two }}>
              {seasons.map((season) => {
                const isOpen = expanded.has(season.seasonNumber);
                const eps = episodesBySeason[season.seasonNumber];
                const watchedInSeason = Array.from(watched).filter((k) =>
                  k.startsWith(`${season.seasonNumber}-`),
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
                        onPress={() => toggleSeason(season)}>
                        <ThemedText type="smallBold">
                          {isOpen ? '▾' : '▸'} {season.name}
                        </ThemedText>
                        <ThemedText type="small" themeColor="textSecondary">
                          {watchedInSeason}/{season.episodeCount}
                        </ThemedText>
                      </Pressable>
                      <Pressable
                        style={styles.seasonAction}
                        disabled={busySeason === season.seasonNumber}
                        onPress={() => markSeason(season, !allWatched)}>
                        {busySeason === season.seasonNumber ? (
                          <ActivityIndicator color={Brand.glowBlue} size="small" />
                        ) : (
                          <ThemedText type="small" style={styles.seasonActionText}>
                            {allWatched ? 'Azzera' : 'Segna tutti'}
                          </ThemedText>
                        )}
                      </Pressable>
                    </View>

                    {isOpen &&
                      (eps ? (
                        eps.map((ep) => {
                          const key = `${season.seasonNumber}-${ep.episodeNumber}`;
                          const isWatched = watched.has(key);
                          return (
                            <Pressable
                              key={key}
                              style={styles.episode}
                              onPress={() => toggleEpisode(season.seasonNumber, ep.episodeNumber)}
                              disabled={busyKey === key}>
                              <View
                                style={[
                                  styles.checkbox,
                                  isWatched && styles.checkboxOn,
                                  { borderColor: isWatched ? Brand.glowBlue : theme.textSecondary },
                                ]}>
                                {isWatched && (
                                  <ThemedText type="small" style={styles.check}>
                                    ✓
                                  </ThemedText>
                                )}
                              </View>
                              <ThemedText type="small" style={styles.episodeName} numberOfLines={1}>
                                {ep.episodeNumber}. {ep.name}
                              </ThemedText>
                            </Pressable>
                          );
                        })
                      ) : (
                        <View style={styles.center}>
                          <ActivityIndicator color={Brand.glowBlue} size="small" />
                        </View>
                      ))}
                  </ThemedView>
                );
              })}
            </ScrollView>
          )}
        </View>
      </ThemedView>
    </Modal>
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
  headerText: {
    flex: 1,
    gap: Spacing.half,
  },
  close: {
    paddingVertical: Spacing.one,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.five,
  },
  centerText: {
    textAlign: 'center',
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
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  seasonAction: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Spacing.three,
    backgroundColor: 'rgba(47,107,255,0.18)',
    minWidth: 76,
    alignItems: 'center',
  },
  seasonActionText: {
    color: Brand.glowBlue,
  },
  episode: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.one,
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
  episodeName: {
    flex: 1,
  },
});
