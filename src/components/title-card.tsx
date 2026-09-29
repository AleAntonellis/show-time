import { Image } from 'expo-image';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, Spacing } from '@/constants/theme';
import type { Title } from '@/services/tmdb';

const POSTER_RATIO = 2 / 3;

type Props = {
  title: Title;
  saved?: boolean;
  busy?: boolean;
  onSave?: () => void;
};

export function TitleCard({ title, saved, busy, onSave }: Props) {
  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <View style={styles.posterWrapper}>
        {title.posterUrl ? (
          <Image
            source={{ uri: title.posterUrl }}
            style={styles.poster}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <ThemedView type="backgroundSelected" style={[styles.poster, styles.posterFallback]}>
            <ThemedText type="small" themeColor="textSecondary">
              Nessun poster
            </ThemedText>
          </ThemedView>
        )}
        <View style={styles.badge}>
          <ThemedText type="small" style={styles.badgeText}>
            {title.mediaType === 'movie' ? '🎬' : '📺'}
            {title.voteAverage > 0 ? ` ${title.voteAverage.toFixed(1)}` : ''}
          </ThemedText>
        </View>
      </View>

      <View style={styles.meta}>
        <ThemedText type="smallBold" numberOfLines={2}>
          {title.title}
        </ThemedText>
        {title.year && (
          <ThemedText type="small" themeColor="textSecondary">
            {title.year}
          </ThemedText>
        )}
      </View>

      {onSave && (
        <Pressable
          onPress={saved ? undefined : onSave}
          disabled={saved || busy}
          style={({ pressed }) => [
            styles.saveButton,
            saved && styles.saveButtonSaved,
            pressed && styles.pressed,
          ]}>
          {busy ? (
            <ActivityIndicator color={Brand.pureWhite} size="small" />
          ) : (
            <ThemedText type="small" style={styles.saveText}>
              {saved ? '✓ In libreria' : '＋ Salva'}
            </ThemedText>
          )}
        </Pressable>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: Spacing.three,
    overflow: 'hidden',
  },
  posterWrapper: {
    width: '100%',
    aspectRatio: POSTER_RATIO,
  },
  poster: {
    width: '100%',
    height: '100%',
  },
  posterFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: Spacing.two,
    right: Spacing.two,
    backgroundColor: 'rgba(11,14,26,0.78)',
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
  badgeText: {
    color: Brand.pureWhite,
  },
  meta: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    gap: Spacing.half,
  },
  saveButton: {
    marginHorizontal: Spacing.two,
    marginBottom: Spacing.two,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Brand.glowBlue,
  },
  saveButtonSaved: {
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  saveText: {
    color: Brand.pureWhite,
  },
  pressed: {
    opacity: 0.8,
  },
});
