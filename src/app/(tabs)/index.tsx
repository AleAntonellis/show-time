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
  BottomTabInset,
  Brand,
  MaxContentWidth,
  Spacing,
  WebTabTopInset,
} from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { getLibrary, type LibraryItem } from '@/services/library';

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) {
    return 'Buongiorno';
  }
  if (hour < 18) {
    return 'Buon pomeriggio';
  }
  return 'Buona serata';
}

function openDetails(item: LibraryItem) {
  router.push({
    pathname: '/title',
    params: {
      mediaType: item.mediaType,
      id: String(item.tmdbId),
      from: '/',
    },
  });
}

export default function HomeTabScreen() {
  const insets = useSafeAreaInsets();
  const { session, configured } = useAuth();
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        setError(err instanceof Error ? err.message : 'Impossibile caricare la Home'),
      )
      .finally(() => setLoading(false));
  }, [configured, session]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (configured && !session) {
    return null;
  }

  const rawDisplayName = session?.user.user_metadata?.display_name;
  const displayName =
    typeof rawDisplayName === 'string' && rawDisplayName.trim()
      ? rawDisplayName.trim()
      : session?.user.email?.split('@')[0];
  const watching = items.filter(
    (item) => item.mediaType === 'tv' && item.status === 'watching',
  );
  const watchlist = items.filter((item) => item.status === 'to_watch');
  const completed = items.filter((item) => item.status === 'watched');
  const watchedEpisodes = items.reduce(
    (total, item) => total + (item.mediaType === 'tv' ? item.watchedEpisodes : 0),
    0,
  );
  const topInset = Platform.OS === 'web' ? WebTabTopInset : insets.top + Spacing.three;
  const bottomInset = insets.bottom + BottomTabInset + Spacing.four;

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingTop: topInset, paddingBottom: bottomInset },
        ]}>
        <ThemedView type="backgroundElement" style={styles.hero}>
          <View style={[styles.glow, styles.blueGlow]} />
          <View style={[styles.glow, styles.orangeGlow]} />
          <View style={styles.heroRow}>
            <Image
              source={require('@/assets/images/showtime-logo.png')}
              contentFit="contain"
              style={styles.logo}
            />
            <View style={styles.heroCopy}>
              <ThemedText type="small" themeColor="textSecondary">
                {greeting()}
                {displayName ? `, ${displayName}` : ''}
              </ThemedText>
              <ThemedText type="subtitle" style={styles.heroTitle}>
                Cosa guardiamo?
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Riprendi una serie o scegli il prossimo titolo per la serata.
              </ThemedText>
            </View>
          </View>
          <Pressable
            onPress={() => router.push('/search')}
            style={({ pressed }) => [styles.searchButton, pressed && styles.pressed]}>
            <ThemedText type="smallBold" style={styles.searchButtonText}>
              Cerca un titolo
            </ThemedText>
          </Pressable>
        </ThemedView>

        {!configured ? (
          <HomeMessage
            title="Collega la tua libreria"
            body="Configura Supabase in .env.local per vedere qui i tuoi titoli e progressi."
          />
        ) : loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={Brand.glowBlue} />
          </View>
        ) : error ? (
          <HomeMessage title="Ops" body={error} />
        ) : items.length === 0 ? (
          <ThemedView type="backgroundElement" style={styles.emptyLibrary}>
            <ThemedText type="smallBold">La tua serata parte da qui</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.centerText}>
              Cerca il primo film o la prima serie e aggiungila alla libreria.
            </ThemedText>
            <Pressable onPress={() => router.push('/search')} style={styles.primaryButton}>
              <ThemedText type="smallBold" style={styles.primaryButtonText}>
                Esplora TMDB
              </ThemedText>
            </Pressable>
          </ThemedView>
        ) : (
          <>
            <View style={styles.stats}>
              <Stat value={String(items.length)} label="Titoli" />
              <Stat value={String(watching.length)} label="In corso" />
              <Stat value={String(watchlist.length)} label="Da vedere" />
              <Stat value={String(watchedEpisodes)} label="Episodi visti" />
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View>
                  <ThemedText type="smallBold">Continua a guardare</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    Le serie che hai già iniziato.
                  </ThemedText>
                </View>
                <Pressable onPress={() => router.push('/library')} hitSlop={8}>
                  <ThemedText type="small" style={styles.linkText}>
                    Libreria ›
                  </ThemedText>
                </Pressable>
              </View>

              {watching.length === 0 ? (
                <ThemedView type="backgroundElement" style={styles.emptySection}>
                  <ThemedText type="small" themeColor="textSecondary">
                    Nessuna serie in corso. Apri una serie e segna il primo episodio.
                  </ThemedText>
                </ThemedView>
              ) : (
                watching.map((item) => <ContinueCard key={item.id} item={item} />)
              )}
            </View>

            <PosterSection
              title="Da vedere"
              subtitle="La tua selezione per le prossime serate."
              items={watchlist}
              emptyMessage="La lista è vuota: aggiungi qualcosa dalla ricerca."
            />

            {completed.length > 0 && (
              <PosterSection
                title="Completati di recente"
                subtitle="Film e serie già conclusi."
                items={completed}
                emptyMessage=""
              />
            )}
          </>
        )}

        {Platform.OS === 'web' && (
          <ThemedText type="small" themeColor="textSecondary" style={styles.installHint}>
            Suggerimento: “Aggiungi a Home” per installare ShowTime come app.
          </ThemedText>
        )}
      </ScrollView>
    </ThemedView>
  );
}

