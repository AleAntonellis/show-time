import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, Spacing } from '@/constants/theme';
import {
  getFollowedTitleActivity,
  type FollowedTitleActivityEntry,
} from '@/services/followed-title-activity';
import type { MediaType } from '@/services/tmdb';

const PREVIEW_LIMIT = 3;
const PAGE_SIZE = 30;

function formatDate(value: string): string {
  const [year, month, day] = value.split('-');
  return day && month && year ? `${day}/${month}/${year}` : value;
}

export function FollowedTitleActivity({
  mediaType,
  tmdbId,
}: {
  mediaType: MediaType;
  tmdbId: number;
}) {
  const [entries, setEntries] = useState<FollowedTitleActivityEntry[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [contactCount, setContactCount] = useState(0);
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadPreview() {
      try {
        const page = await getFollowedTitleActivity(
          mediaType,
          tmdbId,
          PREVIEW_LIMIT,
          0,
        );
        if (!cancelled) {
          setEntries(page.entries);
          setTotalCount(page.totalCount);
          setContactCount(page.contactCount);
          setAverageRating(page.averageRating);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Impossibile caricare le attività dei contatti',
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadPreview();
    return () => {
      cancelled = true;
    };
  }, [mediaType, tmdbId]);

  async function appendNextPage() {
    if (loadingMore || entries.length >= totalCount) {
      return;
    }
    setLoadingMore(true);
    setError(null);
    try {
      const page = await getFollowedTitleActivity(
        mediaType,
        tmdbId,
        PAGE_SIZE,
        entries.length,
      );
      setEntries((current) => [...current, ...page.entries]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Impossibile caricare altre attività',
      );
    } finally {
      setLoadingMore(false);
    }
  }

  async function showAll() {
    setExpanded(true);
    if (entries.length < totalCount) {
      await appendNextPage();
    }
  }

  const visibleEntries = expanded ? entries : entries.slice(0, PREVIEW_LIMIT);

  return (
    <ThemedView type="backgroundElement" style={styles.section}>
      <View style={styles.heading}>
        <View style={styles.headingCopy}>
          <ThemedText type="smallBold">Dai tuoi contatti</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Solo visioni e recensioni con commento, dalla più recente.
          </ThemedText>
        </View>
        {!loading && totalCount > 0 && (
          <View style={styles.summary}>
            <ThemedText type="smallBold">
              {contactCount} {contactCount === 1 ? 'contatto' : 'contatti'} ·{' '}
              {totalCount} {totalCount === 1 ? 'commento' : 'commenti'}
            </ThemedText>
            {averageRating != null && (
              <ThemedText type="small" style={styles.averageRating}>
                Media ★ {averageRating.toFixed(1)}
              </ThemedText>
            )}
          </View>
        )}
      </View>

      {loading ? (
        <ActivityIndicator color={Brand.glowBlue} />
      ) : error && entries.length === 0 ? (
        <ThemedText type="small" style={styles.error}>
          {error}
        </ThemedText>
      ) : entries.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          Nessuno dei tuoi contatti ha ancora lasciato un commento.
        </ThemedText>
      ) : (
        <>
          <View style={styles.list}>
            {visibleEntries.map((entry) => (
              <ActivityCard key={entry.id} entry={entry} />
            ))}
          </View>

          {error && (
            <ThemedText type="small" style={styles.error}>
              {error}
            </ThemedText>
          )}

          {!expanded && totalCount > PREVIEW_LIMIT && (
            <Pressable
              onPress={showAll}
              disabled={loadingMore}
              style={({ pressed }) => [
                styles.actionButton,
                pressed && styles.pressed,
              ]}>
              {loadingMore ? (
                <ActivityIndicator color={Brand.glowBlue} size="small" />
              ) : (
                <ThemedText type="smallBold" style={styles.actionText}>
                  Vedi tutti i commenti · {totalCount}
                </ThemedText>
              )}
            </Pressable>
          )}

          {expanded && entries.length < totalCount && (
            <Pressable
              onPress={appendNextPage}
              disabled={loadingMore}
              style={({ pressed }) => [
                styles.actionButton,
                pressed && styles.pressed,
              ]}>
              {loadingMore ? (
                <ActivityIndicator color={Brand.glowBlue} size="small" />
              ) : (
                <ThemedText type="smallBold" style={styles.actionText}>
                  Carica altri commenti
                </ThemedText>
              )}
            </Pressable>
          )}

          {expanded && (
            <Pressable
              onPress={() => setExpanded(false)}
              style={({ pressed }) => [
                styles.collapseButton,
                pressed && styles.pressed,
              ]}>
              <ThemedText type="small" themeColor="textSecondary">
                Mostra meno
              </ThemedText>
            </Pressable>
          )}
        </>
      )}
    </ThemedView>
  );
}

function ActivityCard({ entry }: { entry: FollowedTitleActivityEntry }) {
  function openProfile() {
    router.push({
      pathname: '/profile',
      params: {
        username: entry.username,
        from: '/contacts',
      },
    });
  }

  return (
    <ThemedView type="backgroundSelected" style={styles.card}>
      <View style={styles.cardHeading}>
        <Pressable
          onPress={openProfile}
          hitSlop={6}
          style={({ pressed }) => [
            styles.contact,
            pressed && styles.pressed,
          ]}>
          <View style={styles.avatar}>
            <ThemedText type="smallBold" style={styles.avatarText}>
              {entry.username.charAt(0).toUpperCase()}
            </ThemedText>
          </View>
          <View style={styles.contactCopy}>
            <ThemedText type="smallBold">
              {entry.displayName || `@${entry.username}`}
            </ThemedText>
            <ThemedText type="small" style={styles.username}>
              @{entry.username}
            </ThemedText>
          </View>
        </Pressable>
        {entry.rating != null && (
          <ThemedText type="smallBold" style={styles.rating}>
            ★ {entry.rating.toFixed(1)}
          </ThemedText>
        )}
      </View>

      <ThemedText type="small" themeColor="textSecondary">
        {entry.detail} · {formatDate(entry.watchedOn)}
        {entry.viewingNumber > 1 ? ` · Revisione ${entry.viewingNumber}` : ''}
      </ThemedText>

      {entry.note ? (
        <ThemedText type="small" style={styles.note}>
          “{entry.note}”
        </ThemedText>
      ) : (
        <ThemedText type="small" themeColor="textSecondary">
          Commento non disponibile.
        </ThemedText>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  section: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  heading: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  headingCopy: {
    minWidth: 180,
    flex: 1,
    gap: Spacing.half,
  },
  summary: {
    alignItems: 'flex-end',
    gap: Spacing.half,
  },
  averageRating: {
    color: Brand.sunsetOrange,
  },
  list: {
    gap: Spacing.two,
  },
  card: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  cardHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  contact: {
    minWidth: 0,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  avatar: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: Brand.softViolet,
  },
  avatarText: {
    color: Brand.pureWhite,
  },
  contactCopy: {
    minWidth: 0,
    flex: 1,
  },
  username: {
    color: Brand.softViolet,
  },
  rating: {
    color: Brand.sunsetOrange,
  },
  note: {
    fontStyle: 'italic',
  },
  error: {
    color: Brand.sunsetOrange,
  },
  actionButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Spacing.three,
    backgroundColor: 'rgba(47,107,255,0.16)',
  },
  actionText: {
    color: Brand.glowBlue,
  },
  collapseButton: {
    alignSelf: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  pressed: {
    opacity: 0.8,
  },
});
