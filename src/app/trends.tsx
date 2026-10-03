import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
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
import { useWeeklyTrends } from '@/hooks/use-weekly-trends';
import type { Title } from '@/services/tmdb';

export default function WeeklyTrendsScreen() {
  const insets = useSafeAreaInsets();
  const { configured, session } = useAuth();
  const [mediaFilter, setMediaFilter] = useState<MediaFilterValue>('all');
  const {
    titles,
    loading,
    error,
    retry,
  } = useWeeklyTrends(mediaFilter, !configured || Boolean(session));
  const topInset =
    Platform.OS === 'web' ? Spacing.six : insets.top + Spacing.three;
  const bottomInset = insets.bottom + Spacing.five;

  if (configured && !session) {
    return null;
  }

  function goBack() {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/');
  }

  function openTitle(item: Title) {
    router.push({
      pathname: '/title',
      params: {
        mediaType: item.mediaType,
        id: String(item.id),
        from: '/trends',
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

        <ThemedText type="subtitle" style={styles.heading}>
          Trend della settimana
        </ThemedText>

        <MediaFilter value={mediaFilter} onChange={setMediaFilter} />

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={Brand.glowBlue} />
          </View>
        ) : error ? (
          <ThemedView type="backgroundElement" style={styles.stateCard}>
            <ThemedText type="smallBold">Trend non disponibili</ThemedText>
            <ThemedText
              type="small"
              themeColor="textSecondary"
              style={styles.centerText}>
              {error}
            </ThemedText>
            <Pressable onPress={retry} hitSlop={8}>
              <ThemedText type="smallBold" style={styles.retryText}>
                Riprova
              </ThemedText>
            </Pressable>
          </ThemedView>
        ) : titles.length === 0 ? (
          <ThemedView type="backgroundElement" style={styles.stateCard}>
            <ThemedText type="small" themeColor="textSecondary">
              Nessun titolo disponibile.
            </ThemedText>
          </ThemedView>
        ) : (
          <View style={styles.section}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              Trend · {titles.length}
            </ThemedText>
            {titles.map((item, index) => (
              <Pressable
                key={`${item.mediaType}-${item.id}`}
                onPress={() => openTitle(item)}
                style={({ pressed }) => pressed && styles.pressed}>
                <ThemedView type="backgroundElement" style={styles.row}>
                  {item.posterUrl ? (
                    <Image
                      source={{ uri: item.posterUrl }}
                      contentFit="cover"
                      transition={150}
                      style={styles.thumb}
                    />
                  ) : (
                    <ThemedView
                      type="backgroundSelected"
                      style={styles.thumb}
                    />
                  )}
                  <View style={styles.rowBody}>
                    <ThemedText type="smallBold" numberOfLines={2}>
                      {item.mediaType === 'movie' ? '🎬' : '📺'} {item.title}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      #{index + 1} ·{' '}
                      {item.mediaType === 'movie' ? 'Film' : 'Serie TV'}
                      {item.year ? ` · ${item.year}` : ''}
                    </ThemedText>
                    <ThemedText type="small" style={styles.detailLink}>
                      Dettagli ›
                    </ThemedText>
                  </View>
                </ThemedView>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
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
  back: {
    alignSelf: 'flex-start',
  },
  backText: {
    color: Brand.sunsetOrange,
  },
  heading: {
    textAlign: 'center',
  },
  section: {
    width: '100%',
    minWidth: 0,
    gap: Spacing.two,
  },
  row: {
    width: '100%',
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    padding: Spacing.two,
    gap: Spacing.three,
    borderRadius: Spacing.three,
  },
  thumb: {
    width: 54,
    height: 81,
    borderRadius: Spacing.two,
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
    gap: Spacing.one,
  },
  detailLink: {
    color: Brand.sunsetOrange,
    alignSelf: 'flex-start',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.six,
  },
  stateCard: {
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.four,
    borderRadius: Spacing.three,
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