function ContinueCard({ item }: { item: LibraryItem }) {
  const progress =
    item.totalEpisodes && item.totalEpisodes > 0
      ? Math.min(item.watchedEpisodes / item.totalEpisodes, 1)
      : 0;

  return (
    <Pressable
      onPress={() => openDetails(item)}
      style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView type="backgroundElement" style={styles.continueCard}>
        {item.posterUrl ? (
          <Image source={{ uri: item.posterUrl }} contentFit="cover" style={styles.continuePoster} />
        ) : (
          <ThemedView type="backgroundSelected" style={styles.continuePoster} />
        )}
        <View style={styles.continueCopy}>
          <ThemedText type="smallBold" numberOfLines={2}>
            {item.title}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {item.totalEpisodes != null
              ? `${item.watchedEpisodes}/${item.totalEpisodes} episodi`
              : `${item.watchedEpisodes} episodi`}
          </ThemedText>
          {item.totalEpisodes != null && item.totalEpisodes > 0 && (
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
            </View>
          )}
          <ThemedText type="small" style={styles.continueLink}>
            Continua ›
          </ThemedText>
        </View>
      </ThemedView>
    </Pressable>
  );
}

function PosterSection({
  title,
  subtitle,
  items,
  emptyMessage,
}: {
  title: string;
  subtitle: string;
  items: LibraryItem[];
  emptyMessage: string;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View>
          <ThemedText type="smallBold">{title}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {subtitle}
          </ThemedText>
        </View>
      </View>
      {items.length === 0 ? (
        <ThemedView type="backgroundElement" style={styles.emptySection}>
          <ThemedText type="small" themeColor="textSecondary">
            {emptyMessage}
          </ThemedText>
        </ThemedView>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.posterList}>
          {items.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => openDetails(item)}
              style={({ pressed }) => [styles.posterCard, pressed && styles.pressed]}>
              {item.posterUrl ? (
                <Image
                  source={{ uri: item.posterUrl }}
                  contentFit="cover"
                  style={styles.poster}
                />
              ) : (
                <ThemedView type="backgroundSelected" style={styles.poster} />
              )}
              <ThemedText type="smallBold" numberOfLines={2}>
                {item.title}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {item.mediaType === 'movie' ? 'Film' : 'Serie TV'}
                {item.year ? ` · ${item.year}` : ''}
              </ThemedText>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <ThemedView type="backgroundElement" style={styles.stat}>
      <ThemedText type="smallBold" style={styles.statValue}>
        {value}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </ThemedView>
  );
}

function HomeMessage({ title, body }: { title: string; body: string }) {
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
    gap: Spacing.four,
  },
  hero: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: Spacing.four,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  glow: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    opacity: 0.2,
  },
  blueGlow: {
    left: -70,
    top: -90,
    backgroundColor: Brand.glowBlue,
  },
  orangeGlow: {
    right: -80,
    bottom: -110,
    backgroundColor: Brand.sunsetOrange,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  logo: {
    width: 92,
    height: 92,
    borderRadius: Spacing.three,
  },
  heroCopy: {
    flex: 1,
    gap: Spacing.one,
  },
  heroTitle: {
    fontSize: 30,
    lineHeight: 36,
  },
  searchButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Spacing.two,
    backgroundColor: Brand.glowBlue,
  },
  searchButtonText: {
    color: Brand.pureWhite,
  },
  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  stat: {
    flex: 1,
    minWidth: 120,
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.half,
  },
  statValue: {
    fontSize: 22,
    lineHeight: 28,
  },
  section: {
    gap: Spacing.two,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  linkText: {
    color: Brand.sunsetOrange,
  },
  continueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.two,
    borderRadius: Spacing.three,
  },
  continuePoster: {
    width: 70,
    height: 105,
    borderRadius: Spacing.two,
  },
  continueCopy: {
    flex: 1,
    gap: Spacing.one,
  },
  progressTrack: {
    height: 5,
    overflow: 'hidden',
    borderRadius: Spacing.one,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  progressFill: {
    height: '100%',
    borderRadius: Spacing.one,
    backgroundColor: Brand.glowBlue,
  },
  continueLink: {
    color: Brand.sunsetOrange,
    alignSelf: 'flex-start',
  },
  posterList: {
    gap: Spacing.three,
    paddingRight: Spacing.four,
  },
  posterCard: {
    width: 132,
    gap: Spacing.one,
  },
  poster: {
    width: 132,
    height: 198,
    borderRadius: Spacing.three,
  },
  emptySection: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  emptyLibrary: {
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.four,
    borderRadius: Spacing.four,
  },
  primaryButton: {
    minHeight: 44,
    minWidth: 180,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Spacing.two,
    backgroundColor: Brand.glowBlue,
    paddingHorizontal: Spacing.three,
  },
  primaryButtonText: {
    color: Brand.pureWhite,
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
  installHint: {
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.8,
  },
});
