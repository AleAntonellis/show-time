import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
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
import { getDiaryEntries, type RecentActivity } from '@/services/statistics';
import type { MediaType } from '@/services/tmdb';

type Filter = 'all' | MediaType;

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Tutto' },
  { value: 'movie', label: 'Film' },
  { value: 'tv', label: 'Serie TV' },
];

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

function openEntry(entry: RecentActivity) {
  router.push({
    pathname: '/title',
    params: {
      mediaType: entry.mediaType,
      id: String(entry.tmdbId),
      from: '/diary',
    },
  });
}

export default function DiaryTabScreen() {
  const insets = useSafeAreaInsets();
  const { session, configured } = useAuth();
  const [entries, setEntries] = useState<RecentActivity[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!configured || !session) {
        setLoading(false);
        return;
      }
      let cancelled = false;
      setLoading(true);
      setError(null);

      getDiaryEntries()
        .then((nextEntries) => {
          if (!cancelled) {
            setEntries(nextEntries);
          }
        })
        .catch((err: unknown) => {
          if (!cancelled) {
            setError(err instanceof Error ? err.message : 'Impossibile caricare il Diario');
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
    }, [configured, session]),
  );

  const filteredEntries = useMemo(
    () =>
      filter === 'all'
        ? entries
        : entries.filter((entry) => entry.mediaType === filter),
    [entries, filter],
  );
  const groups = useMemo(() => {
    const grouped = new Map<string, RecentActivity[]>();
    for (const entry of filteredEntries) {
      const current = grouped.get(entry.watchedOn) ?? [];
      current.push(entry);
      grouped.set(entry.watchedOn, current);
    }
    return Array.from(grouped, ([date, dayEntries]) => ({ date, entries: dayEntries }));
  }, [filteredEntries]);
  const topInset = Platform.OS === 'web' ? WebTabTopInset : insets.top + Spacing.three;
  const bottomInset = insets.bottom + BottomTabInset + Spacing.four;

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
        <ThemedView type="backgroundElement" style={styles.hero}>
          <View style={styles.heroCopy}>
            <ThemedText type="small" themeColor="textSecondary">
              Ricordi di visione
            </ThemedText>
            <ThemedText type="subtitle" style={styles.heroTitle}>
              Diario
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Le visioni a cui hai assegnato un voto o lasciato un commento.
            </ThemedText>
          </View>
          <View style={styles.countBadge}>
            <ThemedText type="smallBold" style={styles.countValue}>
              {entries.length}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              ricordi
            </ThemedText>
          </View>
        </ThemedView>

        <View style={styles.filters}>
          {FILTERS.map((option) => {
            const active = option.value === filter;
            return (
              <Pressable
                key={option.value}
                onPress={() => setFilter(option.value)}
                style={[styles.filter, active && styles.filterActive]}>
                <ThemedText
                  type="smallBold"
                  style={active ? styles.filterTextActive : undefined}>
                  {option.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

        {!configured ? (
          <StateMessage
            title="Supabase non configurato"
            body="Configura la libreria per costruire il tuo Diario."
          />
        ) : loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={Brand.glowBlue} />
          </View>
        ) : error ? (
          <StateMessage title="Ops" body={error} />
        ) : groups.length === 0 ? (
          <ThemedView type="backgroundElement" style={styles.empty}>
            <ThemedText type="smallBold">Nessun ricordo da mostrare</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.centerText}>
              Aggiungi una nota o un voto a una visione per farla comparire qui.
            </ThemedText>
          </ThemedView>
        ) : (
          groups.map((group) => (
            <View key={group.date} style={styles.day}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                {formatDay(group.date)}
              </ThemedText>
              {group.entries.map((entry) => (
                <Pressable
                  key={entry.id}
                  onPress={() => openEntry(entry)}
                  style={({ pressed }) => pressed && styles.pressed}>
                  <ThemedView type="backgroundElement" style={styles.entry}>
                    {entry.posterUrl ? (
                      <Image
                        source={{ uri: entry.posterUrl }}
                        contentFit="cover"
                        style={styles.poster}
                      />
                    ) : (
                      <ThemedView type="backgroundSelected" style={styles.poster} />
                    )}
                    <View style={styles.entryCopy}>
                      <View style={styles.entryHeading}>
                        <ThemedText type="smallBold" numberOfLines={1} style={styles.title}>
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
                        <ThemedText type="small" style={styles.note}>
                          “{entry.note}”
                        </ThemedText>
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
              ))}
            </View>
          ))
        )}
      </ScrollView>
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
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    borderRadius: Spacing.four,
    padding: Spacing.four,
  },
  heroCopy: {
    flex: 1,
    gap: Spacing.one,
  },
  heroTitle: {
    fontSize: 30,
    lineHeight: 36,
  },
  countBadge: {
    minWidth: 88,
    alignItems: 'center',
    gap: Spacing.half,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    backgroundColor: 'rgba(106,76,255,0.16)',
  },
  countValue: {
    color: Brand.softViolet,
    fontSize: 24,
    lineHeight: 28,
  },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  filter: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  filterActive: {
    backgroundColor: Brand.softViolet,
  },
  filterTextActive: {
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
  empty: {
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Spacing.four,
    padding: Spacing.five,
  },
  day: {
    gap: Spacing.two,
  },
  entry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderRadius: Spacing.three,
    padding: Spacing.two,
  },
  poster: {
    width: 52,
    height: 78,
    borderRadius: Spacing.two,
  },
  entryCopy: {
    flex: 1,
    gap: Spacing.half,
  },
  entryHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  title: {
    flex: 1,
  },
  rating: {
    color: Brand.sunsetOrange,
  },
  note: {
    fontStyle: 'italic',
  },
  pressed: {
    opacity: 0.8,
  },
});
