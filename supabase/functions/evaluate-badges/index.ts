import { withSupabase } from '@supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';

import {
  BADGE_CATEGORIES,
  BADGE_LEVEL_KEYS,
  BadgeEngineError,
  createBadgeRegistry,
  hasCompletedRegularSeries,
  hasCompletedSeason,
  isReleaseYearBefore,
  type BadgeCategory,
  type BadgeDefinition,
  type BadgeEvaluation,
  type BadgeEvaluationContext,
  type BadgeLevelDefinition,
  type BadgeLevelKey,
  type ArchivistFacts,
  type CinephileFacts,
  type FirstReviewFacts,
  type FirstWatchFacts,
  type GenreExplorerFacts,
  type GenreTitleFact,
  type NostalgicFacts,
  type OneMoreEpisodeFacts,
  type RegularSeasonDefinition,
  type SeasonCompleteFacts,
  type SerialistFacts,
  type TrackedEpisodeFact,
  type WatchedEpisodeFact,
} from './badge-engine.ts';

const PAGE_SIZE = 1000;
const TMDB_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const TMDB_TITLE_METADATA_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const TMDB_GENRE_METADATA_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const TMDB_REQUEST_CONCURRENCY = 4;
const registry = createBadgeRegistry();
const tmdbSeasonCache = new Map<
  string,
  { expiresAt: number; promise: Promise<number[]> }
>();
const tmdbTvMetadataCache = new Map<
  number,
  { expiresAt: number; promise: Promise<TvBadgeMetadata> }
>();
const tmdbTitleGenreIdsCache = new Map<
  string,
  { expiresAt: number; promise: Promise<number[]> }
>();

type EvaluateRequest = {
  badgeIds?: string[];
  backfill?: boolean;
};

type BadgeDefinitionRow = {
  id: string;
  version: number;
  category: string;
  name: string;
  description: string;
  icon_key: string;
  is_active: boolean;
};

type BadgeLevelRow = {
  badge_id: string;
  badge_version: number;
  level: number;
  level_key: string;
  name: string;
  description: string;
  threshold: number;
  icon_key: string;
};

type NewUnlockRow = {
  badge_id: string;
  badge_version: number;
  level: number;
  level_key: string;
  unlocked_at: string;
};

type EvaluationResult = {
  evaluation: Omit<BadgeEvaluation, 'evidence'>;
  newUnlocks: NewUnlockRow[];
};

type IdRow = {
  id: string;
};

type NoteRow = IdRow & {
  note: string | null;
};

type EpisodeWatchFactRow = {
  library_item_id: string;
  season_number: number;
  episode_number: number;
};

type TrackedEpisodeWatchRow = EpisodeWatchFactRow & {
  id: string;
  watched_on: string;
};

type LibraryTitleFactRow = {
  id: string;
  titles:
    | {
        tmdb_id: number;
        media_type: string;
      }
    | {
        tmdb_id: number;
        media_type: string;
      }[]
    | null;
};

type LibraryYearFactRow = {
  id: string;
  titles:
    | {
        year: string | null;
      }
    | {
        year: string | null;
      }[]
    | null;
};

type SerialistLibraryRow = {
  id: string;
  title_id: string;
  titles:
    | {
        id: string;
        tmdb_id: number;
        media_type: string;
      }
    | {
        id: string;
        tmdb_id: number;
        media_type: string;
      }[]
    | null;
};

type BadgeTitleMetadataRow = {
  title_id: string;
  tmdb_status: string;
  regular_episodes: number;
  regular_season_counts: unknown;
  refreshed_at: string;
};

type SerialistCandidate = {
  libraryItemId: string;
  titleId: string;
  tmdbId: number;
  watchedEpisodes: WatchedEpisodeFact[];
};

type TvBadgeMetadata = {
  status: string;
  regularEpisodes: number;
  regularSeasons: RegularSeasonDefinition[];
};

type ResolvedTvBadgeMetadata = TvBadgeMetadata & {
  titleId: string;
  fetched: boolean;
};

type GenreExplorerLibraryRow = {
  id: string;
  title_id: string;
  titles:
    | {
        id: string;
        tmdb_id: number;
        media_type: string;
        genres: string[] | null;
      }
    | {
        id: string;
        tmdb_id: number;
        media_type: string;
        genres: string[] | null;
      }[]
    | null;
};

type BadgeTitleGenresRow = {
  title_id: string;
  tmdb_genre_ids: unknown;
  refreshed_at: string;
};

type GenreExplorerCandidate = {
  itemId: string;
  titleId: string;
  tmdbId: number;
  mediaType: 'movie' | 'tv';
  genreNames: string[];
};

type SeasonCandidate = {
  key: string;
  tmdbId: number;
  seasonNumber: number;
  watchedEpisodeNumbers: Set<number>;
};

type RuntimeEnvironment = typeof globalThis & {
  Deno?: {
    env: {
      get(name: string): string | undefined;
    };
  };
};

function isBadgeCategory(value: string): value is BadgeCategory {
  return (BADGE_CATEGORIES as readonly string[]).includes(value);
}

function isBadgeLevelKey(value: string): value is BadgeLevelKey {
  return (BADGE_LEVEL_KEYS as readonly string[]).includes(value);
}

function parseBody(value: unknown): EvaluateRequest {
  if (typeof value !== 'object' || value == null) {
    throw new BadgeEngineError(
      'Payload valutazione non valido',
      'request_invalid',
    );
  }
  const body = value as Record<string, unknown>;
  if (
    body.badgeIds != null &&
    (!Array.isArray(body.badgeIds) ||
      body.badgeIds.some(
        (badgeId) => typeof badgeId !== 'string' || !badgeId.trim(),
      ))
  ) {
    throw new BadgeEngineError(
      'Elenco badge non valido',
      'badge_ids_invalid',
    );
  }
  if (body.backfill != null && typeof body.backfill !== 'boolean') {
    throw new BadgeEngineError(
      'Flag backfill non valido',
      'backfill_invalid',
    );
  }
  return {
    badgeIds: body.badgeIds
      ? Array.from(
          new Set((body.badgeIds as string[]).map((badgeId) => badgeId.trim())),
        )
      : undefined,
    backfill: body.backfill ?? false,
  };
}

function parseRequestText(value: string): EvaluateRequest {
  if (!value) {
    return {};
  }
  try {
    return parseBody(JSON.parse(value));
  } catch (error) {
    if (error instanceof BadgeEngineError) {
      throw error;
    }
    throw new BadgeEngineError(
      'JSON richiesta non valido',
      'request_invalid',
    );
  }
}

