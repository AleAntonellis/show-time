import {
  getSeasonEpisodes,
  getTitleCredits,
  getTitleDetails,
  type Episode,
  type MediaType,
  type TitleCredits,
  type TitleDetails,
} from '@/services/tmdb';

type CachedValue<T> = {
  expiresAt: number;
  value: T;
};

const CACHE_TTL_MS = 15 * 60 * 1000;
const detailCache = new Map<string, CachedValue<TitleDetails>>();
const seasonCache = new Map<string, CachedValue<Episode[]>>();
const creditsCache = new Map<string, CachedValue<TitleCredits>>();

async function fromCache<T>(
  cache: Map<string, CachedValue<T>>,
  key: string,
  forceRefresh: boolean,
  loader: () => Promise<T>,
): Promise<T> {
  const cached = cache.get(key);
  if (!forceRefresh && cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }
  const value = await loader();
  cache.set(key, {
    value,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
  return value;
}

export function getCachedTitleDetails(
  mediaType: MediaType,
  tmdbId: number,
  forceRefresh = false,
): Promise<TitleDetails> {
  return fromCache(
    detailCache,
    `${mediaType}-${tmdbId}`,
    forceRefresh,
    () => getTitleDetails(mediaType, tmdbId),
  );
}

export function getCachedSeasonEpisodes(
  tvId: number,
  seasonNumber: number,
  forceRefresh = false,
): Promise<Episode[]> {
  return fromCache(
    seasonCache,
    `${tvId}-${seasonNumber}`,
    forceRefresh,
    () => getSeasonEpisodes(tvId, seasonNumber),
  );
}

export function getCachedTitleCredits(
  mediaType: MediaType,
  tmdbId: number,
  forceRefresh = false,
): Promise<TitleCredits> {
  return fromCache(
    creditsCache,
    `${mediaType}-${tmdbId}`,
    forceRefresh,
    () => getTitleCredits(mediaType, tmdbId),
  );
}
