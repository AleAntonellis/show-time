import { Image } from 'expo-image';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  MediaFilter,
  type MediaFilterValue,
} from '@/components/media-filter';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { getSavedKeys } from '@/services/library';
import {
  getPersonDetails,
  type MediaType,
  type PersonDetails,
  type PersonTitleCredit,
} from '@/services/tmdb';

type PersonRole = 'acting' | 'directing';
type LibraryMembership =
  | 'loading'
  | 'saved'
  | 'not_saved'
  | 'unavailable';

const PAGE_SIZE = 30;

const DEPARTMENT_LABELS: Record<string, string> = {
  Acting: 'Recitazione',
  Directing: 'Regia',
  Writing: 'Sceneggiatura',
  Production: 'Produzione',
  Editing: 'Montaggio',
  Camera: 'Fotografia',
  Sound: 'Suono',
  Art: 'Scenografia',
};

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function formatDate(value: string | null): string | null {
  if (!value) {
    return null;
  }
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) {
    return value;
  }
  return new Intl.DateTimeFormat('it-IT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, month - 1, day));
}

export default function PersonScreen() {
  const params = useLocalSearchParams<{
    id?: string | string[];
    from?: string | string[];
    mediaType?: string | string[];
    titleId?: string | string[];
  }>();
  const insets = useSafeAreaInsets();
  const { configured, session } = useAuth();
  const personIdParam = firstParam(params.id);
  const fromParam = firstParam(params.from);
  const sourceMediaTypeParam = firstParam(params.mediaType);
  const sourceTitleIdParam = firstParam(params.titleId);
  const personId = personIdParam ? Number(personIdParam) : Number.NaN;
  const validPersonId = Number.isInteger(personId) && personId > 0;
  const sourceMediaType: MediaType | null =
    sourceMediaTypeParam === 'movie' || sourceMediaTypeParam === 'tv'
      ? sourceMediaTypeParam
      : null;
  const sourceTitleId = sourceTitleIdParam
    ? Number(sourceTitleIdParam)
    : Number.NaN;

  const [person, setPerson] = useState<PersonDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryVersion, setRetryVersion] = useState(0);
  const [role, setRole] = useState<PersonRole | null>(null);
  const [actingFilter, setActingFilter] =
    useState<MediaFilterValue>('all');
  const [directingFilter, setDirectingFilter] =
    useState<MediaFilterValue>('all');
  const [biographyExpanded, setBiographyExpanded] = useState(false);
  const [visibleCounts, setVisibleCounts] = useState<Record<string, number>>(
    {},
  );
  const [savedKeys, setSavedKeys] = useState<Set<string> | null>(null);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const canUseLibrary = configured && Boolean(session);

  useEffect(() => {
    if (!validPersonId) {
      return;
    }
    let cancelled = false;
    getPersonDetails(personId)
      .then((nextPerson) => {
        if (!cancelled) {
          setPerson(nextPerson);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Impossibile caricare il profilo',
          );
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
  }, [personId, retryVersion, validPersonId]);

  useFocusEffect(
    useCallback(() => {
      if (!canUseLibrary) {
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
        .catch((err) => {
          if (!cancelled) {
            setLibraryError(
              err instanceof Error
                ? err.message
                : 'Impossibile leggere la libreria',
            );
          }
        });
      return () => {
        cancelled = true;
      };
    }, [canUseLibrary]),
  );

  const currentPerson = person?.id === personId ? person : null;
  const selectedRole: PersonRole =
    role ??
    (currentPerson?.acting.length === 0 &&
    currentPerson.directing.length > 0
      ? 'directing'
      : 'acting');
  const mediaFilter =
    selectedRole === 'acting' ? actingFilter : directingFilter;
  const credits =
    selectedRole === 'acting'
      ? (currentPerson?.acting ?? [])
      : (currentPerson?.directing ?? []);
  const filteredCredits =
    mediaFilter === 'all'
      ? credits
      : credits.filter((credit) => credit.mediaType === mediaFilter);
  const viewKey = `${selectedRole}-${mediaFilter}`;
  const visibleCount = visibleCounts[viewKey] ?? PAGE_SIZE;
  const visibleCredits = filteredCredits.slice(0, visibleCount);
  const remainingCredits = filteredCredits.length - visibleCredits.length;
  const topInset =
    Platform.OS === 'web' ? Spacing.six : insets.top + Spacing.three;
  const bottomInset = insets.bottom + Spacing.five;

  function goBack() {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    if (
      fromParam === '/title' &&
      sourceMediaType &&
      Number.isInteger(sourceTitleId) &&
      sourceTitleId > 0
    ) {
      router.replace({
        pathname: '/title',
        params: {
          mediaType: sourceMediaType,
          id: String(sourceTitleId),
          from: '/',
        },
      });
      return;
    }
    if (
      fromParam === '/' ||
      fromParam === '/search' ||
      fromParam === '/library' ||
      fromParam === '/stats' ||
      fromParam === '/trends' ||
      fromParam === '/diary' ||
      fromParam === '/calendar'
    ) {
      router.replace(fromParam);
      return;
    }
    router.replace('/');
  }

  function retry() {
    setLoading(true);
    setError(null);
    setRetryVersion((value) => value + 1);
  }

  function changeRole(nextRole: PersonRole) {
    setRole(nextRole);
  }

  function changeMediaFilter(nextFilter: MediaFilterValue) {
    if (selectedRole === 'acting') {
      setActingFilter(nextFilter);
    } else {
      setDirectingFilter(nextFilter);
    }
  }

  function openTitle(credit: PersonTitleCredit) {
    if (!currentPerson) {
      return;
    }
    router.push({
      pathname: '/title',
      params: {
        mediaType: credit.mediaType,
        id: String(credit.id),
        from: '/person',
        personId: String(currentPerson.id),
      },
    });
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingTop: topInset, paddingBottom: bottomInset },
        ]}>
        <Pressable onPress={goBack} style={styles.back} hitSlop={8}>
          <ThemedText type="smallBold" style={styles.backText}>
            ‹ Indietro
          </ThemedText>
        </Pressable>

        {!validPersonId ? (
          <StateMessage
            title="Profilo non disponibile"
            body="La persona richiesta non è valida."
          />
        ) : (loading || !currentPerson) && !error ? (
          <View style={styles.center}>
            <ActivityIndicator color={Brand.glowBlue} />
          </View>
        ) : error && !currentPerson ? (
          <View style={styles.center}>
            <StateMessage title="Profilo non disponibile" body={error} />
            <Pressable onPress={retry} hitSlop={8}>
              <ThemedText type="smallBold" style={styles.retryText}>
                Riprova
              </ThemedText>
            </Pressable>
          </View>
        ) : currentPerson ? (
          <>
            <ThemedView type="backgroundElement" style={styles.hero}>
              {currentPerson.profileUrl ? (
                <Image
                  source={{ uri: currentPerson.profileUrl }}
                  contentFit="cover"
                  transition={180}
                  style={styles.profilePhoto}
                />
              ) : (
                <ThemedView
                  type="backgroundSelected"
                  style={[styles.profilePhoto, styles.photoFallback]}>
                  <ThemedText type="title" themeColor="textSecondary">
                    {currentPerson.name.charAt(0).toUpperCase()}
                  </ThemedText>
                </ThemedView>
              )}
              <View style={styles.heroCopy}>
                <ThemedText type="subtitle">{currentPerson.name}</ThemedText>
                {currentPerson.knownForDepartment && (
                  <ThemedText type="smallBold" style={styles.department}>
                    {DEPARTMENT_LABELS[currentPerson.knownForDepartment] ??
                      currentPerson.knownForDepartment}
                  </ThemedText>
                )}
                {currentPerson.birthday && (
                  <PersonFact
                    label="Nascita"
                    value={formatDate(currentPerson.birthday) ?? ''}
                  />
                )}
                {currentPerson.deathday && (
                  <PersonFact
                    label="Morte"
                    value={formatDate(currentPerson.deathday) ?? ''}
                  />
                )}
                {currentPerson.placeOfBirth && (
                  <PersonFact
                    label="Luogo"
                    value={currentPerson.placeOfBirth}
                  />
                )}
              </View>
            </ThemedView>

            <ThemedView type="backgroundElement" style={styles.biography}>
              <ThemedText type="smallBold">Biografia</ThemedText>
              <ThemedText
                type="small"
                themeColor={
                  currentPerson.biography ? 'text' : 'textSecondary'
                }
                numberOfLines={biographyExpanded ? undefined : 5}>
                {currentPerson.biography ||
                  'Biografia non disponibile in italiano.'}
              </ThemedText>
              {currentPerson.biography.length > 280 && (
                <Pressable
                  onPress={() => setBiographyExpanded((value) => !value)}
                  hitSlop={8}>
                  <ThemedText type="smallBold" style={styles.expandText}>
                    {biographyExpanded ? 'Mostra meno' : 'Leggi tutto'}
                  </ThemedText>
                </Pressable>
              )}
            </ThemedView>

            <View style={styles.tabs}>
              <RoleTab
                active={selectedRole === 'acting'}
                label={`Interprete · ${currentPerson.acting.length}`}
                onPress={() => changeRole('acting')}
              />
              <RoleTab
                active={selectedRole === 'directing'}
                label={`Regia · ${currentPerson.directing.length}`}
                onPress={() => changeRole('directing')}
              />
            </View>

            <MediaFilter
              value={mediaFilter}
              onChange={changeMediaFilter}
            />

            {credits.length === 0 ? (
              <StateMessage
                title={
                  selectedRole === 'acting'
                    ? 'Nessun ruolo come interprete'
                    : 'Nessun titolo diretto'
                }
                body="TMDB non riporta crediti per questa sezione."
              />
            ) : filteredCredits.length === 0 ? (
              <StateMessage
                title={
                  mediaFilter === 'movie'
                    ? 'Nessun film'
                    : 'Nessuna serie TV'
                }
                body="Non ci sono crediti di questo tipo."
              />
            ) : (
              <View style={styles.filmography}>
                <ThemedText type="smallBold" themeColor="textSecondary">
                  Filmografia · {filteredCredits.length}
                </ThemedText>
                {libraryError && (
                  <ThemedText type="small" style={styles.libraryError}>
                    Stato libreria non disponibile: {libraryError}
                  </ThemedText>
                )}
                {visibleCredits.map((credit) => (
                  <PersonCreditCard
                    key={`${credit.mediaType}-${credit.id}`}
                    credit={credit}
                    libraryMembership={
                      !canUseLibrary || libraryError
                        ? 'unavailable'
                        : !savedKeys
                          ? 'loading'
                          : savedKeys.has(
                                `${credit.mediaType}-${credit.id}`,
                              )
                            ? 'saved'
                            : 'not_saved'
                    }
                    onPress={() => openTitle(credit)}
                  />
                ))}
                {remainingCredits > 0 && (
                  <Pressable
                    onPress={() =>
                      setVisibleCounts((current) => ({
                        ...current,
                        [viewKey]: visibleCount + PAGE_SIZE,
                      }))
                    }
                    style={({ pressed }) => [
                      styles.showMore,
                      pressed && styles.pressed,
                    ]}>
                    <ThemedText type="smallBold" style={styles.showMoreText}>
                      Mostra altri · {Math.min(PAGE_SIZE, remainingCredits)}
                    </ThemedText>
                  </Pressable>
                )}
              </View>
            )}
          </>
        ) : null}
      </ScrollView>
    </ThemedView>
  );
}