function toDefinition(
  row: BadgeDefinitionRow,
  levelRows: BadgeLevelRow[],
): BadgeDefinition {
  if (!isBadgeCategory(row.category)) {
    throw new BadgeEngineError(
      `Categoria badge non valida: ${row.category}`,
      'definition_invalid',
    );
  }
  const levels: BadgeLevelDefinition[] = levelRows
    .filter(
      (level) =>
        level.badge_id === row.id && level.badge_version === row.version,
    )
    .map((level) => {
      if (!isBadgeLevelKey(level.level_key)) {
        throw new BadgeEngineError(
          `Livello badge non valido: ${level.level_key}`,
          'definition_invalid',
        );
      }
      return {
        level: level.level,
        key: level.level_key,
        name: level.name,
        description: level.description,
        threshold: level.threshold,
        iconKey: level.icon_key,
      };
    })
    .sort((first, second) => first.level - second.level);

  return {
    id: row.id,
    version: row.version,
    category: row.category,
    name: row.name,
    description: row.description,
    iconKey: row.icon_key,
    isActive: row.is_active,
    levels,
  };
}

function readEnvironmentValue(name: string): string | null {
  return (
    (globalThis as RuntimeEnvironment).Deno?.env.get(name)?.trim() || null
  );
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function requestTmdbJson(
  path: string,
  sourceLabel: string,
  attempt = 0,
): Promise<unknown> {
  const accessToken =
    readEnvironmentValue('TMDB_ACCESS_TOKEN') ??
    readEnvironmentValue('EXPO_PUBLIC_TMDB_ACCESS_TOKEN');
  const apiKey =
    readEnvironmentValue('TMDB_API_KEY') ??
    readEnvironmentValue('EXPO_PUBLIC_TMDB_API_KEY');
  if (!accessToken && !apiKey) {
    throw new BadgeEngineError(
      'Configura TMDB_ACCESS_TOKEN o TMDB_API_KEY nei secret della Edge Function',
      'tmdb_not_configured',
    );
  }

  const url = new URL(`https://api.themoviedb.org/3${path}`);
  url.searchParams.set('language', 'it-IT');
  if (!accessToken && apiKey) {
    url.searchParams.set('api_key', apiKey);
  }
  const headers: Record<string, string> = {
    accept: 'application/json',
  };
  if (accessToken) {
    headers.authorization = `Bearer ${accessToken}`;
  }

  let response: Response;
  try {
    response = await fetch(url, { headers });
  } catch (error) {
    throw new BadgeEngineError(
      `TMDB non raggiungibile per ${sourceLabel}: ${
        error instanceof Error ? error.message : 'errore di rete'
      }`,
      'tmdb_load_failed',
    );
  }
  if (response.status === 429 && attempt < 2) {
    const retryAfter = Number(response.headers.get('retry-after'));
    const delayMilliseconds =
      Number.isFinite(retryAfter) && retryAfter > 0
        ? Math.min(retryAfter * 1000, 10_000)
        : 1000 * (attempt + 1);
    await delay(delayMilliseconds);
    return requestTmdbJson(path, sourceLabel, attempt + 1);
  }
  if (!response.ok) {
    throw new BadgeEngineError(
      `TMDB ha rifiutato ${sourceLabel} (${response.status})`,
      'tmdb_load_failed',
    );
  }

  try {
    return await response.json();
  } catch (error) {
    throw new BadgeEngineError(
      `Risposta TMDB non leggibile per ${sourceLabel}: ${
        error instanceof Error ? error.message : 'JSON non valido'
      }`,
      'tmdb_response_invalid',
    );
  }
}

async function mapWithConcurrency<T, R>(
  values: readonly T[],
  concurrency: number,
  mapper: (value: T) => Promise<R>,
): Promise<R[]> {
  if (values.length === 0) {
    return [];
  }
  const results = new Array<R>(values.length);
  let nextIndex = 0;
  async function worker(): Promise<void> {
    while (nextIndex < values.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(values[index]);
    }
  }
  const workerCount = Math.min(
    Math.max(1, concurrency),
    values.length,
  );
  await Promise.all(
    Array.from({ length: workerCount }, () => worker()),
  );
  return results;
}

function prefixedId(
  value: unknown,
  prefix: string,
  sourceLabel: string,
): string | null {
  if (value == null) {
    return null;
  }
  if (
    typeof value !== 'object' ||
    !('id' in value) ||
    typeof value.id !== 'string' ||
    !value.id.trim()
  ) {
    throw new BadgeEngineError(
      `Risposta ${sourceLabel} non valida`,
      'facts_load_failed',
    );
  }
  return `${prefix}:${value.id}`;
}

async function loadCinephileFacts(
  supabaseAdmin: SupabaseClient,
  userId: string,
): Promise<CinephileFacts> {
  const completedMovieIds: string[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabaseAdmin
      .from('library_items')
      .select('id, titles!inner(media_type)')
      .eq('user_id', userId)
      .eq('status', 'watched')
      .eq('titles.media_type', 'movie')
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) {
      throw new BadgeEngineError(
        `Impossibile leggere i film completati: ${error.message}`,
        'facts_load_failed',
      );
    }
    const rows = data ?? [];
    completedMovieIds.push(
      ...rows
        .map((row) => row.id)
        .filter((id): id is string => typeof id === 'string'),
    );
    if (rows.length < PAGE_SIZE) {
      break;
    }
  }
  return { completedMovieIds };
}

async function loadArchivistFacts(
  supabaseAdmin: SupabaseClient,
  userId: string,
): Promise<ArchivistFacts> {
  const libraryItemIds: string[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabaseAdmin
      .from('library_items')
      .select('id')
      .eq('user_id', userId)
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) {
      throw new BadgeEngineError(
        `Impossibile leggere la Libreria per Archivista: ${error.message}`,
        'facts_load_failed',
      );
    }
    const rows = data ?? [];
    libraryItemIds.push(
      ...rows
        .map((row) => row.id)
        .filter((id): id is string => typeof id === 'string'),
    );
    if (rows.length < PAGE_SIZE) {
      break;
    }
  }
  return { libraryItemIds };
}

