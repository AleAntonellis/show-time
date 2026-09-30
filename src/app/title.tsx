import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
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
import { SeriesEpisodesContent } from '@/components/series-episodes';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Brand, MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import {
  addToLibrary,
  getLibraryItemByTmdb,
  MOVIE_STATUSES,
  removeFromLibrary,
  STATUS_LABELS as LIBRARY_STATUS_LABELS,
  updateStatus,
  type LibraryItem,
  type LibraryStatus,
} from '@/services/library';
import {
  getTitleDetails,
  type MediaType,
  type TitleDetails,
} from '@/services/tmdb';

const TMDB_STATUS_LABELS: Record<string, string> = {
  'Returning Series': 'In produzione',
  Planned: 'Pianificata',
  'In Production': 'In produzione',
  Ended: 'Conclusa',
  Canceled: 'Cancellata',
  Pilot: 'Pilota',
  Rumored: 'Annunciato',
  Released: 'Uscito',
  'Post Production': 'Post-produzione',
};

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function formatDate(value: string | null): string | null {
  if (!value) {
    return null;
  }
  const [year, month, day] = value.split('-');
  return day && month && year ? `${day}/${month}/${year}` : value;
}

function formatRuntime(minutes: number | null): string | null {
  if (!minutes || minutes <= 0) {
    return null;
  }
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return hours > 0 ? `${hours} h ${remaining ? `${remaining} min` : ''}`.trim() : `${minutes} min`;
}

