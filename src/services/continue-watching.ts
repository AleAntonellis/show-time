import type { LibraryItem } from '@/services/library';
import { getCachedTitleDetails } from '@/services/tmdb-cache';
import type { NextEpisode, TitleDetails } from '@/services/tmdb';

export type ContinueWatchingResult = {
  items: LibraryItem[];
  unverifiedTitles: string[];
};

type AvailabilityCheck = {
  item: LibraryItem;
  visible: boolean;
  unverified: boolean;
};

const MAX_CONCURRENCY = 4;

function localDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function laterEpisode(
  first: NextEpisode | null,
  second: NextEpisode | null,
): NextEpisode | null {
  if (!first) {
    return second;
  }
  if (!second) {
    return first;
  }
  if (first.seasonNumber !== second.seasonNumber) {
    return first.seasonNumber > second.seasonNumber ? first : second;
  }
  return first.episodeNumber >= second.episodeNumber ? first : second;
}

/** Numero di episodi pubblicati entro oggi; `null` se TMDB non è verificabile. */
export function getAiredEpisodeCount(
  details: TitleDetails,
  today = new Date(),
): number | null {
  if (details.mediaType !== 'tv') {
    return null;
  }
  const todayValue = localDateString(today);
  const nextAiredToday =
    details.nextEpisode?.airDate && details.nextEpisode.airDate <= todayValue
      ? details.nextEpisode
      : null;
  const boundary = laterEpisode(details.lastEpisode, nextAiredToday);

  if (!boundary) {
    if (
      details.nextEpisode?.airDate &&
      details.nextEpisode.airDate > todayValue
    ) {
      return 0;
    }
    return details.numberOfEpisodes === 0 ? 0 : null;
  }
  if (!boundary.airDate || boundary.airDate > todayValue || boundary.seasonNumber <= 0) {
    return null;
  }

  const previousSeasons = details.seasons.filter(
    (season) => season.seasonNumber < boundary.seasonNumber,
  );
  const currentSeason = details.seasons.find(
    (season) => season.seasonNumber === boundary.seasonNumber,
  );
  if (
    !currentSeason ||
    currentSeason.episodeCount <= 0 ||
    previousSeasons.some((season) => season.episodeCount <= 0)
  ) {
    return null;
  }

  return (
    previousSeasons.reduce(
      (total, season) => total + season.episodeCount,
      0,
    ) + Math.min(boundary.episodeNumber, currentSeason.episodeCount)
  );
}

export async function filterContinueWatching(
  items: LibraryItem[],
  today = new Date(),
): Promise<ContinueWatchingResult> {
  const candidates = items.filter(
    (item) => item.mediaType === 'tv' && item.status === 'watching',
  );
  const checks: AvailabilityCheck[] = [];
  let cursor = 0;

  async function worker() {
    while (cursor < candidates.length) {
      const index = cursor;
      cursor += 1;
      const item = candidates[index];
      try {
        const details = await getCachedTitleDetails('tv', item.tmdbId);
        const airedEpisodes = getAiredEpisodeCount(details, today);
        if (airedEpisodes == null) {
          checks[index] = { item, visible: true, unverified: true };
          continue;
        }
        checks[index] = {
          item,
          visible: item.watchedEpisodes < airedEpisodes,
          unverified: false,
        };
      } catch {
        checks[index] = { item, visible: true, unverified: true };
      }
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(MAX_CONCURRENCY, Math.max(candidates.length, 1)) },
      () => worker(),
    ),
  );

  return {
    items: checks.filter((check) => check.visible).map((check) => check.item),
    unverifiedTitles: checks
      .filter((check) => check.unverified)
      .map((check) => check.item.title),
  };
}