async function loadNostalgicFacts(
  supabaseAdmin: SupabaseClient,
  userId: string,
): Promise<NostalgicFacts> {
  const completedClassicItemIds: string[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabaseAdmin
      .from('library_items')
      .select('id, titles!inner(year)')
      .eq('user_id', userId)
      .eq('status', 'watched')
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) {
      throw new BadgeEngineError(
        `Impossibile leggere i titoli per Nostalgico: ${error.message}`,
        'facts_load_failed',
      );
    }
    const rows = (data ?? []) as unknown as LibraryYearFactRow[];
    for (const row of rows) {
      const title = Array.isArray(row.titles)
        ? row.titles[0] ?? null
        : row.titles;
      if (typeof row.id !== 'string' || !row.id.trim() || !title) {
        throw new BadgeEngineError(
          'Metadati titolo non validi per Nostalgico',
          'facts_load_failed',
        );
      }
      if (isReleaseYearBefore(title.year, 1990)) {
        completedClassicItemIds.push(row.id);
      }
    }
    if (rows.length < PAGE_SIZE) {
      break;
    }
  }
  return { completedClassicItemIds };
}

async function hasExistingUnlock(
  supabaseAdmin: SupabaseClient,
  userId: string,
  definition: BadgeDefinition,
): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from('user_badges')
    .select('level')
    .eq('user_id', userId)
    .eq('badge_id', definition.id)
    .eq('badge_version', definition.version)
    .limit(1)
    .maybeSingle();
  if (error) {
    throw new BadgeEngineError(
      `Impossibile verificare lo sblocco ${definition.id}: ${error.message}`,
      'facts_load_failed',
    );
  }
  return data != null;
}

async function loadFirstWatchFacts(
  supabaseAdmin: SupabaseClient,
  userId: string,
): Promise<FirstWatchFacts> {
  const [movie, trackedEpisode, episodeViewing, seriesViewing] =
    await Promise.all([
      supabaseAdmin
        .from('viewings')
        .select('id')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
        .order('id', { ascending: true })
        .limit(1)
        .maybeSingle(),
      supabaseAdmin
        .from('episode_watches')
        .select('id')
        .eq('user_id', userId)
        .eq('source', 'tracked')
        .order('created_at', { ascending: true })
        .order('id', { ascending: true })
        .limit(1)
        .maybeSingle(),
      supabaseAdmin
        .from('episode_viewings')
        .select('id')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
        .order('id', { ascending: true })
        .limit(1)
        .maybeSingle(),
      supabaseAdmin
        .from('series_viewings')
        .select('id')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
        .order('id', { ascending: true })
        .limit(1)
        .maybeSingle(),
    ]);

  const results = [
    { ...movie, prefix: 'movie', label: 'visioni film' },
    {
      ...trackedEpisode,
      prefix: 'episode-watch',
      label: 'episodi tracciati',
    },
    {
      ...episodeViewing,
      prefix: 'episode-viewing',
      label: 'revisioni episodio',
    },
    {
      ...seriesViewing,
      prefix: 'series-viewing',
      label: 'visioni serie',
    },
  ];
  const activityIds: string[] = [];
  for (const result of results) {
    if (result.error) {
      throw new BadgeEngineError(
        `Impossibile leggere ${result.label}: ${result.error.message}`,
        'facts_load_failed',
      );
    }
    const activityId = prefixedId(
      result.data,
      result.prefix,
      result.label,
    );
    if (activityId) {
      activityIds.push(activityId);
    }
  }
  return { activityIds };
}

async function loadFirstNonEmptyNoteId(
  supabaseAdmin: SupabaseClient,
  userId: string,
  table: 'viewings' | 'episode_viewings' | 'series_viewings',
  prefix: string,
): Promise<string | null> {
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabaseAdmin
      .from(table)
      .select('id, note')
      .eq('user_id', userId)
      .not('note', 'is', null)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) {
      throw new BadgeEngineError(
        `Impossibile leggere le note ${table}: ${error.message}`,
        'facts_load_failed',
      );
    }
    const rows = (data ?? []) as NoteRow[];
    for (const row of rows) {
      if (
        typeof row.id !== 'string' ||
        !row.id.trim() ||
        (row.note != null && typeof row.note !== 'string')
      ) {
        throw new BadgeEngineError(
          `Risposta note ${table} non valida`,
          'facts_load_failed',
        );
      }
      if (row.note?.trim()) {
        return `${prefix}:${row.id}`;
      }
    }
    if (rows.length < PAGE_SIZE) {
      return null;
    }
  }
}

async function loadFirstReviewFacts(
  supabaseAdmin: SupabaseClient,
  userId: string,
): Promise<FirstReviewFacts> {
  const activityIds = (
    await Promise.all([
      loadFirstNonEmptyNoteId(
        supabaseAdmin,
        userId,
        'viewings',
        'movie',
      ),
      loadFirstNonEmptyNoteId(
        supabaseAdmin,
        userId,
        'episode_viewings',
        'episode-viewing',
      ),
      loadFirstNonEmptyNoteId(
        supabaseAdmin,
        userId,
        'series_viewings',
        'series-viewing',
      ),
    ])
  ).filter((activityId): activityId is string => activityId != null);
  return { activityIds };
}

function titleRelation(
  row: LibraryTitleFactRow,
): { tmdb_id: number; media_type: string } | null {
  if (Array.isArray(row.titles)) {
    return row.titles[0] ?? null;
  }
  return row.titles;
}

async function loadSeasonCandidates(
  supabaseAdmin: SupabaseClient,
  userId: string,
): Promise<SeasonCandidate[]> {
  const tmdbIdByLibraryItem = new Map<string, number>();
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabaseAdmin
      .from('library_items')
      .select('id, titles!inner(tmdb_id, media_type)')
      .eq('user_id', userId)
      .eq('titles.media_type', 'tv')
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) {
      throw new BadgeEngineError(
        `Impossibile leggere le serie per Stagione chiusa: ${error.message}`,
        'facts_load_failed',
      );
    }
    const rows = (data ?? []) as unknown as LibraryTitleFactRow[];
    for (const row of rows) {
      const title = titleRelation(row);
      if (
        typeof row.id !== 'string' ||
        !row.id.trim() ||
        !title ||
        title.media_type !== 'tv' ||
        !Number.isInteger(title.tmdb_id) ||
        title.tmdb_id <= 0
      ) {
        throw new BadgeEngineError(
          'Metadati serie non validi per Stagione chiusa',
          'facts_load_failed',
        );
      }
      tmdbIdByLibraryItem.set(row.id, title.tmdb_id);
    }
    if (rows.length < PAGE_SIZE) {
      break;
    }
  }

  const candidates = new Map<string, SeasonCandidate>();
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabaseAdmin
      .from('episode_watches')
      .select('library_item_id, season_number, episode_number')
      .eq('user_id', userId)
      .gt('season_number', 0)
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) {
      throw new BadgeEngineError(
        `Impossibile leggere gli episodi completati: ${error.message}`,
        'facts_load_failed',
      );
    }
    const rows = (data ?? []) as EpisodeWatchFactRow[];
    for (const row of rows) {
      const tmdbId = tmdbIdByLibraryItem.get(row.library_item_id);
      if (
        !tmdbId ||
        !Number.isInteger(row.season_number) ||
        row.season_number <= 0 ||
        !Number.isInteger(row.episode_number) ||
        row.episode_number <= 0
      ) {
        throw new BadgeEngineError(
          'Progresso episodio non valido per Stagione chiusa',
          'facts_load_failed',
        );
      }
      const key = `${row.library_item_id}:S${row.season_number}`;
      const existing = candidates.get(key);
      if (existing) {
        existing.watchedEpisodeNumbers.add(row.episode_number);
      } else {
        candidates.set(key, {
          key,
          tmdbId,
          seasonNumber: row.season_number,
          watchedEpisodeNumbers: new Set([row.episode_number]),
        });
      }
    }
    if (rows.length < PAGE_SIZE) {
      break;
    }
  }

  return Array.from(candidates.values()).sort(
    (first, second) =>
      second.watchedEpisodeNumbers.size -
        first.watchedEpisodeNumbers.size ||
      first.key.localeCompare(second.key),
  );
}

