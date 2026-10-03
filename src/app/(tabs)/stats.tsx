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

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  MediaFilter,
  type MediaFilterValue,
} from '@/components/media-filter';
import {
  BottomTabInset,
  Brand,
  MaxContentWidth,
  Spacing,
  WebTabTopInset,
} from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import {
  enrichStatisticsMetadata,
  getPersonalStatisticsByMedia,
  type GenreStatistic,
  type MonthlyActivity,
  type PersonalStatistics,
  type PersonalStatisticsByMedia,
  type RecentActivity,
} from '@/services/statistics';

const numberFormatter = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 1 });

function formatHours(minutes: number): string {
  return numberFormatter.format(minutes / 60);
}

function formatDate(value: string): string {
  const [year, month, day] = value.split('-');
  return day && month && year ? `${day}/${month}/${year}` : value;
}

function formatShortDate(value: string): string {
  const [, month, day] = value.split('-');
  return day && month ? `${day}/${month}` : value;
}

function openActivity(activity: RecentActivity) {
  router.push({
    pathname: '/title',
    params: {
      mediaType: activity.mediaType,
      id: String(activity.tmdbId),
      from: '/stats',
    },
  });
}

export default function StatisticsTabScreen() {
  const insets = useSafeAreaInsets();
  const { session, configured } = useAuth();
  const [statisticsByMedia, setStatisticsByMedia] =
    useState<PersonalStatisticsByMedia | null>(null);
  const [mediaFilter, setMediaFilter] = useState<MediaFilterValue>('all');
  const [loading, setLoading] = useState(true);
  const [enriching, setEnriching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metadataWarning, setMetadataWarning] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!configured || !session) {
        setLoading(false);
        return;
      }
      let cancelled = false;

      async function load() {
        setLoading(true);
        setError(null);
        setMetadataWarning(null);
        try {
          let next = await getPersonalStatisticsByMedia();
          if (cancelled) {
            return;
          }
          setStatisticsByMedia(next);

          if (next.all.missingMetadata > 0) {
            setEnriching(true);
            try {
              const enriched = await enrichStatisticsMetadata();
              if (enriched > 0) {
                next = await getPersonalStatisticsByMedia();
                if (!cancelled) {
                  setStatisticsByMedia(next);
                }
              }
            } catch (err) {
              if (!cancelled) {
                setMetadataWarning(
                  err instanceof Error
                    ? err.message
                    : 'Impossibile completare i metadati TMDB',
                );
              }
            } finally {
              if (!cancelled) {
                setEnriching(false);
              }
            }
          }
        } catch (err) {
          if (!cancelled) {
            setError(
              err instanceof Error ? err.message : 'Impossibile caricare le statistiche',
            );
          }
        } finally {
          if (!cancelled) {
            setLoading(false);
          }
        }
      }

      void load();
      return () => {
        cancelled = true;
      };
    }, [configured, session]),
  );

  if (configured && !session) {
    return null;
  }

  const topInset = Platform.OS === 'web' ? WebTabTopInset : insets.top + Spacing.three;
  const bottomInset = insets.bottom + BottomTabInset + Spacing.four;
  const statistics: PersonalStatistics | null =
    statisticsByMedia?.[mediaFilter] ?? null;
  const catalogMediaLabel = statistics
    ? mediaFilter === 'movie'
      ? `${statistics.movies} film`
      : mediaFilter === 'tv'
        ? `${statistics.series} serie`
        : `${statistics.movies} film · ${statistics.series} serie`
    : '';
  const recentMediaLabel = statistics
    ? mediaFilter === 'movie'
      ? `${statistics.lastThirtyDays.movies} film`
      : mediaFilter === 'tv'
        ? `${statistics.lastThirtyDays.series} serie`
        : `${statistics.lastThirtyDays.movies} film · ${statistics.lastThirtyDays.series} serie`
    : '';

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingTop: topInset, paddingBottom: bottomInset },
        ]}>
        <View style={styles.heading}>
          <ThemedText type="subtitle">Statistiche</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.headingCopy}>
            Il tuo tempo davanti allo schermo, privato e personale.
          </ThemedText>
        </View>

        <MediaFilter value={mediaFilter} onChange={setMediaFilter} />

        {!configured ? (
          <StateMessage
            title="Supabase non configurato"
            body="Configura la libreria per calcolare le tue statistiche."
          />
        ) : loading && !statistics ? (
          <View style={styles.center}>
            <ActivityIndicator color={Brand.glowBlue} />
          </View>
        ) : error ? (
          <StateMessage title="Ops" body={error} />
        ) : !statistics || statistics.totalTitles === 0 ? (
          <StateMessage
            title="Nessun dato da analizzare"
            body={
              mediaFilter === 'all'
                ? 'Aggiungi film e serie alla libreria per iniziare.'
                : `Non ci sono ${
                    mediaFilter === 'movie' ? 'film' : 'serie TV'
                  } da analizzare.`
            }
          />
        ) : (
          <>
            {enriching && (
              <ThemedView type="backgroundElement" style={styles.enriching}>
                <ActivityIndicator color={Brand.glowBlue} size="small" />
                <ThemedText type="small" themeColor="textSecondary">
                  Completamento metadati TMDB…
                </ThemedText>
              </ThemedView>
            )}

            {metadataWarning && (
              <ThemedText type="small" style={styles.warning}>
                Dati parziali: {metadataWarning}
              </ThemedText>
            )}

            <ThemedView type="backgroundElement" style={styles.section}>
              <ThemedText type="smallBold">La tua libreria</ThemedText>
              <View style={styles.libraryBreakdown}>
                <Breakdown value={statistics.watchlist} label="Da vedere" />
                <Breakdown value={statistics.inProgress} label="In corso" />
                <Breakdown value={statistics.completed} label="Completati" />
                <Breakdown value={statistics.viewingCount} label="Visioni registrate" />
              </View>
            </ThemedView>

            <View style={styles.totalsSection}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                Totali catalogo
              </ThemedText>
              <View style={styles.summaryGrid}>
                <SummaryCard
                  value={String(statistics.totalTitles)}
                  label={catalogMediaLabel}
                />
                {mediaFilter !== 'movie' && (
                  <SummaryCard
                    value={String(statistics.watchedEpisodes)}
                    label={
                      statistics.importedEpisodes > 0
                        ? `Episodi completati · ${statistics.importedEpisodes} importati`
                        : 'Episodi completati'
                    }
                  />
                )}
                <SummaryCard
                  value={`${formatHours(statistics.estimatedMinutes)} h`}
                  label="Tempo catalogato"
                  accent
                />
                <SummaryCard
                  value={
                    statistics.averageRating != null
                      ? statistics.averageRating.toFixed(1)
                      : '—'
                  }
                  label={`${statistics.ratedViewings} voti`}
                />
              </View>
            </View>

            <ThemedView type="backgroundElement" style={styles.section}>
              <View>
                <ThemedText type="smallBold">Generi in libreria</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  I generi più presenti tra i tuoi titoli.
                </ThemedText>
              </View>
              {statistics.genres.length > 0 ? (
                <GenreBars genres={statistics.genres} />
              ) : (
                <ThemedText type="small" themeColor="textSecondary">
                  Generi non ancora disponibili.
                </ThemedText>
              )}
            </ThemedView>

            <ThemedView type="backgroundElement" style={styles.section}>
              <View>
                <ThemedText type="smallBold">Attività negli ultimi 6 mesi</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {mediaFilter === 'movie'
                    ? 'Attività con una data reale.'
                    : 'Attività con una data reale; gli episodi importati sono esclusi.'}
                </ThemedText>
              </View>
              <ActivityChart months={statistics.monthlyActivity} />
            </ThemedView>

            <View style={styles.totalsSection}>
              <View>
                <ThemedText type="smallBold">Ultimi 30 giorni</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {formatShortDate(statistics.lastThirtyDays.fromDate)}–
                  {formatShortDate(statistics.lastThirtyDays.toDate)} · solo attività
                  con una data reale.
                </ThemedText>
              </View>
              <View style={styles.summaryGrid}>
                <SummaryCard
                  value={String(
                    statistics.lastThirtyDays.movies +
                      statistics.lastThirtyDays.series,
                  )}
                  label={recentMediaLabel}
                />
                {mediaFilter !== 'movie' && (
                  <SummaryCard
                    value={String(statistics.lastThirtyDays.episodes)}
                    label="Episodi completati"
                  />
                )}
                <SummaryCard
                  value={`${formatHours(
                    statistics.lastThirtyDays.estimatedMinutes,
                  )} h`}
                  label="Tempo visto"
                  accent
                />
                <SummaryCard
                  value={
                    statistics.lastThirtyDays.averageRating != null
                      ? statistics.lastThirtyDays.averageRating.toFixed(1)
                      : '—'
                  }
                  label={`${statistics.lastThirtyDays.ratedViewings} voti`}
                />
              </View>
            </View>

            <View style={styles.recentSection}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                Attività recente
              </ThemedText>
              {statistics.recentActivity.length > 0 ? (
                statistics.recentActivity.slice(0, 10).map((activity) => (
                  <RecentActivityCard key={activity.id} activity={activity} />
                ))
              ) : (
                <ThemedView type="backgroundElement" style={styles.emptyRecent}>
                  <ThemedText type="small" themeColor="textSecondary">
                    Registra una visione per iniziare la timeline.
                  </ThemedText>
                </ThemedView>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </ThemedView>
  );
}

function SummaryCard({
  value,
  label,
  accent = false,
}: {
  value: string;
  label: string;
  accent?: boolean;
}) {
  return (
    <ThemedView
      type="backgroundElement"
      style={[styles.summaryCard, accent && styles.summaryCardAccent]}>
      <ThemedText type="smallBold" style={[styles.summaryValue, accent && styles.accentText]}>
        {value}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </ThemedView>
  );
}

function Breakdown({ value, label }: { value: number | string; label: string }) {
  return (
    <View style={styles.breakdownItem}>
      <ThemedText type="smallBold">{value}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </View>
  );
}

function ActivityChart({ months }: { months: MonthlyActivity[] }) {
  const max = Math.max(...months.map((month) => month.count), 1);
  return (
    <View style={styles.chart}>
      {months.map((month) => {
        const height = month.count > 0 ? Math.max(8, (month.count / max) * 112) : 2;
        return (
          <View key={month.key} style={styles.chartColumn}>
            <ThemedText type="small" themeColor="textSecondary">
              {month.count}
            </ThemedText>
            <View style={styles.barTrack}>
              <View style={[styles.bar, { height }]} />
            </View>
            <ThemedText type="small" themeColor="textSecondary">
              {month.label}
            </ThemedText>
          </View>
        );
      })}
    </View>
  );
}

function GenreBars({ genres }: { genres: GenreStatistic[] }) {
  const max = Math.max(...genres.map((genre) => genre.count), 1);
  return (
    <View style={styles.genreList}>
      {genres.map((genre) => (
        <View key={genre.name} style={styles.genreRow}>
          <View style={styles.genreHeading}>
            <ThemedText type="small">{genre.name}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {genre.count}
            </ThemedText>
          </View>
          <View style={styles.genreTrack}>
            <View
              style={[
                styles.genreFill,
                { width: `${Math.max((genre.count / max) * 100, 5)}%` },
              ]}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

function RecentActivityCard({ activity }: { activity: RecentActivity }) {
  return (
    <Pressable
      onPress={() => openActivity(activity)}
      style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView type="backgroundElement" style={styles.recentCard}>
        {activity.posterUrl ? (
          <Image
            source={{ uri: activity.posterUrl }}
            contentFit="cover"
            style={styles.recentPoster}
          />
        ) : (
          <ThemedView type="backgroundSelected" style={styles.recentPoster} />
        )}
        <View style={styles.recentCopy}>
          <View style={styles.recentHeading}>
            <ThemedText type="smallBold" numberOfLines={1} style={styles.recentTitle}>
              {activity.title}
            </ThemedText>
            {activity.rating != null && (
              <ThemedText type="small" style={styles.rating}>
                ★ {activity.rating.toFixed(1)}
              </ThemedText>
            )}
          </View>
          <ThemedText type="small" themeColor="textSecondary">
            {activity.detail} · {formatDate(activity.watchedOn)}
          </ThemedText>
          {activity.note ? (
            <ThemedText type="small" numberOfLines={2}>
              {activity.note}
            </ThemedText>
          ) : null}
        </View>
        <ThemedText type="small" themeColor="textSecondary">
          ›
        </ThemedText>
      </ThemedView>
    </Pressable>
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
  heading: {
    alignItems: 'center',
    gap: Spacing.one,
  },
  headingCopy: {
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
  enriching: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderRadius: Spacing.three,
    padding: Spacing.two,
  },
  warning: {
    color: Brand.sunsetOrange,
    textAlign: 'center',
  },
  totalsSection: {
    gap: Spacing.two,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  summaryCard: {
    flex: 1,
    minWidth: 140,
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.half,
  },
  summaryCardAccent: {
    borderWidth: 1,
    borderColor: 'rgba(255,106,44,0.35)',
  },
  summaryValue: {
    fontSize: 24,
    lineHeight: 30,
  },
  accentText: {
    color: Brand.sunsetOrange,
  },
  section: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  libraryBreakdown: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  breakdownItem: {
    minWidth: 100,
    flex: 1,
    gap: Spacing.half,
  },
  chart: {
    height: 170,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
  },
  chartColumn: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.one,
  },
  barTrack: {
    width: '100%',
    maxWidth: 36,
    height: 112,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    borderRadius: Spacing.two,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  bar: {
    width: '100%',
    borderRadius: Spacing.two,
    backgroundColor: Brand.glowBlue,
  },
  genreList: {
    gap: Spacing.two,
  },
  genreRow: {
    gap: Spacing.one,
  },
  genreHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  genreTrack: {
    height: 6,
    overflow: 'hidden',
    borderRadius: Spacing.one,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  genreFill: {
    height: '100%',
    borderRadius: Spacing.one,
    backgroundColor: Brand.softViolet,
  },
  recentSection: {
    gap: Spacing.two,
  },
  recentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderRadius: Spacing.three,
    padding: Spacing.two,
  },
  recentPoster: {
    width: 46,
    height: 69,
    borderRadius: Spacing.two,
  },
  recentCopy: {
    flex: 1,
    gap: Spacing.half,
  },
  recentHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  recentTitle: {
    flex: 1,
  },
  rating: {
    color: Brand.sunsetOrange,
  },
  emptyRecent: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
  },
  pressed: {
    opacity: 0.8,
  },
});
