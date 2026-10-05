import type {
  EpisodeWatchSource,
  LibraryItem,
} from '@/services/library';

type CatalogItem = Pick<
  LibraryItem,
  'id' | 'status' | 'mediaType' | 'runtime' | 'importedViewings'
>;

type MovieViewingFact = {
  library_item_id: string;
};

type EpisodeFact = {
  library_item_id: string;
  season_number: number;
  episode_number: number;
};

type EpisodeWatchFact = EpisodeFact & {
  source: EpisodeWatchSource;
};

export type CompletedCatalogTotals = {
  totalTitles: number;
  movies: number;
  series: number;
};

type CompletedRuntimeFacts = {
  items: CatalogItem[];
  movieViewings: MovieViewingFact[];
  episodeWatches: EpisodeWatchFact[];
  episodeViewings: EpisodeFact[];
};

function episodeKey(fact: EpisodeFact): string {
  return `${fact.library_item_id}|${fact.season_number}|${fact.episode_number}`;
}

export function getCompletedCatalogTotals(
  items: CatalogItem[],
): CompletedCatalogTotals {
  const totals: CompletedCatalogTotals = {
    totalTitles: 0,
    movies: 0,
    series: 0,
  };

  for (const item of items) {
    if (item.status !== 'watched') {
      continue;
    }
    totals.totalTitles += 1;
    if (item.mediaType === 'movie') {
      totals.movies += 1;
    } else {
      totals.series += 1;
    }
  }

  return totals;
}

export function getCompletedRuntimeMinutes({
  items,
  movieViewings,
  episodeWatches,
  episodeViewings,
}: CompletedRuntimeFacts): number {
  const itemById = new Map(items.map((item) => [item.id, item]));
  const movieViewingCountByItem = new Map<string, number>();
  for (const viewing of movieViewings) {
    movieViewingCountByItem.set(
      viewing.library_item_id,
      (movieViewingCountByItem.get(viewing.library_item_id) ?? 0) + 1,
    );
  }

  let minutes = 0;
  for (const item of items) {
    if (item.mediaType !== 'movie' || item.status !== 'watched') {
      continue;
    }
    const explicitViewings = movieViewingCountByItem.get(item.id) ?? 0;
    const catalogedViewings =
      item.importedViewings + explicitViewings || 1;
    minutes += catalogedViewings * (item.runtime ?? 0);
  }

  const episodeViewingCountByKey = new Map<string, number>();
  for (const viewing of episodeViewings) {
    const key = episodeKey(viewing);
    episodeViewingCountByKey.set(
      key,
      (episodeViewingCountByKey.get(key) ?? 0) + 1,
    );
  }

  const completedEpisodeKeys = new Set<string>();
  for (const watch of episodeWatches) {
    const key = episodeKey(watch);
    if (completedEpisodeKeys.has(key)) {
      continue;
    }
    completedEpisodeKeys.add(key);

    const item = itemById.get(watch.library_item_id);
    if (!item || item.mediaType !== 'tv') {
      continue;
    }
    const explicitViewings = episodeViewingCountByKey.get(key) ?? 0;
    const catalogedViewings =
      watch.source === 'imported'
        ? explicitViewings + 1
        : Math.max(explicitViewings, 1);
    minutes += catalogedViewings * (item.runtime ?? 0);
  }

  return minutes;
}
