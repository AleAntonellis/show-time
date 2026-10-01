import { Image } from 'expo-image';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Brand, Spacing } from '@/constants/theme';
import type {
  MediaType,
  WatchProvider,
  WatchProviderAvailability,
} from '@/services/tmdb';
import { getWatchRegion } from '@/services/watch-preferences';
import {
  getCachedTitleWatchProviders,
  getCachedWatchProviderRegions,
} from '@/services/watch-providers';

type ProviderCategory = {
  key: keyof Pick<
    WatchProviderAvailability,
    'subscription' | 'free' | 'rent' | 'buy'
  >;
  label: string;
};

type ProviderCategoryKey = ProviderCategory['key'];

const CATEGORIES: ProviderCategory[] = [
  { key: 'subscription', label: 'In abbonamento' },
  { key: 'free', label: 'Gratis / con pubblicità' },
  { key: 'rent', label: 'Noleggio' },
  { key: 'buy', label: 'Acquisto' },
];

function formatUpdatedAt(timestamp: number): string {
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
  if (minutes < 1) {
    return 'Aggiornato adesso';
  }
  if (minutes < 60) {
    return `Aggiornato ${minutes} min fa`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `Aggiornato ${hours} h fa`;
  }
  return `Aggiornato ${Math.floor(hours / 24)} giorni fa`;
}

