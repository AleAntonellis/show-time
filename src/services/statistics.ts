import {
  getLibrary,
  type EpisodeWatchSource,
  type LibraryItem,
} from '@/services/library';
import { fetchAllPages } from '@/services/pagination';
import { getSupabase } from '@/services/supabase';
import { getTitleDetails, type MediaType } from '@/services/tmdb';

export type MonthlyActivity = {
  key: string;
  label: string;
  count: number;
};

export type GenreStatistic = {
  name: string;
  count: number;
};

export type RecentActivity = {
  id: string;
  title: string;
  detail: string;
  watchedOn: string;
  rating: number | null;
  note: string | null;
  mediaType: MediaType;
  tmdbId: number;
  posterUrl: string | null;
};

export type StatisticsMediaFilter = 'all' | MediaType;

export type RecentPeriodStatistics = {
  fromDate: string;
  toDate: string;
  movies: number;
  series: number;
  episodes: number;
  estimatedMinutes: number;
  averageRating: number | null;
  ratedViewings: number;
};

export type PersonalStatistics = {
  totalTitles: number;
  movies: number;
  series: number;
  watchlist: number;
  inProgress: number;
  completed: number;
  watchedEpisodes: number;
  importedEpisodes: number;
  viewingCount: number;
  estimatedMinutes: number;
  averageRating: number | null;
  ratedViewings: number;
  monthlyActivity: MonthlyActivity[];
  lastThirtyDays: RecentPeriodStatistics;
  genres: GenreStatistic[];
  recentActivity: RecentActivity[];
  missingMetadata: number;
};

export type PersonalStatisticsByMedia = Record<
  StatisticsMediaFilter,
  PersonalStatistics
>;

type MovieViewingRow = {
  id: string;
  library_item_id: string;
  watched_on: string;
  rating: number | null;
  note: string | null;
  created_at: string;
};

type EpisodeWatchRow = {
  id: string;
  library_item_id: string;
  season_number: number;
  episode_number: number;
  watched_on: string;
  source: EpisodeWatchSource;
  created_at: string;
};

type EpisodeViewingRow = Omit<EpisodeWatchRow, 'source' | 'watched_on'> & {
  watched_on: string;
  rating: number | null;
  note: string | null;
};

type ActivityEvent = RecentActivity & {
  libraryItemId: string;
  sortKey: string;
};

const episodeKey = (itemId: string, season: number, episode: number) =>
  `${itemId}|${season}|${episode}`;

function lastSixMonths(): MonthlyActivity[] {
  const formatter = new Intl.DateTimeFormat('it-IT', { month: 'short' });
  const now = new Date();
  const months: MonthlyActivity[] = [];
  for (let offset = 5; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const rawLabel = formatter.format(date).replace('.', '');
    months.push({
      key,
      label: rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1),
      count: 0,
    });
  }
  return months;
}

function movieEvent(row: MovieViewingRow, item: LibraryItem): ActivityEvent {
  return {
    id: `movie-${row.id}`,
    libraryItemId: item.id,
    title: item.title,
    detail: 'Film',
    watchedOn: row.watched_on,
    rating: row.rating,
    note: row.note,
    mediaType: 'movie',
    tmdbId: item.tmdbId,
    posterUrl: item.posterUrl,
    sortKey: row.created_at,
  };
}

function episodeEvent(
  row: EpisodeViewingRow | EpisodeWatchRow,
  item: LibraryItem,
): ActivityEvent {
  return {
    id: `episode-${row.id}`,
    libraryItemId: item.id,
    title: item.title,
    detail: `S${row.season_number} E${row.episode_number}`,
    watchedOn: row.watched_on,
    rating: 'rating' in row ? row.rating : null,
    note: 'note' in row ? row.note : null,
    mediaType: 'tv',
    tmdbId: item.tmdbId,
    posterUrl: item.posterUrl,
    sortKey: row.created_at,
  };
}

function localDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function lastThirtyDays(
  events: ActivityEvent[],
  itemById: Map<string, LibraryItem>,
): RecentPeriodStatistics {
  const now = new Date();
  const toDate = localDateString(now);
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
  const fromDate = localDateString(from);
  const periodEvents = events.filter(
    (event) => event.watchedOn >= fromDate && event.watchedOn <= toDate,
  );
  const movieIds = new Set<string>();
  const seriesIds = new Set<string>();
  let episodes = 0;
  let estimatedMinutes = 0;

  for (const event of periodEvents) {
    if (event.mediaType === 'movie') {
      movieIds.add(event.libraryItemId);
    } else {
      seriesIds.add(event.libraryItemId);
      episodes += 1;
    }
    estimatedMinutes += itemById.get(event.libraryItemId)?.runtime ?? 0;
  }

  const ratings = periodEvents
    .map((event) => event.rating)
    .filter((rating): rating is number => rating != null);

  return {
    fromDate,
    toDate,
    movies: movieIds.size,
    series: seriesIds.size,
    episodes,
    estimatedMinutes,
    averageRating:
      ratings.length > 0
        ? ratings.reduce((total, rating) => total + rating, 0) / ratings.length
        : null,
    ratedViewings: ratings.length,
  };
}

