import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
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
import {
  MovieWatchChoiceModal,
  type MovieWatchChoiceMode,
} from '@/components/movie-watch-choice-modal';
import { FollowedTitleActivity } from '@/components/followed-title-activity';
import { InternalShareModal } from '@/components/internal-share-modal';
import { SeriesEpisodesContent } from '@/components/series-episodes';
import { SeriesViewings } from '@/components/series-viewings';
import { ShareInviteBanner } from '@/components/share-invite-banner';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TitleCreditsSections } from '@/components/title-credits-sections';
import { WatchProvidersSection } from '@/components/watch-providers-section';
import { BottomTabInset, Brand, MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import {
  addToLibrary,
  canReclassifyMovieWatch,
  getLibraryDisplayStatus,
  getLibraryItemByTmdb,
  MOVIE_STATUSES,
  recordMovieWatched,
  reclassifyMovieWatched,
  removeFromLibrary,
  setSeriesTrackingState,
  STATUS_LABELS as LIBRARY_STATUS_LABELS,
  updateStatus,
  type LibraryItem,
  type LibraryStatus,
  type MovieWatchSource,
} from '@/services/library';
import type { SeriesTrackingState } from '@/utils/series-tracking-state';
import {
  createTitleShareInvite,
  revokeTitleShareInvite,
} from '@/services/social';
import { shareTitle } from '@/services/sharing';
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
    invite?: string | string[];
    personId?: string | string[];
  }>();
  const insets = useSafeAreaInsets();
  const { session, configured: supabaseConfigured } = useAuth();
  const mediaTypeParam = firstParam(params.mediaType);
  const idParam = firstParam(params.id);
  const fromParam = firstParam(params.from);
  const inviteToken = firstParam(params.invite);
  const personIdParam = firstParam(params.personId);
  const backTarget =
    fromParam === '/' ||
    fromParam === '/library' ||
    fromParam === '/search' ||
    fromParam === '/stats' ||
    fromParam === '/trends' ||
    fromParam === '/reminders' ||
    fromParam === '/diary' ||
    fromParam === '/calendar' ||
    fromParam === '/inbox' ||
    fromParam === '/contacts' ||
    fromParam === '/settings'
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
  const [initialMovieRecord, setInitialMovieRecord] = useState(false);
  const [showSeriesViewings, setShowSeriesViewings] = useState(false);
  const [movieWatchChoiceMode, setMovieWatchChoiceMode] =
    useState<MovieWatchChoiceMode | null>(null);
  const [sharing, setSharing] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);
  const [showInternalShare, setShowInternalShare] = useState(false);
  const [internalShareFeedback, setInternalShareFeedback] = useState<string | null>(
    null,
  );

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
    const personId = personIdParam ? Number(personIdParam) : Number.NaN;
    if (
      fromParam === '/person' &&
      Number.isInteger(personId) &&
      personId > 0
    ) {
      router.replace({
        pathname: '/person',
        params: { id: String(personId) },
      });
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

  async function changeSeriesState(state: SeriesTrackingState) {
    if (
      !libraryItem ||
      libraryItem.mediaType !== 'tv' ||
      libraryItem.status !== 'watching' ||
      actionBusy
    ) {
      return;
    }
    setActionBusy(true);
    setActionError(null);
    try {
      await setSeriesTrackingState(libraryItem.id, state);
      setLibraryItem({
        ...libraryItem,
        seriesTrackingState: state,
      });
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : 'Impossibile aggiornare lo stato della serie',
      );
    } finally {
      setActionBusy(false);
    }
  }

  async function markMovieWatched(source: MovieWatchSource) {
    if (!libraryItem || !movieWatchChoiceMode || actionBusy) {
      return;
    }
    const choiceMode = movieWatchChoiceMode;
    setMovieWatchChoiceMode(null);
    setActionBusy(true);
    setActionError(null);
    try {
      if (choiceMode === 'reclassify') {
        await reclassifyMovieWatched(libraryItem, source);
      } else {
        await recordMovieWatched(
          libraryItem.id,
          source,
          libraryItem.importedViewings,
        );
      }
      await refreshLibraryItem();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Impossibile registrare la visione',
      );
    } finally {
      setActionBusy(false);
    }
  }

  function selectMovieWatchSource(source: MovieWatchSource) {
    if (
      movieWatchChoiceMode === 'record' &&
      source === 'tracked'
    ) {
      setMovieWatchChoiceMode(null);
      setInitialMovieRecord(true);
      setShowMovieViewings(true);
      return;
    }
    void markMovieWatched(source);
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

  async function shareCurrentTitle() {
    if (!details || sharing) {
      return;
    }
    setSharing(true);
    setShareFeedback(null);
    setShareError(null);
    let createdInviteToken: string | null = null;
    try {
      createdInviteToken = await createTitleShareInvite(details);
      const result = await shareTitle({
        mediaType: details.mediaType,
        tmdbId: details.id,
        title: details.title,
        inviteToken: createdInviteToken,
      });
      if (result === 'copied') {
        setShareFeedback('Link copiato');
      } else if (result === 'shared') {
        setShareFeedback('Condiviso');
      } else if (result === 'dismissed') {
        await revokeTitleShareInvite(createdInviteToken);
      }
    } catch (err) {
      const originalMessage =
        err instanceof Error ? err.message : 'Impossibile condividere il titolo';
      if (createdInviteToken) {
        try {
          await revokeTitleShareInvite(createdInviteToken);
        } catch (revokeError) {
          const revokeMessage =
            revokeError instanceof Error
              ? revokeError.message
              : 'revoca invito non riuscita';
          setShareError(`${originalMessage}; ${revokeMessage}`);
          return;
        }
      }
      setShareError(originalMessage);
    } finally {
      setSharing(false);
    }
  }

  function removeInviteFromUrl() {
    if (!details) {
      return;
    }
    router.replace({
      pathname: '/title',
      params: {
        mediaType: details.mediaType,
        id: String(details.id),
      },
    });
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
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingTop: topInset, paddingBottom: bottomInset },
        ]}>
        <Pressable onPress={goBack} hitSlop={8} style={styles.backButton}>
          <ThemedText type="smallBold">‹ Indietro</ThemedText>
        </Pressable>

        {inviteToken && (
          <ShareInviteBanner
            token={inviteToken}
            mediaType={details.mediaType}
            tmdbId={details.id}
            onOpenOnly={removeInviteFromUrl}
          />
        )}

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
            <View style={styles.shareActions}>
              <Pressable
                accessibilityLabel={`Invia ${details.title} su ShowTime`}
                onPress={() => {
                  setInternalShareFeedback(null);
                  setShowInternalShare(true);
                }}
                style={({ pressed }) => [
                  styles.internalShareButton,
                  pressed && styles.pressed,
                ]}>
                <SymbolView
                  name={{ ios: 'paperplane.fill', android: 'send', web: 'send' }}
                  tintColor={Brand.softViolet}
                  size={18}
                />
                <ThemedText type="smallBold" style={styles.internalShareButtonText}>
                  {internalShareFeedback ?? 'Invia su ShowTime'}
                </ThemedText>
              </Pressable>
              <Pressable
                accessibilityLabel={`Condividi ${details.title} con altre app`}
                onPress={shareCurrentTitle}
                disabled={sharing}
                style={({ pressed }) => [
                  styles.shareButton,
                  pressed && styles.pressed,
                  sharing && styles.disabled,
                ]}>
                {sharing ? (
                  <ActivityIndicator color={Brand.glowBlue} size="small" />
                ) : (
                  <>
                    <SymbolView
                      name={{
                        ios: 'square.and.arrow.up',
                        android: 'share',
                        web: 'share',
                      }}
                      tintColor={Brand.glowBlue}
                      size={18}
                    />
                    <ThemedText type="smallBold" style={styles.shareButtonText}>
                      {shareFeedback ?? 'Altre app'}
                    </ThemedText>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        </View>

        {shareError && (
          <ThemedText type="small" style={styles.actionError}>
            {shareError}
          </ThemedText>
        )}

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
                      onPress={() => {
                        if (movieStatus === 'watched') {
                          if (libraryItem.status !== 'watched') {
                            setMovieWatchChoiceMode('record');
                          } else if (canReclassifyMovieWatch(libraryItem)) {
                            setMovieWatchChoiceMode('reclassify');
                          }
                        } else {
                          void changeMovieStatus(movieStatus);
                        }
                      }}
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
              {libraryItem.status === 'watched' &&
                (libraryItem.importedViewings > 0 ||
                  libraryItem.viewingCount > 0) && (
                <View style={styles.watchSummary}>
                  <ThemedText type="small" themeColor="textSecondary">
                    {[
                      libraryItem.importedViewings > 0
                        ? `${libraryItem.importedViewings} ${
                            libraryItem.importedViewings === 1
                              ? 'visione importata'
                              : 'visioni importate'
                          }`
                        : null,
                      libraryItem.viewingCount > 0
                        ? `${libraryItem.viewingCount} ${
                            libraryItem.viewingCount === 1
                              ? 'visione registrata'
                              : 'visioni registrate'
                          }`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </ThemedText>
                  {canReclassifyMovieWatch(libraryItem) && (
                    <Pressable
                      onPress={() => setMovieWatchChoiceMode('reclassify')}
                      disabled={actionBusy}
                      hitSlop={8}>
                      <ThemedText type="smallBold" style={styles.originLink}>
                        Modifica origine ›
                      </ThemedText>
                    </Pressable>
                  )}
                </View>
              )}
              <Pressable
                onPress={() => {
                  setInitialMovieRecord(false);
                  setShowMovieViewings(true);
                }}
                style={styles.secondaryButton}>
                <ThemedText type="smallBold" style={styles.secondaryButtonText}>
                  Note e visioni ›
                </ThemedText>
              </Pressable>
            </View>
          ) : (
            <View style={styles.libraryActions}>
              <ThemedText type="small" themeColor="textSecondary">
                {LIBRARY_STATUS_LABELS[
                  getLibraryDisplayStatus(libraryItem)
                ]}{' '}
                ·{' '}
                {libraryItem.totalEpisodes != null
                  ? `${libraryItem.watchedEpisodes}/${libraryItem.totalEpisodes} ep.`
                  : `${libraryItem.watchedEpisodes} ep.`}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Tracking, note e visioni sono integrati nelle stagioni qui sotto.
              </ThemedText>
              <Pressable
                onPress={() => setShowSeriesViewings(true)}
                style={styles.secondaryButton}>
                <ThemedText type="smallBold" style={styles.secondaryButtonText}>
                  Note e visioni ›
                </ThemedText>
              </Pressable>
              {libraryItem.status === 'watching' && (
                <View style={styles.seriesStateActions}>
                  {libraryItem.seriesTrackingState === 'active' ? (
                    <SeriesStateAction
                      label="Abbandona serie"
                      destructive
                      disabled={actionBusy}
                      onPress={() =>
                        void changeSeriesState('abandoned')
                      }
                    />
                  ) : (
                    <SeriesStateAction
                      label="Riprendi serie"
                      active
                      disabled={actionBusy}
                      onPress={() => void changeSeriesState('active')}
                    />
                  )}
                </View>
              )}
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
          {canUseLibrary && (
            <WatchProvidersSection
              mediaType={details.mediaType}
              tmdbId={details.id}
            />
          )}
        </ThemedView>

        <TitleCreditsSections
          key={`credits-${details.mediaType}-${details.id}`}
          mediaType={details.mediaType}
          tmdbId={details.id}
        />

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

        {canUseLibrary && (
          <FollowedTitleActivity
            key={`${details.mediaType}-${details.id}`}
            mediaType={details.mediaType}
            tmdbId={details.id}
          />
        )}

        <ThemedText type="small" themeColor="textSecondary" style={styles.source}>
          Dati forniti da TMDB.
        </ThemedText>
      </ScrollView>

      {libraryItem && showMovieViewings && (
        <MovieViewings
          item={libraryItem}
          initialRecord={initialMovieRecord}
          onClose={() => {
            setShowMovieViewings(false);
            setInitialMovieRecord(false);
          }}
          onChanged={refreshLibraryItem}
        />
      )}
      {libraryItem && showSeriesViewings && (
        <SeriesViewings
          item={libraryItem}
          onClose={() => setShowSeriesViewings(false)}
          onChanged={refreshLibraryItem}
        />
      )}
      {libraryItem && movieWatchChoiceMode && (
        <MovieWatchChoiceModal
          item={libraryItem}
          mode={movieWatchChoiceMode}
          onClose={() => setMovieWatchChoiceMode(null)}
          onSelect={selectMovieWatchSource}
        />
      )}
      {showInternalShare && (
        <InternalShareModal
          details={details}
          onClose={() => setShowInternalShare(false)}
          onSent={(username) => {
            setShowInternalShare(false);
            setInternalShareFeedback(`Inviato a @${username}`);
          }}
        />
      )}
    </ThemedView>
  );
}

function SeriesStateAction({
  label,
  active = false,
  destructive = false,
  disabled,
  onPress,
}: {
  label: string;
  active?: boolean;
  destructive?: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.seriesStateButton,
        active && styles.seriesStateButtonActive,
        destructive && styles.seriesStateButtonDestructive,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}>
      <ThemedText
        type="smallBold"
        style={[
          styles.seriesStateButtonText,
          active && styles.seriesStateButtonTextActive,
          destructive && styles.seriesStateButtonTextDestructive,
        ]}>
        {label}
      </ThemedText>
    </Pressable>
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
  scroll: {
    width: '100%',
  },
  content: {
    width: '100%',
    minWidth: 0,
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
  shareButton: {
    minHeight: 40,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    backgroundColor: 'rgba(47,107,255,0.14)',
  },
  shareActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  internalShareButton: {
    minHeight: 40,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    backgroundColor: 'rgba(106,76,255,0.16)',
  },
  internalShareButtonText: {
    color: Brand.softViolet,
  },
  shareButtonText: {
    color: Brand.glowBlue,
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
  watchSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  originLink: {
    color: Brand.softViolet,
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
  seriesStateActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  seriesStateButton: {
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  seriesStateButtonActive: {
    backgroundColor: Brand.glowBlue,
  },
  seriesStateButtonDestructive: {
    backgroundColor: 'rgba(255,106,44,0.14)',
  },
  seriesStateButtonText: {
    color: Brand.softViolet,
  },
  seriesStateButtonTextActive: {
    color: Brand.pureWhite,
  },
  seriesStateButtonTextDestructive: {
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