async function requestTmdbSeasonEpisodeNumbers(
  tmdbId: number,
  seasonNumber: number,
): Promise<number[]> {
  const payload = await requestTmdbJson(
    `/tv/${tmdbId}/season/${seasonNumber}`,
    `la stagione ${tmdbId}/S${seasonNumber}`,
  );
  if (
    typeof payload !== 'object' ||
    payload == null ||
    !('episodes' in payload) ||
    !Array.isArray(payload.episodes)
  ) {
    throw new BadgeEngineError(
      'Risposta TMDB priva degli episodi della stagione',
      'tmdb_response_invalid',
    );
  }

  const episodeNumbers: number[] = [];
  for (const episode of payload.episodes) {
    if (
      typeof episode !== 'object' ||
      episode == null ||
      !('episode_number' in episode) ||
      !Number.isInteger(episode.episode_number) ||
      Number(episode.episode_number) <= 0
    ) {
      throw new BadgeEngineError(
        'Risposta TMDB con numero episodio non valido',
        'tmdb_response_invalid',
      );
    }
    episodeNumbers.push(Number(episode.episode_number));
  }
  return episodeNumbers;
}

function loadTmdbSeasonEpisodeNumbers(
  tmdbId: number,
  seasonNumber: number,
): Promise<number[]> {
  const key = `${tmdbId}:${seasonNumber}`;
  const cached = tmdbSeasonCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.promise;
  }
  const promise = requestTmdbSeasonEpisodeNumbers(
    tmdbId,
    seasonNumber,
  ).catch((error) => {
    tmdbSeasonCache.delete(key);
    throw error;
  });
  tmdbSeasonCache.set(key, {
    expiresAt: Date.now() + TMDB_CACHE_TTL_MS,
    promise,
  });
  return promise;
}

async function loadSeasonCompleteFacts(
  supabaseAdmin: SupabaseClient,
  userId: string,
): Promise<SeasonCompleteFacts> {
  const candidates = await loadSeasonCandidates(supabaseAdmin, userId);
  for (const candidate of candidates) {
    const catalogEpisodeNumbers = await loadTmdbSeasonEpisodeNumbers(
      candidate.tmdbId,
      candidate.seasonNumber,
    );
    if (
      hasCompletedSeason(
        Array.from(candidate.watchedEpisodeNumbers),
        catalogEpisodeNumbers,
      )
    ) {
      return { completedSeasonKeys: [candidate.key] };
    }
  }
  return { completedSeasonKeys: [] };
}

function serialistTitleRelation(
  row: SerialistLibraryRow,
): { id: string; tmdb_id: number; media_type: string } | null {
  if (Array.isArray(row.titles)) {
    return row.titles[0] ?? null;
  }
  return row.titles;
}

async function loadSerialistLibraryRows(
  supabaseAdmin: SupabaseClient,
  userId: string,
): Promise<SerialistLibraryRow[]> {
  const libraryRows: SerialistLibraryRow[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabaseAdmin
      .from('library_items')
      .select(
        'id, title_id, titles!inner(id, tmdb_id, media_type)',
      )
      .eq('user_id', userId)
      .eq('status', 'watched')
      .eq('titles.media_type', 'tv')
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) {
      throw new BadgeEngineError(
        `Impossibile leggere le serie completate per Serialista: ${error.message}`,
        'facts_load_failed',
      );
    }
    const rows = (data ?? []) as unknown as SerialistLibraryRow[];
    libraryRows.push(...rows);
    if (rows.length < PAGE_SIZE) {
      break;
    }
  }
  return libraryRows;
}

async function loadSerialistWatchedEpisodes(
  supabaseAdmin: SupabaseClient,
  userId: string,
): Promise<Map<string, WatchedEpisodeFact[]>> {
  const episodesByItem = new Map<string, WatchedEpisodeFact[]>();
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabaseAdmin
      .from('episode_watches')
      .select('library_item_id, season_number, episode_number')
      .eq('user_id', userId)
      .gt('season_number', 0)
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) {
      throw new BadgeEngineError(
        `Impossibile leggere gli episodi per Serialista: ${error.message}`,
        'facts_load_failed',
      );
    }
    const rows = (data ?? []) as EpisodeWatchFactRow[];
    for (const row of rows) {
      if (
        typeof row.library_item_id !== 'string' ||
        !row.library_item_id.trim() ||
        !Number.isInteger(row.season_number) ||
        row.season_number <= 0 ||
        !Number.isInteger(row.episode_number) ||
        row.episode_number <= 0
      ) {
        throw new BadgeEngineError(
          'Progresso episodio non valido per Serialista',
          'facts_load_failed',
        );
      }
      const episodes = episodesByItem.get(row.library_item_id) ?? [];
      episodes.push({
        seasonNumber: row.season_number,
        episodeNumber: row.episode_number,
      });
      episodesByItem.set(row.library_item_id, episodes);
    }
    if (rows.length < PAGE_SIZE) {
      break;
    }
  }
  return episodesByItem;
}