export function WatchProvidersSection({
  mediaType,
  tmdbId,
}: {
  mediaType: MediaType;
  tmdbId: number;
}) {
  const [availability, setAvailability] =
    useState<WatchProviderAvailability | null>(null);
  const [regionName, setRegionName] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [openCategory, setOpenCategory] =
    useState<ProviderCategoryKey | null>(null);
  const [showAllCategory, setShowAllCategory] =
    useState<ProviderCategoryKey | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (forceRefresh: boolean, cancelled?: () => boolean) => {
      if (forceRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      setWarning(null);
      try {
        const region = await getWatchRegion();
        const [regionsResult, providersResult] = await Promise.all([
          getCachedWatchProviderRegions(),
          getCachedTitleWatchProviders(
            mediaType,
            tmdbId,
            region,
            forceRefresh,
          ),
        ]);
        if (cancelled?.()) {
          return;
        }
        setAvailability(providersResult.value);
        setOpenCategory(null);
        setShowAllCategory(null);
        setRegionName(
          regionsResult.value.find((item) => item.code === region)?.name ?? region,
        );
        setUpdatedAt(providersResult.updatedAt);
        setWarning(
          [regionsResult.warning, providersResult.warning]
            .filter(Boolean)
            .join(' ') || null,
        );
      } catch (err) {
        if (!cancelled?.()) {
          setError(
            err instanceof Error
              ? err.message
              : 'Impossibile caricare la disponibilità',
          );
        }
      } finally {
        if (!cancelled?.()) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [mediaType, tmdbId],
  );

  useFocusEffect(
    useCallback(() => {
      let isCancelled = false;
      void load(false, () => isCancelled);
      return () => {
        isCancelled = true;
      };
    }, [load]),
  );

  const hasProviders = CATEGORIES.some(
    (category) => (availability?.[category.key].length ?? 0) > 0,
  );

  function toggleCategory(category: ProviderCategoryKey) {
    if (openCategory === category) {
      setOpenCategory(null);
      setShowAllCategory(null);
      return;
    }
    setOpenCategory(category);
    setShowAllCategory(null);
  }

  return (
    <View style={styles.container}>
      <View style={styles.divider} />
      <View style={styles.heading}>
        <View style={styles.headingCopy}>
          <ThemedText type="smallBold">
            Dove guardarlo{regionName ? ` · ${regionName}` : ''}
          </ThemedText>
          {updatedAt != null && (
            <ThemedText type="small" themeColor="textSecondary">
              {formatUpdatedAt(updatedAt)}
            </ThemedText>
          )}
        </View>
        <Pressable
          onPress={() => load(true)}
          disabled={loading || refreshing}
          hitSlop={8}
          style={({ pressed }) => [
            styles.refreshButton,
            pressed && styles.pressed,
          ]}>
          {refreshing ? (
            <ActivityIndicator color={Brand.glowBlue} size="small" />
          ) : (
            <ThemedText type="smallBold" style={styles.refreshText}>
              Aggiorna
            </ThemedText>
          )}
        </Pressable>
      </View>

      {loading && !availability ? (
        <ActivityIndicator color={Brand.glowBlue} size="small" />
      ) : error && !availability ? (
        <ThemedText type="small" style={styles.error}>
          {error}
        </ThemedText>
      ) : availability && hasProviders ? (
        <View style={styles.categories}>
          {CATEGORIES.map((category) => {
            const providers = availability[category.key];
            if (providers.length === 0) {
              return null;
            }
            const open = openCategory === category.key;
            const showAll = showAllCategory === category.key;
            const visibleProviders = showAll ? providers : providers.slice(0, 3);
            return (
              <View key={category.key} style={styles.category}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ expanded: open }}
                  onPress={() => toggleCategory(category.key)}
                  style={({ pressed }) => [
                    styles.categoryHeader,
                    open && styles.categoryHeaderOpen,
                    pressed && styles.pressed,
                  ]}>
                  <ThemedText type="smallBold">{category.label}</ThemedText>
                  <View style={styles.categoryMeta}>
                    <ThemedText type="small" themeColor="textSecondary">
                      {providers.length}{' '}
                      {providers.length === 1 ? 'opzione' : 'opzioni'}
                    </ThemedText>
                    <ThemedText type="small" style={styles.chevron}>
                      {open ? '⌃' : '⌄'}
                    </ThemedText>
                  </View>
                </Pressable>
                {open && (
                  <View style={styles.categoryBody}>
                    <View style={styles.providers}>
                      {visibleProviders.map((provider) => (
                        <ProviderBadge key={provider.id} provider={provider} />
                      ))}
                    </View>
                    {providers.length > 3 && (
                      <Pressable
                        onPress={() =>
                          setShowAllCategory(showAll ? null : category.key)
                        }
                        style={({ pressed }) => [
                          styles.showAllButton,
                          pressed && styles.pressed,
                        ]}>
                        <ThemedText type="smallBold" style={styles.showAllText}>
                          {showAll
                            ? 'Mostra meno'
                            : `Guarda tutte · ${providers.length}`}
                        </ThemedText>
                      </Pressable>
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      ) : (
        <ThemedText type="small" themeColor="textSecondary">
          Disponibilità non ancora disponibile per questa regione.
        </ThemedText>
      )}

      {warning && (
        <ThemedText type="small" style={styles.warning}>
          {warning}
        </ThemedText>
      )}
      {error && availability && (
        <ThemedText type="small" style={styles.error}>
          {error}
        </ThemedText>
      )}

      <ThemedText type="small" themeColor="textSecondary" style={styles.attribution}>
        Disponibilità fornite da JustWatch.
      </ThemedText>
    </View>
  );
}

function ProviderBadge({ provider }: { provider: WatchProvider }) {
  return (
    <View style={styles.provider}>
      {provider.logoUrl ? (
        <Image
          source={{ uri: provider.logoUrl }}
          contentFit="cover"
          style={styles.logo}
        />
      ) : (
        <View style={styles.logoFallback}>
          <ThemedText type="smallBold">
            {provider.name.charAt(0).toUpperCase()}
          </ThemedText>
        </View>
      )}
      <ThemedText type="small" numberOfLines={2} style={styles.providerName}>
        {provider.name}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  headingCopy: {
    flex: 1,
    gap: Spacing.half,
  },
  refreshButton: {
    minWidth: 76,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.three,
    backgroundColor: 'rgba(47,107,255,0.16)',
  },
  refreshText: {
    color: Brand.glowBlue,
  },
  categories: {
    gap: Spacing.two,
  },
  category: {
    gap: Spacing.two,
  },
  categoryHeader: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  categoryHeaderOpen: {
    backgroundColor: 'rgba(47,107,255,0.12)',
  },
  categoryMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  chevron: {
    color: Brand.glowBlue,
  },
  categoryBody: {
    gap: Spacing.two,
  },
  providers: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  provider: {
    width: 88,
    alignItems: 'center',
    gap: Spacing.one,
    padding: Spacing.two,
    borderRadius: Spacing.two,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  logo: {
    width: 42,
    height: 42,
    borderRadius: Spacing.two,
  },
  logoFallback: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Spacing.two,
    backgroundColor: 'rgba(106,76,255,0.18)',
  },
  providerName: {
    minHeight: 40,
    textAlign: 'center',
  },
  showAllButton: {
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Spacing.two,
    backgroundColor: 'rgba(47,107,255,0.12)',
  },
  showAllText: {
    color: Brand.glowBlue,
  },
  warning: {
    color: Brand.sunsetOrange,
  },
  error: {
    color: Brand.sunsetOrange,
  },
  attribution: {
    fontStyle: 'italic',
  },
  pressed: {
    opacity: 0.8,
  },
});
