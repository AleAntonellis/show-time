/**
 * Client TMDB (The Movie Database).
 *
 * Autenticazione: metti la chiave in `.env.local` (non committata).
 * Supporta due modalità:
 *   - EXPO_PUBLIC_TMDB_ACCESS_TOKEN  → "API Read Access Token" v4 (consigliato, header Bearer)
 *   - EXPO_PUBLIC_TMDB_API_KEY       → "API Key" v3 (query param api_key)
 *
 * Ottieni le credenziali gratis su https://www.themoviedb.org/settings/api
 */

const API_BASE = 'https://api.themoviedb.org/3';
const IMAGE_BASE = 'https://image.tmdb.org/t/p';

const ACCESS_TOKEN = process.env.EXPO_PUBLIC_TMDB_ACCESS_TOKEN;
const API_KEY = process.env.EXPO_PUBLIC_TMDB_API_KEY;

export type MediaType = 'movie' | 'tv';

export type Title = {
  id: number;
  mediaType: MediaType;
  title: string;
  year: string | null;
  posterPath: string | null;
  posterUrl: string | null;
  overview: string;
  voteAverage: number;
};

type TmdbSearchItem = {
  id: number;
  media_type: string;
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path?: string | null;
  overview?: string;
  vote_average?: number;
};

type TmdbSearchResponse = {
  results?: TmdbSearchItem[];
};

export function isTmdbConfigured(): boolean {
  return Boolean(ACCESS_TOKEN || API_KEY);
}

export function posterUrl(
  path: string | null | undefined,
  size: 'w185' | 'w342' | 'w500' = 'w342',
): string | null {
  return path ? `${IMAGE_BASE}/${size}${path}` : null;
}

function buildUrl(path: string, params: Record<string, string> = {}): string {
  const url = new URL(`${API_BASE}${path}`);
  url.searchParams.set('language', 'it-IT');
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  if (!ACCESS_TOKEN && API_KEY) {
    url.searchParams.set('api_key', API_KEY);
  }
  return url.toString();
}

async function request<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  if (!isTmdbConfigured()) {
    throw new Error('TMDB non configurato: aggiungi la chiave in .env.local');
  }
  const headers: Record<string, string> = { accept: 'application/json' };
  if (ACCESS_TOKEN) {
    headers.Authorization = `Bearer ${ACCESS_TOKEN}`;
  }
  const response = await fetch(buildUrl(path, params), { headers });
  if (!response.ok) {
    throw new Error(`Errore TMDB (${response.status})`);
  }
  return response.json() as Promise<T>;
}

function normalize(item: TmdbSearchItem): Title | null {
  if (item.media_type !== 'movie' && item.media_type !== 'tv') {
    return null;
  }
  const date = item.release_date ?? item.first_air_date ?? '';
  return {
    id: item.id,
    mediaType: item.media_type,
    title: item.title ?? item.name ?? 'Senza titolo',
    year: date ? date.slice(0, 4) : null,
    posterPath: item.poster_path ?? null,
    posterUrl: posterUrl(item.poster_path),
    overview: item.overview ?? '',
    voteAverage: item.vote_average ?? 0,
  };
}

/** Cerca film e serie TV per titolo. */
export async function searchTitles(query: string): Promise<Title[]> {
  const trimmed = query.trim();
  if (!trimmed) {
    return [];
  }
  const data = await request<TmdbSearchResponse>('/search/multi', {
    query: trimmed,
    include_adult: 'false',
    page: '1',
  });
  return (data.results ?? [])
    .map(normalize)
    .filter((item): item is Title => item !== null);
}

// ---------------------------------------------------------------------------
// Serie TV: dettaglio, stagioni ed episodi
// ---------------------------------------------------------------------------

export type SeasonSummary = {
  seasonNumber: number;
  name: string;
  episodeCount: number;
};

export type TvDetails = {
  numberOfEpisodes: number;
  seasons: SeasonSummary[];
};

export type Episode = {
  episodeNumber: number;
  name: string;
  airDate: string | null;
  overview: string;
};

type TmdbTvDetailsResponse = {
  number_of_episodes?: number;
  seasons?: {
    season_number: number;
    name?: string;
    episode_count?: number;
  }[];
};

type TmdbSeasonResponse = {
  episodes?: {
    episode_number: number;
    name?: string;
    air_date?: string | null;
    overview?: string;
  }[];
};

/** Dettaglio serie: numero totale episodi e stagioni (esclude gli "speciali", stagione 0). */
export async function getTvDetails(tvId: number): Promise<TvDetails> {
  const data = await request<TmdbTvDetailsResponse>(`/tv/${tvId}`);
  const seasons = (data.seasons ?? [])
    .filter((s) => s.season_number > 0 && (s.episode_count ?? 0) > 0)
    .map((s) => ({
      seasonNumber: s.season_number,
      name: s.name ?? `Stagione ${s.season_number}`,
      episodeCount: s.episode_count ?? 0,
    }));
  return {
    numberOfEpisodes: data.number_of_episodes ?? seasons.reduce((n, s) => n + s.episodeCount, 0),
    seasons,
  };
}

/** Episodi di una stagione. */
export async function getSeasonEpisodes(tvId: number, seasonNumber: number): Promise<Episode[]> {
  const data = await request<TmdbSeasonResponse>(`/tv/${tvId}/season/${seasonNumber}`);
  return (data.episodes ?? []).map((e) => ({
    episodeNumber: e.episode_number,
    name: e.name ?? `Episodio ${e.episode_number}`,
    airDate: e.air_date ?? null,
    overview: e.overview ?? '',
  }));
}