async function loadBadgeTitleMetadata(
  supabaseAdmin: SupabaseClient,
  titleIds: string[],
): Promise<Map<string, BadgeTitleMetadataRow>> {
  const metadataByTitle = new Map<string, BadgeTitleMetadataRow>();
  for (let index = 0; index < titleIds.length; index += 100) {
    const chunk = titleIds.slice(index, index + 100);
    const { data, error } = await supabaseAdmin
      .from('badge_title_metadata')
      .select(
        'title_id, tmdb_status, regular_episodes, regular_season_counts, refreshed_at',
      )
      .in('title_id', chunk);
    if (error) {
      throw new BadgeEngineError(
        `Impossibile leggere la cache TMDB badge: ${error.message}`,
        'facts_load_failed',
      );
    }
    for (const row of (data ?? []) as BadgeTitleMetadataRow[]) {
      metadataByTitle.set(row.title_id, row);
    }
  }
  return metadataByTitle;
}

function parseRegularSeasonCounts(
  value: unknown,
): RegularSeasonDefinition[] | null {
  if (!Array.isArray(value)) {
    return null;
  }
  const seasons: RegularSeasonDefinition[] = [];
  const seasonNumbers = new Set<number>();
  for (const item of value) {
    if (
      typeof item !== 'object' ||
      item == null ||
      !('seasonNumber' in item) ||
      !('episodeCount' in item) ||
      !Number.isInteger(item.seasonNumber) ||
      Number(item.seasonNumber) <= 0 ||
      !Number.isInteger(item.episodeCount) ||
      Number(item.episodeCount) <= 0 ||
      seasonNumbers.has(Number(item.seasonNumber))
    ) {
      return null;
    }
    const seasonNumber = Number(item.seasonNumber);
    seasonNumbers.add(seasonNumber);
    seasons.push({
      seasonNumber,
      episodeCount: Number(item.episodeCount),
    });
  }
  return seasons.sort(
    (first, second) => first.seasonNumber - second.seasonNumber,
  );
}

function cachedTvBadgeMetadata(
  row: BadgeTitleMetadataRow | undefined,
): TvBadgeMetadata | null {
  if (
    !row ||
    typeof row.tmdb_status !== 'string' ||
    !row.tmdb_status.trim() ||
    !Number.isInteger(row.regular_episodes) ||
    row.regular_episodes < 0
  ) {
    return null;
  }
  const refreshedAt = Date.parse(row.refreshed_at);
  if (
    !Number.isFinite(refreshedAt) ||
    Date.now() - refreshedAt > TMDB_TITLE_METADATA_TTL_MS
  ) {
    return null;
  }
  const regularSeasons = parseRegularSeasonCounts(
    row.regular_season_counts,
  );
  if (
    regularSeasons == null ||
    regularSeasons.reduce(
      (total, season) => total + season.episodeCount,
      0,
    ) !== row.regular_episodes
  ) {
    return null;
  }
  return {
    status: row.tmdb_status.trim(),
    regularEpisodes: row.regular_episodes,
    regularSeasons,
  };
}

function parseTmdbTvBadgeMetadata(payload: unknown): TvBadgeMetadata {
  if (
    typeof payload !== 'object' ||
    payload == null ||
    !('status' in payload) ||
    typeof payload.status !== 'string' ||
    !payload.status.trim() ||
    !('seasons' in payload) ||
    !Array.isArray(payload.seasons)
  ) {
    throw new BadgeEngineError(
      'Risposta TMDB serie non valida per Serialista',
      'tmdb_response_invalid',
    );
  }

  const regularSeasons: RegularSeasonDefinition[] = [];
  const seasonNumbers = new Set<number>();
  for (const season of payload.seasons) {
    if (
      typeof season !== 'object' ||
      season == null ||
      !('season_number' in season) ||
      !Number.isInteger(season.season_number)
    ) {
      throw new BadgeEngineError(
        'Risposta TMDB con stagione non valida',
        'tmdb_response_invalid',
      );
    }
    const seasonNumber = Number(season.season_number);
    if (seasonNumber === 0) {
      continue;
    }
    if (
      seasonNumber < 0 ||
      !('episode_count' in season) ||
      !Number.isInteger(season.episode_count) ||
      Number(season.episode_count) < 0 ||
      seasonNumbers.has(seasonNumber)
    ) {
      throw new BadgeEngineError(
        'Risposta TMDB con conteggio stagione non valido',
        'tmdb_response_invalid',
      );
    }
    seasonNumbers.add(seasonNumber);
    const episodeCount = Number(season.episode_count);
    if (episodeCount > 0) {
      regularSeasons.push({ seasonNumber, episodeCount });
    }
  }
  regularSeasons.sort(
    (first, second) => first.seasonNumber - second.seasonNumber,
  );
  return {
    status: payload.status.trim(),
    regularEpisodes: regularSeasons.reduce(
      (total, season) => total + season.episodeCount,
      0,
    ),
    regularSeasons,
  };
}

async function requestTmdbTvBadgeMetadata(
  tmdbId: number,
): Promise<TvBadgeMetadata> {
  const payload = await requestTmdbJson(
    `/tv/${tmdbId}`,
    `la serie ${tmdbId}`,
  );
  return parseTmdbTvBadgeMetadata(payload);
}

function loadTmdbTvBadgeMetadata(
  tmdbId: number,
): Promise<TvBadgeMetadata> {
  const cached = tmdbTvMetadataCache.get(tmdbId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.promise;
  }
  const promise = requestTmdbTvBadgeMetadata(tmdbId).catch((error) => {
    tmdbTvMetadataCache.delete(tmdbId);
    throw error;
  });
  tmdbTvMetadataCache.set(tmdbId, {
    expiresAt: Date.now() + TMDB_CACHE_TTL_MS,
    promise,
  });
  return promise;
}

