import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
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
import { ExpandableQuotedText } from '@/components/expandable-quoted-text';
import { ProfileTrophyGrid } from '@/components/profile-trophy-grid';
import { Brand, MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import {
  getFollowedDiary,
  getFollowedLibrary,
  getFollowedProfile,
  getFollowedProfileTrophies,
  type FollowedDiaryEntry,
  type FollowedLibraryItem,
  type FollowedProfile,
  type FollowedProfileTrophy,
} from '@/services/follower-profile';
import { STATUS_LABELS, STATUS_ORDER, type LibraryStatus } from '@/services/library';

type ProfileTab = 'library' | 'diary';

const DIARY_PAGE_SIZE = 30;

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function formatDay(value: string): string {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const formatted = new Intl.DateTimeFormat('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export default function FollowerProfileScreen() {
  const params = useLocalSearchParams<{
    username?: string | string[];
    from?: string | string[];
  }>();
  const insets = useSafeAreaInsets();
  const { configured, session } = useAuth();
  const username = firstParam(params.username);
  const from = firstParam(params.from);
  const backTarget = from === '/inbox' ? '/inbox' : '/contacts';
  const [profile, setProfile] = useState<FollowedProfile | null>(null);
  const [library, setLibrary] = useState<FollowedLibraryItem[]>([]);
  const [diary, setDiary] = useState<FollowedDiaryEntry[]>([]);
  const [trophies, setTrophies] = useState<FollowedProfileTrophy[]>([]);
  const [trophyWarning, setTrophyWarning] = useState<string | null>(null);
  const [tab, setTab] = useState<ProfileTab>('library');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!configured || !session || !username) {
      return;
    }
    const requestedUsername = username;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      setTrophyWarning(null);
      try {
        const trophyRequest = getFollowedProfileTrophies(
          requestedUsername,
        )
          .then((value) => ({ value, error: null }))
          .catch((trophyError: unknown) => ({
            value: [] as FollowedProfileTrophy[],
            error: trophyError,
          }));
        const [nextProfile, nextLibrary, nextDiary] = await Promise.all([
          getFollowedProfile(requestedUsername),
          getFollowedLibrary(requestedUsername),
          getFollowedDiary(requestedUsername, DIARY_PAGE_SIZE, 0),
        ]);
        const trophyResult = await trophyRequest;
        if (!cancelled) {
          setProfile(nextProfile);
          setLibrary(nextLibrary);
          setDiary(nextDiary);
          setTrophies(trophyResult.value);
          if (trophyResult.error) {
            setTrophyWarning(
              trophyResult.error instanceof Error
                ? `Trofei non disponibili: ${trophyResult.error.message}`
                : 'Trofei non disponibili',
            );
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Impossibile caricare il profilo',
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
  }, [configured, session, username]);

  const libraryGroups = useMemo(
    () =>
      STATUS_ORDER.map((status) => ({
        status,
        items: library.filter((item) => item.status === status),
      })).filter((group) => group.items.length > 0),
    [library],
  );
  const diaryGroups = useMemo(() => {
    const grouped = new Map<string, FollowedDiaryEntry[]>();
    for (const entry of diary) {
      const entries = grouped.get(entry.watchedOn) ?? [];
      entries.push(entry);
      grouped.set(entry.watchedOn, entries);
    }
    return Array.from(grouped, ([date, entries]) => ({ date, entries }));
  }, [diary]);

  const topInset = Platform.OS === 'web' ? Spacing.six : insets.top + Spacing.three;
  const bottomInset = insets.bottom + Spacing.five;

  function goBack() {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace(backTarget);
  }

  function openTitle(item: FollowedLibraryItem | FollowedDiaryEntry) {
    router.push({
      pathname: '/title',
      params: {
        mediaType: item.mediaType,
        id: String(item.tmdbId),
        from: backTarget,
      },
    });
  }

  async function loadMoreDiary() {
    if (!profile || loadingMore || diary.length >= profile.diaryCount) {
      return;
    }
    setLoadingMore(true);
    setError(null);
    try {
      const nextEntries = await getFollowedDiary(
        profile.username,
        DIARY_PAGE_SIZE,
        diary.length,
      );
      setDiary((current) => [...current, ...nextEntries]);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Impossibile caricare altri ricordi',
      );
    } finally {
      setLoadingMore(false);
    }
  }

  if (configured && !session) {
    return null;
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
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

        {!configured ? (
          <StateMessage
            title="Supabase non configurato"
            body="Configura Supabase per consultare i profili."
          />
        ) : !username ? (
          <StateMessage
            title="Profilo non disponibile"
            body="Lo username richiesto non è valido."
          />
        ) : loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={Brand.glowBlue} />
          </View>
        ) : error && !profile ? (
          <StateMessage title="Profilo non disponibile" body={error} />
        ) : profile ? (
          <>
            <ThemedView type="backgroundElement" style={styles.hero}>
              <View style={styles.avatar}>
                <ThemedText type="subtitle" style={styles.avatarText}>
                  {profile.username.charAt(0).toUpperCase()}
                </ThemedText>
              </View>
              <View style={styles.heroCopy}>
                <ThemedText type="subtitle">
                  {profile.displayName || `@${profile.username}`}
                </ThemedText>
                <ThemedText type="smallBold" style={styles.username}>
                  @{profile.username}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Profilo condiviso con i follower accettati.
                </ThemedText>
              </View>
              <View style={styles.counts}>
                <ProfileCount value={profile.libraryCount} label="titoli" />
                <ProfileCount value={profile.diaryCount} label="ricordi" />
              </View>
            </ThemedView>

            <ProfileTrophyGrid
              key={profile.username}
              trophies={trophies}
              warning={trophyWarning}
            />

            <View style={styles.tabs}>
              <ProfileTabButton
                active={tab === 'library'}
                label={`Libreria · ${profile.libraryCount}`}
                onPress={() => setTab('library')}
              />
              <ProfileTabButton
                active={tab === 'diary'}
                label={`Diario · ${profile.diaryCount}`}
                onPress={() => setTab('diary')}
              />
            </View>

            {error && (
              <ThemedText type="small" style={styles.error}>
                {error}
              </ThemedText>
            )}

            {tab === 'library' ? (
              libraryGroups.length > 0 ? (
                libraryGroups.map((group) => (
                  <LibraryGroup
                    key={group.status}
                    status={group.status}
                    items={group.items}
                    onOpen={openTitle}
                  />
                ))
              ) : (
                <EmptyState
                  title="Libreria vuota"
                  body={`@${profile.username} non ha ancora aggiunto titoli.`}
                />
              )
            ) : diaryGroups.length > 0 ? (
              <>
                {diaryGroups.map((group) => (
                  <View key={group.date} style={styles.diaryDay}>
                    <ThemedText type="smallBold" themeColor="textSecondary">
                      {formatDay(group.date)}
                    </ThemedText>
                    {group.entries.map((entry) => (
                      <DiaryCard key={entry.id} entry={entry} onOpen={openTitle} />
                    ))}
                  </View>
                ))}
                {diary.length < profile.diaryCount && (
                  <Pressable
                    onPress={loadMoreDiary}
                    disabled={loadingMore}
                    style={({ pressed }) => [
                      styles.loadMore,
                      pressed && styles.pressed,
                    ]}>
                    {loadingMore ? (
                      <ActivityIndicator color={Brand.glowBlue} size="small" />
                    ) : (
                      <ThemedText type="smallBold" style={styles.loadMoreText}>
                        Carica altri ricordi
                      </ThemedText>
                    )}
                  </Pressable>
                )}
              </>
            ) : (
              <EmptyState
                title="Diario vuoto"
                body={`@${profile.username} non ha ancora condiviso ricordi.`}
              />
            )}
          </>
        ) : null}
      </ScrollView>
    </ThemedView>
  );
}

