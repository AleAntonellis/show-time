import { getLibrary, type LibraryItem } from '@/services/library';
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

export type PersonalStatistics = {
  totalTitles: number;
  movies: number;
  series: number;
  watchlist: number;
  inProgress: number;
  completed: number;
  watchedEpisodes: number;
  viewingCount: number;
  estimatedMinutes: number;
  averageRating: number | null;
  ratedViewings: number;
  monthlyActivity: MonthlyActivity[];
  genres: GenreStatistic[];
  recentActivity: RecentActivity[];
  missingMetadata: number;
};

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
  created_at: string;
};

type EpisodeViewingRow = EpisodeWatchRow & {
  rating: number | null;
  note: string | null;
};

type ActivityEvent = RecentActivity & {
  libraryItemId: string;
  sortKey: string;
};

const episodeKey = (itemId: string, season: number, episode: number) =>
  `${itemId}-${season}-${episode}`;

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
  row: EpisodeWatchRow | EpisodeViewingRow,
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

export async function getPersonalStatistics(): Promise<PersonalStatistics> {
  const supabase = getSupabase();
  const [items, movieResult, episodeWatchResult, episodeViewingResult] = await Promise.all([
    getLibrary(),
    supabase
      .from('viewings')
      .select('id, library_item_id, watched_on, rating, note, created_at'),
    supabase
      .from('episode_watches')
      .select(
        'id, library_item_id, season_number, episode_number, watched_on, created_at',
      ),
    supabase
      .from('episode_viewings')
      .select(
        'id, library_item_id, season_number, episode_number, watched_on, rating, note, created_at',
      ),
  ]);

  if (movieResult.error) {
    throw new Error(movieResult.error.message);
  }
  if (episodeWatchResult.error) {
    throw new Error(episodeWatchResult.error.message);
  }
  if (episodeViewingResult.error) {
    throw new Error(episodeViewingResult.error.message);
  }

  const itemById = new Map(items.map((item) => [item.id, item]));
  const movieRows = (movieResult.data ?? []) as MovieViewingRow[];
  const episodeWatchRows = (episodeWatchResult.data ?? []) as EpisodeWatchRow[];
  const episodeViewingRows = (episodeViewingResult.data ?? []) as EpisodeViewingRow[];
  const events: ActivityEvent[] = [];
  const movieItemsWithHistory = new Set<string>();

  for (const row of movieRows) {
    const item = itemById.get(row.library_item_id);
    if (!item) {
      continue;
    }
    movieItemsWithHistory.add(item.id);
    events.push(movieEvent(row, item));
  }

  for (const item of items) {
    if (
      item.mediaType === 'movie' &&
      item.status === 'watched' &&
      !movieItemsWithHistory.has(item.id)
    ) {
      events.push({
        id: `movie-library-${item.id}`,
        libraryItemId: item.id,
        title: item.title,
        detail: 'Film',
        watchedOn: item.updatedAt.slice(0, 10),
        rating: null,
        note: null,
        mediaType: 'movie',
        tmdbId: item.tmdbId,
        posterUrl: item.posterUrl,
        sortKey: item.updatedAt,
      });
    }
  }

  const episodesWithHistory = new Set(
    episodeViewingRows.map((row) =>
      episodeKey(row.library_item_id, row.season_number, row.episode_number),
    ),
  );
  for (const row of episodeWatchRows) {
    if (
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
  const estimatedMinutes = events.reduce((total, event) => {
    const item = itemById.get(event.libraryItemId);
    return total + (item?.runtime ?? 0);
  }, 0);
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
    viewingCount: events.length,
    estimatedMinutes,
    averageRating:
      ratings.length > 0
        ? ratings.reduce((total, rating) => total + rating, 0) / ratings.length
        : null,
    ratedViewings: ratings.length,
    monthlyActivity,
    genres,
    recentActivity: events.map(({ libraryItemId: _libraryItemId, sortKey: _sortKey, ...event }) => event),
    missingMetadata: items.filter(
      (item) => item.runtime == null || item.genres.length === 0,
    ).length,
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