function PersonFact({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fact}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="small">{value}</ThemedText>
    </View>
  );
}

function RoleTab({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tab,
        active && styles.tabActive,
        pressed && styles.pressed,
      ]}>
      <ThemedText
        type="smallBold"
        style={active ? styles.tabTextActive : undefined}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

function PersonCreditCard({
  credit,
  libraryMembership,
  onPress,
}: {
  credit: PersonTitleCredit;
  libraryMembership: LibraryMembership;
  onPress: () => void;
}) {
  const libraryLabel =
    libraryMembership === 'saved'
      ? '✓ In libreria'
      : libraryMembership === 'not_saved'
        ? 'Non in libreria'
        : libraryMembership === 'loading'
          ? 'Verifica libreria…'
          : 'Libreria non disponibile';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Apri ${credit.title}`}
      onPress={onPress}
      style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView type="backgroundElement" style={styles.creditCard}>
        {credit.posterUrl ? (
          <Image
            source={{ uri: credit.posterUrl }}
            contentFit="cover"
            transition={150}
            style={styles.poster}
          />
        ) : (
          <ThemedView type="backgroundSelected" style={styles.poster} />
        )}
        <View style={styles.creditCopy}>
          <ThemedText type="smallBold" numberOfLines={2}>
            {credit.mediaType === 'movie' ? '🎬' : '📺'} {credit.title}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {credit.mediaType === 'movie' ? 'Film' : 'Serie TV'}
            {credit.year ? ` · ${credit.year}` : ''}
          </ThemedText>
          {credit.credit && (
            <ThemedText type="small" style={styles.creditRole} numberOfLines={2}>
              {credit.credit}
            </ThemedText>
          )}
          <View
            style={[
              styles.libraryBadge,
              libraryMembership === 'saved' && styles.libraryBadgeSaved,
            ]}>
            <ThemedText
              type="small"
              style={
                libraryMembership === 'saved'
                  ? styles.libraryBadgeTextSaved
                  : styles.libraryBadgeText
              }>
              {libraryLabel}
            </ThemedText>
          </View>
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
    <View style={styles.stateMessage}>
      <ThemedText type="smallBold">{title}</ThemedText>
      <ThemedText
        type="small"
        themeColor="textSecondary"
        style={styles.centerText}>
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
  back: {
    alignSelf: 'flex-start',
  },
  backText: {
    color: Brand.sunsetOrange,
  },
  hero: {
    width: '100%',
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.four,
  },
  profilePhoto: {
    width: 112,
    height: 168,
    borderRadius: Spacing.three,
  },
  photoFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCopy: {
    flex: 1,
    minWidth: 0,
    gap: Spacing.two,
  },
  department: {
    color: Brand.softViolet,
  },
  fact: {
    gap: Spacing.half,
  },
  biography: {
    width: '100%',
    minWidth: 0,
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  expandText: {
    color: Brand.glowBlue,
    alignSelf: 'flex-start',
  },
  tabs: {
    width: '100%',
    flexDirection: 'row',
    gap: Spacing.two,
  },
  tab: {
    minHeight: 44,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.three,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  tabActive: {
    backgroundColor: Brand.glowBlue,
  },
  tabTextActive: {
    color: Brand.pureWhite,
  },
  filmography: {
    width: '100%',
    minWidth: 0,
    gap: Spacing.two,
  },
  creditCard: {
    width: '100%',
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.two,
    borderRadius: Spacing.three,
  },
  poster: {
    width: 64,
    height: 96,
    borderRadius: Spacing.two,
  },
  creditCopy: {
    flex: 1,
    minWidth: 0,
    gap: Spacing.half,
  },
  creditRole: {
    color: Brand.softViolet,
  },
  libraryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Spacing.three,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  libraryBadgeSaved: {
    backgroundColor: 'rgba(106,76,255,0.18)',
  },
  libraryBadgeText: {
    color: 'rgba(255,255,255,0.60)',
  },
  libraryBadgeTextSaved: {
    color: Brand.softViolet,
  },
  libraryError: {
    color: Brand.sunsetOrange,
  },
  showMore: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.one,
    borderRadius: Spacing.three,
    backgroundColor: 'rgba(47,107,255,0.14)',
  },
  showMoreText: {
    color: Brand.glowBlue,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.six,
  },
  stateMessage: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.four,
  },
  centerText: {
    textAlign: 'center',
  },
  retryText: {
    color: Brand.glowBlue,
  },
  pressed: {
    opacity: 0.8,
  },
});