type StatisticsSourceData = {
  items: LibraryItem[];
  movieRows: MovieViewingRow[];
  episodeWatchRows: EpisodeWatchRow[];
  episodeViewingRows: EpisodeViewingRow[];
};

async function loadStatisticsSource(): Promise<StatisticsSourceData> {
  const supabase = getSupabase();
  const [items, movieRows, episodeWatchRows, episodeViewingRows] = await Promise.all([
    getLibrary(),
    fetchAllPages<MovieViewingRow>((from, to) =>
      supabase
        .from('viewings')
        .select('id, library_item_id, watched_on, rating, note, created_at')
        .order('created_at', { ascending: true })
        .order('id', { ascending: true })
        .range(from, to),
    ),
    fetchAllPages<EpisodeWatchRow>((from, to) =>
      supabase
        .from('episode_watches')
        .select(
          'id, library_item_id, season_number, episode_number, watched_on, source, created_at',
        )
        .order('created_at', { ascending: true })
        .order('id', { ascending: true })
        .range(from, to),
    ),
    fetchAllPages<EpisodeViewingRow>((from, to) =>
      supabase
        .from('episode_viewings')
        .select(
          'id, library_item_id, season_number, episode_number, watched_on, rating, note, created_at',
        )
        .order('created_at', { ascending: true })
        .order('id', { ascending: true })
        .range(from, to),
    ),
  ]);
  return { items, movieRows, episodeWatchRows, episodeViewingRows };
}

