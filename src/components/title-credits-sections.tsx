import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Fragment, useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, Spacing } from '@/constants/theme';
import type { MediaType, TitleCredits } from '@/services/tmdb';
import { getCachedTitleCredits } from '@/services/tmdb-cache';

type PersonCard = {
  id: number;
  name: string;
  detail: string;
  profileUrl: string | null;
};

export function TitleCreditsSections({
  mediaType,
  tmdbId,
}: {
  mediaType: MediaType;
  tmdbId: number;
}) {
  const [credits, setCredits] = useState<TitleCredits | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getCachedTitleCredits(mediaType, tmdbId)
      .then((nextCredits) => {
        if (!cancelled) {
          setCredits(nextCredits);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Impossibile caricare cast e regia',
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
  }, [mediaType, tmdbId]);

  const retry = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setCredits(await getCachedTitleCredits(mediaType, tmdbId, true));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Impossibile caricare cast e regia',
      );
    } finally {
      setLoading(false);
    }
  }, [mediaType, tmdbId]);

  if (loading && !credits) {
    return (
      <CreditsState title="Cast e regia">
        <View style={styles.center}>
          <ActivityIndicator color={Brand.glowBlue} size="small" />
        </View>
      </CreditsState>
    );
  }

  if (error && !credits) {
    return (
      <CreditsState title="Cast e regia">
        <View style={styles.errorState}>
          <ThemedText type="small" style={styles.error}>
            {error}
          </ThemedText>
          <Pressable onPress={retry} hitSlop={8}>
            <ThemedText type="smallBold" style={styles.retry}>
              Riprova
            </ThemedText>
          </Pressable>
        </View>
      </CreditsState>
    );
  }

  if (!credits || (credits.cast.length === 0 && credits.directors.length === 0)) {
    return (
      <CreditsState title="Cast e regia">
        <ThemedText type="small" themeColor="textSecondary">
          Crediti non disponibili.
        </ThemedText>
      </CreditsState>
    );
  }

  const directors: PersonCard[] = credits.directors.map((director) => ({
    id: director.id,
    name: director.name,
    detail:
      director.episodeCount == null
        ? 'Regista'
        : `${director.episodeCount} ${
            director.episodeCount === 1 ? 'episodio' : 'episodi'
          }`,
    profileUrl: director.profileUrl,
  }));
  const cast: PersonCard[] = credits.cast.map((member) => ({
    id: member.id,
    name: member.name,
    detail: member.character ?? 'Personaggio non indicato',
    profileUrl: member.profileUrl,
  }));

  function openPerson(personId: number) {
    router.push({
      pathname: '/person',
      params: {
        id: String(personId),
        from: '/title',
        mediaType,
        titleId: String(tmdbId),
      },
    });
  }

  return (
    <Fragment>
      {cast.length > 0 && (
        <CreditsSlider
          title="Cast"
          people={cast}
          onOpenPerson={openPerson}
        />
      )}
      {directors.length > 0 && (
        <CreditsSlider
          title="Diretto da"
          people={directors}
          onOpenPerson={openPerson}
        />
      )}
    </Fragment>
  );
}

function CreditsState({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <ThemedView type="backgroundElement" style={styles.section}>
      <ThemedText type="smallBold">{title}</ThemedText>
      {children}
    </ThemedView>
  );
}

function CreditsSlider({
  title,
  people,
  onOpenPerson,
}: {
  title: string;
  people: PersonCard[];
  onOpenPerson: (personId: number) => void;
}) {
  return (
    <ThemedView type="backgroundElement" style={styles.section}>
      <ThemedText type="smallBold">{title}</ThemedText>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scroller}
        contentContainerStyle={styles.list}>
        {people.map((person) => (
          <Pressable
            key={person.id}
            accessibilityRole="button"
            accessibilityLabel={`Apri profilo di ${person.name}`}
            onPress={() => onOpenPerson(person.id)}
            style={({ pressed }) => [
              styles.card,
              pressed && styles.pressed,
            ]}>
            {person.profileUrl ? (
              <Image
                source={{ uri: person.profileUrl }}
                contentFit="cover"
                transition={150}
                style={styles.photo}
              />
            ) : (
              <ThemedView
                type="backgroundSelected"
                style={[styles.photo, styles.photoFallback]}>
                <ThemedText type="subtitle" themeColor="textSecondary">
                  {person.name.charAt(0).toUpperCase()}
                </ThemedText>
              </ThemedView>
            )}
            <ThemedText type="smallBold" numberOfLines={2}>
              {person.name}
            </ThemedText>
            <ThemedText
              type="small"
              themeColor="textSecondary"
              numberOfLines={2}>
              {person.detail}
            </ThemedText>
          </Pressable>
        ))}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  section: {
    width: '100%',
    minWidth: 0,
    overflow: 'hidden',
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  scroller: {
    width: '100%',
    minWidth: 0,
  },
  list: {
    gap: Spacing.three,
    paddingRight: Spacing.one,
  },
  card: {
    width: 96,
    gap: Spacing.one,
  },
  photo: {
    width: 96,
    height: 144,
    borderRadius: Spacing.three,
  },
  photoFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
  },
  errorState: {
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  error: {
    color: Brand.sunsetOrange,
  },
  retry: {
    color: Brand.glowBlue,
  },
  pressed: {
    opacity: 0.8,
  },
});