async function loadSerialistFacts(
  supabaseAdmin: SupabaseClient,
  userId: string,
): Promise<SerialistFacts> {
  const [libraryRows, episodesByItem] = await Promise.all([
    loadSerialistLibraryRows(supabaseAdmin, userId),
    loadSerialistWatchedEpisodes(supabaseAdmin, userId),
  ]);
  const candidates: SerialistCandidate[] = libraryRows.flatMap((row) => {
    const title = serialistTitleRelation(row);
    const watchedEpisodes = episodesByItem.get(row.id) ?? [];
    if (
      typeof row.id !== 'string' ||
      !row.id.trim() ||
      typeof row.title_id !== 'string' ||
      !row.title_id.trim() ||
      !title ||
      title.id !== row.title_id ||
      title.media_type !== 'tv' ||
      !Number.isInteger(title.tmdb_id) ||
      title.tmdb_id <= 0
    ) {
      throw new BadgeEngineError(
        'Metadati Libreria non validi per Serialista',
        'facts_load_failed',
      );
    }
    return watchedEpisodes.length > 0
      ? [
          {
            libraryItemId: row.id,
            titleId: row.title_id,
            tmdbId: title.tmdb_id,
            watchedEpisodes,
          },
        ]
      : [];
  });
  if (candidates.length === 0) {
    return { completedEndedSeriesIds: [] };
  }

  const metadataByTitle = await loadBadgeTitleMetadata(
    supabaseAdmin,
    candidates.map((candidate) => candidate.titleId),
  );
  const resolvedMetadata = await mapWithConcurrency(
    candidates,
    TMDB_REQUEST_CONCURRENCY,
    async (candidate): Promise<ResolvedTvBadgeMetadata> => {
      const cached = cachedTvBadgeMetadata(
        metadataByTitle.get(candidate.titleId),
      );
      if (cached) {
        return {
          ...cached,
          titleId: candidate.titleId,
          fetched: false,
        };
      }
      const fetched = await loadTmdbTvBadgeMetadata(candidate.tmdbId);
      return {
        ...fetched,
        titleId: candidate.titleId,
        fetched: true,
      };
    },
  );

  const fetchedMetadata = resolvedMetadata.filter(
    (metadata) => metadata.fetched,
  );
  if (fetchedMetadata.length > 0) {
    const refreshedAt = new Date().toISOString();
    const { error } = await supabaseAdmin
      .from('badge_title_metadata')
      .upsert(
        fetchedMetadata.map((metadata) => ({
          title_id: metadata.titleId,
          tmdb_status: metadata.status,
          regular_episodes: metadata.regularEpisodes,
          regular_season_counts: metadata.regularSeasons,
          refreshed_at: refreshedAt,
        })),
        { onConflict: 'title_id' },
      );
    if (error) {
      throw new BadgeEngineError(
        `Impossibile aggiornare la cache TMDB badge: ${error.message}`,
        'facts_load_failed',
      );
    }
  }

  return {
    completedEndedSeriesIds: candidates.flatMap(
      (candidate, index) => {
        const metadata = resolvedMetadata[index];
        return metadata.status === 'Ended' &&
          metadata.regularEpisodes > 0 &&
          hasCompletedRegularSeries(
            candidate.watchedEpisodes,
            metadata.regularSeasons,
          )
          ? [candidate.libraryItemId]
          : [];
      },
    ),
  };
}

function genreExplorerTitleRelation(
  row: GenreExplorerLibraryRow,
): {
  id: string;
  tmdb_id: number;
  media_type: string;
  genres: string[] | null;
} | null {
  if (Array.isArray(row.titles)) {
    return row.titles[0] ?? null;
  }
  return row.titles;
}

async function loadGenreExplorerLibraryRows(
  supabaseAdmin: SupabaseClient,
  userId: string,
): Promise<GenreExplorerLibraryRow[]> {
  const libraryRows: GenreExplorerLibraryRow[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabaseAdmin
      .from('library_items')
      .select(
        'id, title_id, titles!inner(id, tmdb_id, media_type, genres)',
      )
      .eq('user_id', userId)
      .eq('status', 'watched')
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) {
      throw new BadgeEngineError(
        `Impossibile leggere i titoli per Esploratore di generi: ${error.message}`,
        'facts_load_failed',
      );
    }
    const rows = (data ?? []) as unknown as GenreExplorerLibraryRow[];
    libraryRows.push(...rows);
    if (rows.length < PAGE_SIZE) {
      break;
    }
  }
  return libraryRows;
}

async function loadBadgeTitleGenres(
  supabaseAdmin: SupabaseClient,
  titleIds: string[],
): Promise<Map<string, BadgeTitleGenresRow>> {
  const genresByTitle = new Map<string, BadgeTitleGenresRow>();
  for (let index = 0; index < titleIds.length; index += 100) {
    const chunk = titleIds.slice(index, index + 100);
    const { data, error } = await supabaseAdmin
      .from('badge_title_genres')
      .select('title_id, tmdb_genre_ids, refreshed_at')
      .in('title_id', chunk);
    if (error) {
      throw new BadgeEngineError(
        `Impossibile leggere la cache generi badge: ${error.message}`,
        'facts_load_failed',
      );
    }
    for (const row of (data ?? []) as BadgeTitleGenresRow[]) {
      genresByTitle.set(row.title_id, row);
    }
  }
  return genresByTitle;
}

function parseTmdbGenreIds(value: unknown): number[] | null {
  if (
    !Array.isArray(value) ||
    value.some(
      (genreId) =>
        !Number.isInteger(genreId) || Number(genreId) <= 0,
    )
  ) {
    return null;
  }
  return Array.from(new Set(value.map(Number))).sort(
    (first, second) => first - second,
  );
}

function cachedTmdbGenreIds(
  row: BadgeTitleGenresRow | undefined,
): number[] | null {
  if (!row) {
    return null;
  }
  const refreshedAt = Date.parse(row.refreshed_at);
  if (
    !Number.isFinite(refreshedAt) ||
    Date.now() - refreshedAt > TMDB_GENRE_METADATA_TTL_MS
  ) {
    return null;
  }
  return parseTmdbGenreIds(row.tmdb_genre_ids);
}

async function requestTmdbTitleGenreIds(
  mediaType: 'movie' | 'tv',
  tmdbId: number,
): Promise<number[]> {
  const payload = await requestTmdbJson(
    `/${mediaType}/${tmdbId}`,
    `i generi ${mediaType}/${tmdbId}`,
  );
  if (
    typeof payload !== 'object' ||
    payload == null ||
    !('genres' in payload) ||
    !Array.isArray(payload.genres)
  ) {
    throw new BadgeEngineError(
      'Risposta TMDB priva dei generi del titolo',
      'tmdb_response_invalid',
    );
  }
  const genreIds: number[] = [];
  for (const genre of payload.genres) {
    if (
      typeof genre !== 'object' ||
      genre == null ||
      !('id' in genre) ||
      !Number.isInteger(genre.id) ||
      Number(genre.id) <= 0
    ) {
      throw new BadgeEngineError(
        'Risposta TMDB con genere non valido',
        'tmdb_response_invalid',
      );
    }
    genreIds.push(Number(genre.id));
  }
  return Array.from(new Set(genreIds)).sort(
    (first, second) => first - second,
  );
}