function buildPersonalStatistics(
  source: StatisticsSourceData,
  mediaFilter: StatisticsMediaFilter,
): PersonalStatistics {
  const items =
    mediaFilter === 'all'
    ? source.items
    : source.items.filter((item) => item.mediaType === mediaFilter);
  const itemById = new Map(items.map((item) => [item.id, item]));
  const movieRows = source.movieRows.filter((row) =>
    itemById.has(row.library_item_id),
  );
  const episodeWatchRows = source.episodeWatchRows.filter((row) =>
    itemById.has(row.library_item_id),
  );
  const episodeViewingRows = source.episodeViewingRows.filter((row) =>
    itemById.has(row.library_item_id),
  );
  const events: ActivityEvent[] = [];

  for (const row of movieRows) {
    const item = itemById.get(row.library_item_id);
    if (!item) {
      continue;
    }
    events.push(movieEvent(row, item));
  }

  const episodesWithHistory = new Set(
    episodeViewingRows.map((row) =>
      episodeKey(row.library_item_id, row.season_number, row.episode_number),
    ),
  );
  for (const row of episodeWatchRows) {
    if (
      row.source === 'imported' ||
      episodesWithHistory.has(
        episodeKey(row.library_item_id, row.season_number, row.episode_number),
      )
    ) {
      continue;
    }
    const item = itemById.get(row.library_item_id);
    if (item) {
      events.push(episodeEvent(row, item));
    }
  }
  for (const row of episodeViewingRows) {
    const item = itemById.get(row.library_item_id);
    if (item) {
      events.push(episodeEvent(row, item));
    }
  }

  const recentPeriod = lastThirtyDays(events, itemById);
  const monthlyActivity = lastSixMonths();
  const monthByKey = new Map(monthlyActivity.map((month) => [month.key, month]));
  for (const event of events) {
    const month = monthByKey.get(event.watchedOn.slice(0, 7));
    if (month) {
      month.count += 1;
    }
  }

  const ratings = events
    .map((event) => event.rating)
    .filter((rating): rating is number => rating != null);
  const movieViewingCountByItem = new Map<string, number>();
  for (const row of movieRows) {
    movieViewingCountByItem.set(
      row.library_item_id,
      (movieViewingCountByItem.get(row.library_item_id) ?? 0) + 1,
    );
  }
  let estimatedMinutes = 0;
  for (const item of items) {
    if (item.mediaType !== 'movie') {
      continue;
    }
    const explicitViewings = movieViewingCountByItem.get(item.id) ?? 0;
    const compatibilityFallback =
      explicitViewings === 0 &&
      item.importedViewings === 0 &&
      item.status === 'watched'
        ? 1
        : 0;
    const catalogedViewings =
      item.importedViewings + explicitViewings + compatibilityFallback;
    estimatedMinutes += catalogedViewings * (item.runtime ?? 0);
  }

  const episodeViewingCountByKey = new Map<string, number>();
  for (const row of episodeViewingRows) {
    const key = episodeKey(
      row.library_item_id,
      row.season_number,
      row.episode_number,
    );
    episodeViewingCountByKey.set(
      key,
      (episodeViewingCountByKey.get(key) ?? 0) + 1,
    );
  }
  const watchedEpisodeKeys = new Set<string>();
  for (const row of episodeWatchRows) {
    const key = episodeKey(
      row.library_item_id,
      row.season_number,
      row.episode_number,
    );
    watchedEpisodeKeys.add(key);
    const explicitViewings = episodeViewingCountByKey.get(key) ?? 0;
    const catalogedViewings = Math.max(explicitViewings, 1);
    const item = itemById.get(row.library_item_id);
    estimatedMinutes += catalogedViewings * (item?.runtime ?? 0);
  }
  for (const [key, explicitViewings] of episodeViewingCountByKey) {
    if (watchedEpisodeKeys.has(key)) {
      continue;
    }
    const libraryItemId = key.split('|', 1)[0];
    const item = itemById.get(libraryItemId);
    estimatedMinutes += explicitViewings * (item?.runtime ?? 0);
  }
  const genreCounts = new Map<string, number>();
  for (const item of items) {
    for (const genre of new Set(item.genres)) {
      genreCounts.set(genre, (genreCounts.get(genre) ?? 0) + 1);
    }
  }
  const genres = Array.from(genreCounts, ([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, 6);

  events.sort(
    (a, b) => b.watchedOn.localeCompare(a.watchedOn) || b.sortKey.localeCompare(a.sortKey),
  );

  return {
    totalTitles: items.length,
    movies: items.filter((item) => item.mediaType === 'movie').length,
    series: items.filter((item) => item.mediaType === 'tv').length,
    watchlist: items.filter((item) => item.status === 'to_watch').length,
    inProgress: items.filter((item) => item.status === 'watching').length,
    completed: items.filter((item) => item.status === 'watched').length,
    watchedEpisodes: episodeWatchRows.length,
    importedEpisodes: episodeWatchRows.filter((row) => row.source === 'imported').length,
    viewingCount: events.length,
    estimatedMinutes,
    averageRating:
      ratings.length > 0
        ? ratings.reduce((total, rating) => total + rating, 0) / ratings.length
        : null,
    ratedViewings: ratings.length,
    monthlyActivity,
    lastThirtyDays: recentPeriod,
    genres,
    recentActivity: events.map(({ libraryItemId: _libraryItemId, sortKey: _sortKey, ...event }) => event),
    missingMetadata: items.filter(
      (item) => item.runtime == null || item.genres.length === 0,
    ).length,
  };
}

export async function getPersonalStatistics(
  mediaFilter: StatisticsMediaFilter = 'all',
): Promise<PersonalStatistics> {
  return buildPersonalStatistics(await loadStatisticsSource(), mediaFilter);
}

export async function getPersonalStatisticsByMedia(): Promise<PersonalStatisticsByMedia> {
  const source = await loadStatisticsSource();
  return {
    all: buildPersonalStatistics(source, 'all'),
    movie: buildPersonalStatistics(source, 'movie'),
    tv: buildPersonalStatistics(source, 'tv'),
  };
}

export async function getDiaryEntries(): Promise<RecentActivity[]> {
  const statistics = await getPersonalStatistics();
  return statistics.recentActivity.filter(
    (activity) => activity.rating != null || Boolean(activity.note?.trim()),
  );
}

export async function enrichStatisticsMetadata(limit = 12): Promise<number> {
  const items = (await getLibrary())
    .filter((item) => item.runtime == null || item.genres.length === 0)
    .slice(0, limit);
  const supabase = getSupabase();

  for (const item of items) {
    const details = await getTitleDetails(item.mediaType, item.tmdbId);
    const { error } = await supabase
      .from('titles')
      .update({
        runtime: details.runtime,
        genres: details.genres,
      })
      .eq('tmdb_id', item.tmdbId)
      .eq('media_type', item.mediaType);
    if (error) {
      throw new Error(error.message);
    }
  }

  return items.length;
}
