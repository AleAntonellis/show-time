import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  fetchTitleWatchProviders,
  fetchWatchProviderRegions,
  type MediaType,
  type WatchProviderAvailability,
  type WatchProviderRegion,
} from '@/services/tmdb';

export const WATCH_PROVIDER_TTL_MS = 24 * 60 * 60 * 1000;
export const WATCH_REGION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

type CacheEnvelope<T> = {
  cachedAt: number;
  expiresAt: number;
  value: T;
};

export type CachedWatchData<T> = {
  value: T;
  updatedAt: number;
  fromCache: boolean;
  warning: string | null;
};

const CACHE_PREFIX = '@showtime/watch-providers/v1';
const REGIONS_KEY = `${CACHE_PREFIX}/regions`;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'errore sconosciuto';
}

async function readCache<T>(
  key: string,
): Promise<{ entry: CacheEnvelope<T> | null; warning: string | null }> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) {
      return { entry: null, warning: null };
    }
    const parsed = JSON.parse(raw) as Partial<CacheEnvelope<T>>;
    if (
      !Number.isFinite(parsed.cachedAt) ||
      !Number.isFinite(parsed.expiresAt) ||
      !Object.prototype.hasOwnProperty.call(parsed, 'value')
    ) {
      try {
        await AsyncStorage.removeItem(key);
      } catch (removeError) {
        return {
          entry: null,
          warning: `Cache locale non valida e non rimossa: ${errorMessage(removeError)}`,
        };
      }
      return {
        entry: null,
        warning: 'Cache locale non valida: è stata ricreata.',
      };
    }
    return {
      entry: parsed as CacheEnvelope<T>,
      warning: null,
    };
  } catch (error) {
    return {
      entry: null,
      warning: `Cache locale non disponibile: ${errorMessage(error)}`,
    };
  }
}

async function loadPersistent<T>({
  key,
  ttl,
  forceRefresh,
  loader,
}: {
  key: string;
  ttl: number;
  forceRefresh: boolean;
  loader: () => Promise<T>;
}): Promise<CachedWatchData<T>> {
  const cacheResult = forceRefresh
    ? { entry: null, warning: null }
    : await readCache<T>(key);
  const now = Date.now();
  if (cacheResult.entry && cacheResult.entry.expiresAt > now) {
    return {
      value: cacheResult.entry.value,
      updatedAt: cacheResult.entry.cachedAt,
      fromCache: true,
      warning: cacheResult.warning,
    };
  }

  let value: T;
  try {
    value = await loader();
  } catch (error) {
    const message = errorMessage(error);
    throw new Error(
      cacheResult.warning ? `${message}; ${cacheResult.warning}` : message,
    );
  }

  const cachedAt = Date.now();
  let warning = cacheResult.warning;
  try {
    await AsyncStorage.setItem(
      key,
      JSON.stringify({
        cachedAt,
        expiresAt: cachedAt + ttl,
        value,
      } satisfies CacheEnvelope<T>),
    );
  } catch (error) {
    const writeWarning = `Cache locale non salvata: ${errorMessage(error)}`;
    warning = warning ? `${warning} ${writeWarning}` : writeWarning;
  }

  return {
    value,
    updatedAt: cachedAt,
    fromCache: false,
    warning,
  };
}

export function getCachedWatchProviderRegions(
  forceRefresh = false,
): Promise<CachedWatchData<WatchProviderRegion[]>> {
  return loadPersistent({
    key: REGIONS_KEY,
    ttl: WATCH_REGION_TTL_MS,
    forceRefresh,
    loader: fetchWatchProviderRegions,
  });
}

export function getCachedTitleWatchProviders(
  mediaType: MediaType,
  tmdbId: number,
  region: string,
  forceRefresh = false,
): Promise<CachedWatchData<WatchProviderAvailability>> {
  const normalizedRegion = region.trim().toUpperCase();
  return loadPersistent({
    key: `${CACHE_PREFIX}/${mediaType}/${tmdbId}/${normalizedRegion}`,
    ttl: WATCH_PROVIDER_TTL_MS,
    forceRefresh,
    loader: () =>
      fetchTitleWatchProviders(mediaType, tmdbId, normalizedRegion),
  });
}