function loadTmdbTitleGenreIds(
  mediaType: 'movie' | 'tv',
  tmdbId: number,
): Promise<number[]> {
  const key = `${mediaType}:${tmdbId}`;
  const cached = tmdbTitleGenreIdsCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.promise;
  }
  const promise = requestTmdbTitleGenreIds(mediaType, tmdbId).catch(
    (error) => {
      tmdbTitleGenreIdsCache.delete(key);
      throw error;
    },
  );
  tmdbTitleGenreIdsCache.set(key, {
    expiresAt: Date.now() + TMDB_CACHE_TTL_MS,
    promise,
  });
  return promise;
}

async function loadGenreExplorerFacts(
  supabaseAdmin: SupabaseClient,
  userId: string,
): Promise<GenreExplorerFacts> {
  const rows = await loadGenreExplorerLibraryRows(
    supabaseAdmin,
    userId,
  );
  const candidates: GenreExplorerCandidate[] = rows.map((row) => {
    const title = genreExplorerTitleRelation(row);
    if (
      typeof row.id !== 'string' ||
      !row.id.trim() ||
      typeof row.title_id !== 'string' ||
      !row.title_id.trim() ||
      !title ||
      title.id !== row.title_id ||
      (title.media_type !== 'movie' && title.media_type !== 'tv') ||
      !Number.isInteger(title.tmdb_id) ||
      title.tmdb_id <= 0 ||
      (title.genres != null &&
        (!Array.isArray(title.genres) ||
          title.genres.some(
            (genre) => typeof genre !== 'string' || !genre.trim(),
          )))
    ) {
      throw new BadgeEngineError(
        'Metadati Libreria non validi per Esploratore di generi',
        'facts_load_failed',
      );
    }
    return {
      itemId: row.id,
      titleId: row.title_id,
      tmdbId: title.tmdb_id,
      mediaType: title.media_type,
      genreNames: (title.genres ?? []).map((genre) => genre.trim()),
    };
  });
  const missingGenres = candidates.filter(
    (candidate) => candidate.genreNames.length === 0,
  );
  const cachedGenres = await loadBadgeTitleGenres(
    supabaseAdmin,
    missingGenres.map((candidate) => candidate.titleId),
  );
  const resolvedMissingGenres = await mapWithConcurrency(
    missingGenres,
    TMDB_REQUEST_CONCURRENCY,
    async (
      candidate,
    ): Promise<{
      fact: GenreTitleFact;
      titleId: string;
      fetched: boolean;
    }> => {
      const cached = cachedTmdbGenreIds(
        cachedGenres.get(candidate.titleId),
      );
      if (cached) {
        return {
          fact: {
            itemId: candidate.itemId,
            genreNames: [],
            tmdbGenreIds: cached,
          },
          titleId: candidate.titleId,
          fetched: false,
        };
      }
      const fetched = await loadTmdbTitleGenreIds(
        candidate.mediaType,
        candidate.tmdbId,
      );
      return {
        fact: {
          itemId: candidate.itemId,
          genreNames: [],
          tmdbGenreIds: fetched,
        },
        titleId: candidate.titleId,
        fetched: true,
      };
    },
  );

  const fetchedGenres = resolvedMissingGenres.filter(
    (result) => result.fetched,
  );
  if (fetchedGenres.length > 0) {
    const refreshedAt = new Date().toISOString();
    const { error } = await supabaseAdmin
      .from('badge_title_genres')
      .upsert(
        fetchedGenres.map((result) => ({
          title_id: result.titleId,
          tmdb_genre_ids: result.fact.tmdbGenreIds,
          refreshed_at: refreshedAt,
        })),
        { onConflict: 'title_id' },
      );
    if (error) {
      throw new BadgeEngineError(
        `Impossibile aggiornare la cache generi badge: ${error.message}`,
        'facts_load_failed',
      );
    }
  }

  const directFacts: GenreTitleFact[] = candidates
    .filter((candidate) => candidate.genreNames.length > 0)
    .map((candidate) => ({
      itemId: candidate.itemId,
      genreNames: candidate.genreNames,
      tmdbGenreIds: [],
    }));
  return {
    completedTitles: [
      ...directFacts,
      ...resolvedMissingGenres.map((result) => result.fact),
    ],
  };
}

async function loadOneMoreEpisodeFacts(
  supabaseAdmin: SupabaseClient,
  userId: string,
): Promise<OneMoreEpisodeFacts> {
  const trackedEpisodes: TrackedEpisodeFact[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabaseAdmin
      .from('episode_watches')
      .select(
        'id, library_item_id, season_number, episode_number, watched_on',
      )
      .eq('user_id', userId)
      .eq('source', 'tracked')
      .gt('season_number', 0)
      .order('watched_on', { ascending: true })
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) {
      throw new BadgeEngineError(
        `Impossibile leggere gli episodi tracked: ${error.message}`,
        'facts_load_failed',
      );
    }
    const rows = (data ?? []) as TrackedEpisodeWatchRow[];
    for (const row of rows) {
      trackedEpisodes.push({
        watchId: row.id,
        libraryItemId: row.library_item_id,
        seasonNumber: row.season_number,
        episodeNumber: row.episode_number,
        watchedOn: row.watched_on,
      });
    }
    if (rows.length < PAGE_SIZE) {
      break;
    }
  }
  return { trackedEpisodes };
}

async function loadFacts(
  definition: BadgeDefinition,
  supabaseAdmin: SupabaseClient,
  userId: string,
): Promise<unknown> {
  if (definition.id === 'cinephile' && definition.version === 1) {
    return loadCinephileFacts(supabaseAdmin, userId);
  }
  if (definition.id === 'archivist' && definition.version === 1) {
    return loadArchivistFacts(supabaseAdmin, userId);
  }
  if (definition.id === 'nostalgic' && definition.version === 1) {
    return loadNostalgicFacts(supabaseAdmin, userId);
  }
  if (definition.id === 'serialist' && definition.version === 1) {
    return loadSerialistFacts(supabaseAdmin, userId);
  }
  if (
    definition.id === 'genre_explorer' &&
    definition.version === 1
  ) {
    return loadGenreExplorerFacts(supabaseAdmin, userId);
  }
  if (
    definition.id === 'one_more_episode' &&
    definition.version === 1
  ) {
    return loadOneMoreEpisodeFacts(supabaseAdmin, userId);
  }
  if (
    definition.version === 1 &&
    ['first_watch', 'first_review', 'season_complete'].includes(
      definition.id,
    ) &&
    (await hasExistingUnlock(supabaseAdmin, userId, definition))
  ) {
    if (definition.id === 'season_complete') {
      return {
        completedSeasonKeys: [`unlocked:${definition.id}`],
      } satisfies SeasonCompleteFacts;
    }
    return {
      activityIds: [`unlocked:${definition.id}`],
    } satisfies FirstWatchFacts | FirstReviewFacts;
  }
  if (definition.id === 'first_watch' && definition.version === 1) {
    return loadFirstWatchFacts(supabaseAdmin, userId);
  }
  if (definition.id === 'first_review' && definition.version === 1) {
    return loadFirstReviewFacts(supabaseAdmin, userId);
  }
  if (definition.id === 'season_complete' && definition.version === 1) {
    return loadSeasonCompleteFacts(supabaseAdmin, userId);
  }
  throw new BadgeEngineError(
    `Caricatore fatti non disponibile per ${definition.id}@${definition.version}`,
    'facts_loader_not_found',
  );
}