function ProfileCount({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.count}>
      <ThemedText type="smallBold">{value}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </View>
  );
}

function ProfileTabButton({
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
      onPress={onPress}
      style={({ pressed }) => [
        styles.tab,
        active && styles.tabActive,
        pressed && styles.pressed,
      ]}>
      <ThemedText type="smallBold" style={active ? styles.tabTextActive : undefined}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

function LibraryGroup({
  status,
  items,
  onOpen,
}: {
  status: LibraryStatus;
  items: FollowedLibraryItem[];
  onOpen: (item: FollowedLibraryItem) => void;
}) {
  return (
    <View style={styles.section}>
      <ThemedText type="smallBold" themeColor="textSecondary">
        {STATUS_LABELS[status]} · {items.length}
      </ThemedText>
      {items.map((item) => (
        <Pressable
          key={`${item.mediaType}-${item.tmdbId}`}
          onPress={() => onOpen(item)}
          style={({ pressed }) => pressed && styles.pressed}>
          <ThemedView type="backgroundElement" style={styles.libraryCard}>
            {item.posterUrl ? (
              <Image
                source={{ uri: item.posterUrl }}
                contentFit="cover"
                style={styles.poster}
              />
            ) : (
              <ThemedView type="backgroundSelected" style={styles.poster} />
            )}
            <View style={styles.cardCopy}>
              <ThemedText type="smallBold" numberOfLines={2}>
                {item.mediaType === 'movie' ? '🎬' : '📺'} {item.title}
              </ThemedText>
              {item.year && (
                <ThemedText type="small" themeColor="textSecondary">
                  {item.year}
                </ThemedText>
              )}
              {item.mediaType === 'tv' && (
                <ThemedText type="small" themeColor="textSecondary">
                  {item.totalEpisodes != null
                    ? `${item.watchedEpisodes}/${item.totalEpisodes} episodi`
                    : `${item.watchedEpisodes} episodi`}
                </ThemedText>
              )}
            </View>
            <ThemedText type="small" themeColor="textSecondary">
              ›
            </ThemedText>
          </ThemedView>
        </Pressable>
      ))}
    </View>
  );
}

function DiaryCard({
  entry,
  onOpen,
}: {
  entry: FollowedDiaryEntry;
  onOpen: (entry: FollowedDiaryEntry) => void;
}) {
  return (
    <Pressable
      onPress={() => onOpen(entry)}
      style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView type="backgroundElement" style={styles.diaryCard}>
        {entry.posterUrl ? (
          <Image
            source={{ uri: entry.posterUrl }}
            contentFit="cover"
            style={styles.poster}
          />
        ) : (
          <ThemedView type="backgroundSelected" style={styles.poster} />
        )}
        <View style={styles.cardCopy}>
          <View style={styles.diaryHeading}>
            <ThemedText type="smallBold" numberOfLines={2} style={styles.diaryTitle}>
              {entry.title}
            </ThemedText>
            {entry.rating != null && (
              <ThemedText type="smallBold" style={styles.rating}>
                ★ {entry.rating.toFixed(1)}
              </ThemedText>
            )}
          </View>
          <ThemedText type="small" themeColor="textSecondary">
            {entry.detail}
          </ThemedText>
          {entry.note ? (
            <ExpandableQuotedText text={entry.note} />
          ) : (
            <ThemedText type="small" themeColor="textSecondary">
              Visione valutata senza commento.
            </ThemedText>
          )}
        </View>
        <ThemedText type="small" themeColor="textSecondary">
          ›
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <ThemedView type="backgroundElement" style={styles.empty}>
      <ThemedText type="smallBold">{title}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.centerText}>
        {body}
      </ThemedText>
    </ThemedView>
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
  back: {
    alignSelf: 'flex-start',
    paddingVertical: Spacing.one,
  },
  backText: {
    color: Brand.glowBlue,
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: Spacing.four,
  },
  avatar: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 32,
    backgroundColor: Brand.softViolet,
  },
  avatarText: {
    color: Brand.pureWhite,
  },
  heroCopy: {
    minWidth: 160,
    flex: 1,
    gap: Spacing.half,
  },
  username: {
    color: Brand.softViolet,
  },
  counts: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  count: {
    minWidth: 64,
    alignItems: 'center',
    gap: Spacing.half,
    padding: Spacing.two,
    borderRadius: Spacing.two,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  tabs: {
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
  error: {
    color: Brand.sunsetOrange,
    textAlign: 'center',
  },
  section: {
    gap: Spacing.two,
  },
  libraryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.two,
    borderRadius: Spacing.three,
  },
  poster: {
    width: 58,
    height: 87,
    borderRadius: Spacing.two,
  },
  cardCopy: {
    flex: 1,
    minWidth: 0,
    gap: Spacing.half,
  },
  diaryDay: {
    gap: Spacing.two,
  },
  diaryCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
    padding: Spacing.two,
    borderRadius: Spacing.three,
  },
  diaryHeading: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  diaryTitle: {
    flex: 1,
  },
  rating: {
    color: Brand.sunsetOrange,
  },
  loadMore: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Spacing.three,
    backgroundColor: 'rgba(47,107,255,0.16)',
  },
  loadMoreText: {
    color: Brand.glowBlue,
  },
  empty: {
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.five,
    borderRadius: Spacing.four,
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
  pressed: {
    opacity: 0.8,
  },
});