export default function TitleScreen() {
  const params = useLocalSearchParams<{
    mediaType?: string | string[];
    id?: string | string[];
    from?: string | string[];
  }>();
  const insets = useSafeAreaInsets();
  const { session, configured: supabaseConfigured } = useAuth();
  const mediaTypeParam = firstParam(params.mediaType);
  const idParam = firstParam(params.id);
  const fromParam = firstParam(params.from);
  const backTarget =
    fromParam === '/' ||
    fromParam === '/library' ||
    fromParam === '/search' ||
    fromParam === '/stats' ||
    fromParam === '/reminders'
      ? fromParam
      : '/';
  const mediaType: MediaType | null =
    mediaTypeParam === 'movie' || mediaTypeParam === 'tv' ? mediaTypeParam : null;
  const titleId = idParam ? Number(idParam) : Number.NaN;
  const validParams = mediaType != null && Number.isInteger(titleId) && titleId > 0;

  const [details, setDetails] = useState<TitleDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [libraryItem, setLibraryItem] = useState<LibraryItem | null>(null);
  const [libraryLoading, setLibraryLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showMovieViewings, setShowMovieViewings] = useState(false);

  useEffect(() => {
    if (!validParams || !mediaType) {
      return;
    }
    let cancelled = false;

    getTitleDetails(mediaType, titleId)
      .then((data) => {
        if (!cancelled) {
          setDetails(data);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Impossibile caricare il dettaglio');
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
  }, [mediaType, titleId, validParams]);

  const canUseLibrary = supabaseConfigured && Boolean(session);

  useEffect(() => {
    if (!details || !canUseLibrary) {
      return;
    }
    let cancelled = false;

    getLibraryItemByTmdb(details.mediaType, details.id)
      .then((item) => {
        if (!cancelled) {
          setLibraryItem(item);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setActionError(
            err instanceof Error ? err.message : 'Impossibile leggere la libreria',
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLibraryLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [canUseLibrary, details]);

  const topInset = Platform.OS === 'web' ? Spacing.six : insets.top + Spacing.three;
  const bottomInset = insets.bottom + BottomTabInset + Spacing.five;

  function goBack() {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace(backTarget);
  }

  async function refreshLibraryItem() {
    if (!details || !canUseLibrary) {
      return;
    }
    setLibraryItem(await getLibraryItemByTmdb(details.mediaType, details.id));
  }

  async function addCurrentTitle() {
    if (!details || actionBusy) {
      return;
    }
    setActionBusy(true);
    setActionError(null);
    try {
      await addToLibrary(details, 'to_watch');
      await refreshLibraryItem();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Impossibile aggiungere il titolo');
    } finally {
      setActionBusy(false);
    }
  }

  async function changeMovieStatus(status: LibraryStatus) {
    if (!libraryItem || actionBusy) {
      return;
    }
    setActionBusy(true);
    setActionError(null);
    try {
      await updateStatus(libraryItem.id, status);
      setLibraryItem({ ...libraryItem, status });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Impossibile aggiornare lo stato');
    } finally {
      setActionBusy(false);
    }
  }

  async function removeCurrentTitle() {
    if (!libraryItem || actionBusy) {
      return;
    }
    setActionBusy(true);
    setActionError(null);
    try {
      await removeFromLibrary(libraryItem.id);
      setLibraryItem(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Impossibile rimuovere il titolo');
    } finally {
      setActionBusy(false);
    }
  }

  if (!validParams) {
    return (
      <DetailMessage
        title="Titolo non valido"
        body="Il link richiesto non è valido."
        onBack={goBack}
      />
    );
  }

  if (loading) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator color={Brand.glowBlue} />
      </ThemedView>
    );
  }

  if (error || !details) {
    return (
      <DetailMessage
        title="Impossibile caricare il titolo"
        body={error ?? 'Dettaglio non disponibile.'}
        onBack={goBack}
      />
    );
  }

  const releaseDate = formatDate(details.releaseDate);
  const runtime = formatRuntime(details.runtime);
  const status = details.status
    ? (TMDB_STATUS_LABELS[details.status] ?? details.status)
    : null;

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingTop: topInset, paddingBottom: bottomInset },
        ]}>
        <Pressable onPress={goBack} hitSlop={8} style={styles.backButton}>
          <ThemedText type="smallBold">‹ Indietro</ThemedText>
        </Pressable>

        {details.backdropUrl && (
          <View style={styles.backdropWrapper}>
            <Image
              source={{ uri: details.backdropUrl }}
              contentFit="cover"
              transition={250}
              style={styles.backdrop}
            />
            <View style={styles.backdropOverlay} />
          </View>
        )}

        <View style={styles.hero}>
          {details.posterUrl ? (
            <Image
              source={{ uri: details.posterUrl }}
              contentFit="cover"
              transition={250}
              style={styles.poster}
            />
          ) : (
            <ThemedView type="backgroundSelected" style={[styles.poster, styles.posterFallback]}>
              <ThemedText type="small" themeColor="textSecondary">
                Nessun poster
              </ThemedText>
            </ThemedView>
          )}

          <View style={styles.heroText}>
            <ThemedText type="subtitle" style={styles.title}>
              {details.title}
            </ThemedText>
            {details.tagline ? (
              <ThemedText type="small" themeColor="textSecondary" style={styles.tagline}>
                “{details.tagline}”
              </ThemedText>
            ) : null}
            <View style={styles.chips}>
              <MetaChip label={details.mediaType === 'movie' ? '🎬 Film' : '📺 Serie TV'} />
              {details.year && <MetaChip label={details.year} />}
              {runtime && (
                <MetaChip
                  label={details.mediaType === 'tv' ? `${runtime} / ep.` : runtime}
                />
              )}
              {details.voteAverage > 0 && (
                <MetaChip
                  accent
                  label={`★ ${details.voteAverage.toFixed(1)}${
                    details.voteCount > 0 ? ` · ${details.voteCount}` : ''
                  }`}
                />
              )}
            </View>
          </View>
        </View>

        <ThemedView type="backgroundElement" style={styles.libraryPanel}>
          <View style={styles.libraryHeader}>
            <ThemedText type="smallBold">La mia libreria</ThemedText>
            {libraryItem && (
              <Pressable
                onPress={removeCurrentTitle}
                disabled={actionBusy}
                hitSlop={8}>
                <ThemedText type="small" style={styles.removeText}>
                  Rimuovi
                </ThemedText>
              </Pressable>
            )}
          </View>

          {!supabaseConfigured ? (
            <ThemedText type="small" themeColor="textSecondary">
              Configura Supabase per salvare il titolo e le tue note.
            </ThemedText>
          ) : libraryLoading ? (
            <ActivityIndicator color={Brand.glowBlue} />
          ) : !libraryItem ? (
            <Pressable
              onPress={addCurrentTitle}
              disabled={actionBusy}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.pressed,
                actionBusy && styles.disabled,
              ]}>
              {actionBusy ? (
                <ActivityIndicator color={Brand.pureWhite} size="small" />
              ) : (
                <ThemedText type="smallBold" style={styles.primaryButtonText}>
                  ＋ Aggiungi alla libreria
                </ThemedText>
              )}
            </Pressable>
          ) : libraryItem.mediaType === 'movie' ? (
            <View style={styles.libraryActions}>
              <View style={styles.statuses}>
                {MOVIE_STATUSES.map((movieStatus) => {
                  const active = movieStatus === libraryItem.status;
                  return (
                    <Pressable
                      key={movieStatus}
                      onPress={() => changeMovieStatus(movieStatus)}
                      disabled={actionBusy}
                      style={[styles.statusChip, active && styles.statusChipActive]}>
                      <ThemedText
                        type="small"
                        style={active ? styles.statusChipTextActive : undefined}>
                        {LIBRARY_STATUS_LABELS[movieStatus]}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
              <Pressable
                onPress={() => setShowMovieViewings(true)}
                style={styles.secondaryButton}>
                <ThemedText type="smallBold" style={styles.secondaryButtonText}>
                  Note e visioni ›
                </ThemedText>
              </Pressable>
            </View>
          ) : (
            <View style={styles.libraryActions}>
              <ThemedText type="small" themeColor="textSecondary">
                {LIBRARY_STATUS_LABELS[libraryItem.status]} ·{' '}
                {libraryItem.totalEpisodes != null
                  ? `${libraryItem.watchedEpisodes}/${libraryItem.totalEpisodes} ep.`
                  : `${libraryItem.watchedEpisodes} ep.`}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Tracking, note e visioni sono integrati nelle stagioni qui sotto.
              </ThemedText>
            </View>
          )}

          {actionError && (
            <ThemedText type="small" style={styles.actionError}>
              {actionError}
            </ThemedText>
          )}
        </ThemedView>

        <ThemedView type="backgroundElement" style={styles.section}>
          <ThemedText type="smallBold">Trama</ThemedText>
          <ThemedText type="small" themeColor={details.overview ? 'text' : 'textSecondary'}>
            {details.overview || 'Trama non disponibile in italiano.'}
          </ThemedText>
        </ThemedView>

        <ThemedView type="backgroundElement" style={styles.section}>
          <ThemedText type="smallBold">Informazioni</ThemedText>
          <View style={styles.infoGrid}>
            {releaseDate && (
              <Info label={details.mediaType === 'movie' ? 'Uscita' : 'Prima TV'} value={releaseDate} />
            )}
            {status && <Info label="Stato" value={status} />}
            {details.numberOfSeasons != null && (
              <Info label="Stagioni" value={String(details.numberOfSeasons)} />
            )}
            {details.numberOfEpisodes != null && (
              <Info label="Episodi" value={String(details.numberOfEpisodes)} />
            )}
          </View>
          {details.genres.length > 0 && (
            <View style={styles.genres}>
              {details.genres.map((genre) => (
                <MetaChip key={genre} label={genre} />
              ))}
            </View>
          )}
        </ThemedView>

        {details.nextEpisode && (
          <ThemedView type="backgroundElement" style={styles.section}>
            <ThemedText type="smallBold">Prossimo episodio</ThemedText>
            <ThemedText type="small">
              S{details.nextEpisode.seasonNumber} E{details.nextEpisode.episodeNumber} ·{' '}
              {details.nextEpisode.name}
            </ThemedText>
            {details.nextEpisode.airDate && (
              <ThemedText type="small" themeColor="textSecondary">
                {formatDate(details.nextEpisode.airDate)}
              </ThemedText>
            )}
          </ThemedView>
        )}

        {details.seasons.length > 0 && (
          <SeriesEpisodesContent
            key={`${details.id}-${libraryItem?.id ?? 'preview'}`}
            item={libraryItem}
            tmdbId={details.id}
            seasons={details.seasons}
            totalEpisodes={details.numberOfEpisodes}
            adding={actionBusy}
            onAddToLibrary={addCurrentTitle}
            onChanged={refreshLibraryItem}
          />
        )}

        <ThemedText type="small" themeColor="textSecondary" style={styles.source}>
          Dati forniti da TMDB.
        </ThemedText>
      </ScrollView>

      {libraryItem && showMovieViewings && (
        <MovieViewings
          item={libraryItem}
          onClose={() => setShowMovieViewings(false)}
          onChanged={refreshLibraryItem}
        />
      )}
    </ThemedView>
  );
}

function MetaChip({ label, accent = false }: { label: string; accent?: boolean }) {
  return (
    <View style={[styles.chip, accent && styles.chipAccent]}>
      <ThemedText type="small" style={accent ? styles.chipAccentText : undefined}>
        {label}
      </ThemedText>
    </View>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.info}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="smallBold">{value}</ThemedText>
    </View>
  );
}

function DetailMessage({
  title,
  body,
  onBack,
}: {
  title: string;
  body: string;
  onBack: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <ThemedView style={[styles.center, { paddingTop: insets.top + Spacing.three }]}>
      <ThemedText type="smallBold">{title}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.centerText}>
        {body}
      </ThemedText>
      <Pressable onPress={onBack} style={styles.messageBack}>
        <ThemedText type="smallBold" style={styles.messageBackText}>
          Indietro
        </ThemedText>
      </Pressable>
    </ThemedView>
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
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: Spacing.one,
  },
  backdropWrapper: {
    width: '100%',
    aspectRatio: 16 / 7,
    overflow: 'hidden',
    borderRadius: Spacing.three,
    backgroundColor: Brand.deepBlue,
  },
  backdrop: {
    width: '100%',
    height: '100%',
  },
  backdropOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(4,2,18,0.25)',
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  poster: {
    width: 120,
    aspectRatio: 2 / 3,
    borderRadius: Spacing.three,
    overflow: 'hidden',
  },
  posterFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroText: {
    flex: 1,
    gap: Spacing.two,
    paddingTop: Spacing.one,
  },
  title: {
    fontSize: 30,
    lineHeight: 36,
  },
  tagline: {
    fontStyle: 'italic',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Spacing.three,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  chipAccent: {
    backgroundColor: 'rgba(255,106,44,0.18)',
  },
  chipAccentText: {
    color: Brand.sunsetOrange,
  },
  section: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  libraryPanel: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  libraryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  libraryActions: {
    gap: Spacing.two,
  },
  statuses: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  statusChip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  statusChipActive: {
    backgroundColor: Brand.glowBlue,
  },
  statusChipTextActive: {
    color: Brand.pureWhite,
  },
  primaryButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Spacing.two,
    backgroundColor: Brand.glowBlue,
  },
  primaryButtonText: {
    color: Brand.pureWhite,
  },
  secondaryButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Spacing.two,
    backgroundColor: 'rgba(255,106,44,0.18)',
  },
  secondaryButtonText: {
    color: Brand.sunsetOrange,
  },
  removeText: {
    color: Brand.sunsetOrange,
  },
  actionError: {
    color: Brand.sunsetOrange,
  },
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.6,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  info: {
    minWidth: 120,
    gap: Spacing.half,
  },
  genres: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  source: {
    textAlign: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  centerText: {
    textAlign: 'center',
  },
  messageBack: {
    marginTop: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    backgroundColor: Brand.glowBlue,
  },
  messageBackText: {
    color: Brand.pureWhite,
  },
});