function statusFor(error: unknown): number {
  if (!(error instanceof BadgeEngineError)) {
    return 500;
  }
  if (
    error.code === 'request_invalid' ||
    error.code === 'badge_ids_invalid' ||
    error.code === 'backfill_invalid' ||
    error.code === 'facts_invalid'
  ) {
    return 400;
  }
  if (
    error.code === 'evaluator_not_found' ||
    error.code === 'facts_loader_not_found' ||
    error.code === 'definition_not_found' ||
    error.code === 'definition_mismatch' ||
    error.code === 'definition_inactive' ||
    error.code === 'levels_missing' ||
    error.code === 'definition_invalid'
  ) {
    return 409;
  }
  if (
    error.code === 'tmdb_not_configured' ||
    error.code === 'tmdb_load_failed'
  ) {
    return 503;
  }
  return 500;
}

export default {
  fetch: withSupabase({ auth: 'user' }, async (request, context) => {
    if (request.method !== 'POST') {
      return Response.json(
        { error: { code: 'method_not_allowed', message: 'Metodo non consentito' } },
        { status: 405 },
      );
    }

    try {
      const body = parseRequestText(await request.text());
      const userId = context.userClaims?.id;
      if (!userId) {
        return Response.json(
          { error: { code: 'unauthorized', message: 'Autenticazione richiesta' } },
          { status: 401 },
        );
      }

      let definitionsQuery = context.supabaseAdmin
        .from('badge_definitions')
        .select(
          'id, version, category, name, description, icon_key, is_active',
        )
        .eq('is_active', true)
        .order('id', { ascending: true })
        .order('version', { ascending: false });
      if (body.badgeIds?.length) {
        definitionsQuery = definitionsQuery.in('id', body.badgeIds);
      }
      const { data: rawDefinitions, error: definitionsError } =
        await definitionsQuery;
      if (definitionsError) {
        throw new BadgeEngineError(
          `Impossibile leggere le definizioni badge: ${definitionsError.message}`,
          'definitions_load_failed',
        );
      }
      const latestDefinitions = new Map<string, BadgeDefinitionRow>();
      for (const definition of (rawDefinitions ?? []) as BadgeDefinitionRow[]) {
        if (!latestDefinitions.has(definition.id)) {
          latestDefinitions.set(definition.id, definition);
        }
      }
      const definitionRows = Array.from(latestDefinitions.values());
      if (body.badgeIds?.length) {
        const returnedIds = new Set(
          definitionRows.map((definition) => definition.id),
        );
        const missingIds = body.badgeIds.filter(
          (badgeId) => !returnedIds.has(badgeId),
        );
        if (missingIds.length > 0) {
          throw new BadgeEngineError(
            `Definizioni badge non disponibili: ${missingIds.join(', ')}`,
            'definition_not_found',
          );
        }
      }

      const definitionIds = Array.from(
        new Set(definitionRows.map((definition) => definition.id)),
      );
      const { data: rawLevels, error: levelsError } =
        definitionIds.length > 0
          ? await context.supabaseAdmin
              .from('badge_levels')
              .select(
                'badge_id, badge_version, level, level_key, name, description, threshold, icon_key',
              )
              .in('badge_id', definitionIds)
              .order('badge_id', { ascending: true })
              .order('badge_version', { ascending: false })
              .order('level', { ascending: true })
          : { data: [], error: null };
      if (levelsError) {
        throw new BadgeEngineError(
          `Impossibile leggere i livelli badge: ${levelsError.message}`,
          'levels_load_failed',
        );
      }
      const levelRows = (rawLevels ?? []) as BadgeLevelRow[];
      const definitions = definitionRows.map((definition) =>
        toDefinition(definition, levelRows),
      );
      const evaluatedAt = new Date().toISOString();
      const evaluationContext: BadgeEvaluationContext = {
        evaluatedAt,
        isBackfill: body.backfill ?? false,
      };
      const evaluations: BadgeEvaluation[] = [];
      const results: EvaluationResult[] = [];

      for (const definition of definitions) {
        const facts = await loadFacts(
          definition,
          context.supabaseAdmin,
          userId,
        );
        const evaluation = registry.evaluate(
          definition,
          facts,
          evaluationContext,
        );
        evaluations.push(evaluation);
      }

      for (const evaluation of evaluations) {
        const { data: rawUnlocks, error: persistError } =
          await context.supabaseAdmin.rpc('apply_badge_evaluation', {
            p_user_id: userId,
            p_badge_id: evaluation.badgeId,
            p_rule_version: evaluation.version,
            p_progress: evaluation.progress,
            p_evidence: evaluation.evidence,
            p_evaluated_at: evaluatedAt,
            p_is_backfill: body.backfill ?? false,
          });
        if (persistError) {
          throw new BadgeEngineError(
            `Impossibile salvare la valutazione ${evaluation.badgeId}: ${persistError.message}`,
            'evaluation_persist_failed',
          );
        }
        results.push({
          evaluation: {
            badgeId: evaluation.badgeId,
            version: evaluation.version,
            progress: evaluation.progress,
            unlockedLevels: evaluation.unlockedLevels,
            nextThreshold: evaluation.nextThreshold,
          },
          newUnlocks: (rawUnlocks ?? []) as NewUnlockRow[],
        });
      }

      return Response.json({
        evaluatedAt,
        backfill: body.backfill ?? false,
        totalNewUnlocks: results.reduce(
          (total, result) => total + result.newUnlocks.length,
          0,
        ),
        results,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Errore badge sconosciuto';
      const code =
        error instanceof BadgeEngineError
          ? error.code
          : 'badge_evaluation_failed';
      console.error('Badge evaluation failed', { code, message });
      return Response.json(
        { error: { code, message } },
        { status: statusFor(error) },
      );
    }
  }),
};
