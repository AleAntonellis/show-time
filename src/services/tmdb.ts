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

export type WatchProviderRegion = {
  code: string;
  name: string;
};

export type WatchProvider = {
  id: number;
  name: string;
  logoUrl: string | null;
  priority: number;
};

export type WatchProviderAvailability = {
  region: string;
  subscription: WatchProvider[];
  free: WatchProvider[];
  rent: WatchProvider[];
  buy: WatchProvider[];
};

export type PersonTitleSection = {
  id: string;
  personId: number;
  personName: string;
  kind: 'cast' | 'director';
  title: string;
  titles: Title[];
};

export type CatalogSearchResult = {
  titles: Title[];
  personSections: PersonTitleSection[];
};

export type PersonTitleCredit = Title & {
  credit: string | null;
  releaseDate: string | null;
};

export type PersonDetails = {
  id: number;
  name: string;
  biography: string;
  birthday: string | null;
  deathday: string | null;
  placeOfBirth: string | null;
  knownForDepartment: string | null;
  profileUrl: string | null;
  acting: PersonTitleCredit[];
  directing: PersonTitleCredit[];
};

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

export type DetailSeason = SeasonSummary;

export type NextEpisode = {
  seasonNumber: number;
  episodeNumber: number;
  name: string;
  airDate: string | null;
};

export type CastMember = {
  id: number;
  name: string;
  character: string | null;
  profileUrl: string | null;
};

export type DirectorCredit = {
  id: number;
  name: string;
  episodeCount: number | null;
  profileUrl: string | null;
};

export type TitleCredits = {
  cast: CastMember[];
  directors: DirectorCredit[];
};

export type TitleDetails = Title & {
  backdropUrl: string | null;
  tagline: string;
  releaseDate: string | null;
  runtime: number | null;
  genres: string[];
  voteCount: number;
  status: string | null;
  numberOfSeasons: number | null;
  numberOfEpisodes: number | null;
  seasons: DetailSeason[];
  lastEpisode: NextEpisode | null;
  nextEpisode: NextEpisode | null;
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

type TmdbTrendingItem = Omit<TmdbSearchItem, 'media_type'> & {
  media_type?: string;
  adult?: boolean;
};

type TmdbTrendingResponse = {
  results?: TmdbTrendingItem[];
};

type TmdbPersonSearchItem = {
  id?: number;
  name?: string;
  adult?: boolean;
  popularity?: number;
};

type TmdbPersonSearchResponse = {
  results?: TmdbPersonSearchItem[];
};

type TmdbPersonDetailsResponse = {
  id: number;
  name?: string;
  biography?: string;
  birthday?: string | null;
  deathday?: string | null;
  place_of_birth?: string | null;
  profile_path?: string | null;
  known_for_department?: string;
};

type TmdbCreditItem = TmdbSearchItem & {
  adult?: boolean;
  popularity?: number;
  vote_count?: number;
  character?: string;
  job?: string;
  department?: string;
};

type TmdbCombinedCreditsResponse = {
  cast?: TmdbCreditItem[];
  crew?: TmdbCreditItem[];
};

type TmdbPersonCreditItem = {
  id?: number;
  name?: string;
  profile_path?: string | null;
  adult?: boolean;
};

type TmdbMovieCastItem = TmdbPersonCreditItem & {
  character?: string;
  order?: number;
};

type TmdbMovieCrewItem = TmdbPersonCreditItem & {
  job?: string;
};

type TmdbTvCastItem = TmdbPersonCreditItem & {
  order?: number;
  roles?: {
    character?: string;
    episode_count?: number;
  }[];
  total_episode_count?: number;
};

type TmdbTvCrewItem = TmdbPersonCreditItem & {
  jobs?: {
    job?: string;
    episode_count?: number;
  }[];
};

type TmdbMovieCreditsResponse = {
  cast?: TmdbMovieCastItem[];
  crew?: TmdbMovieCrewItem[];
};

type TmdbTvAggregateCreditsResponse = {
  cast?: TmdbTvCastItem[];
  crew?: TmdbTvCrewItem[];
};

type TmdbTitleDetailsResponse = {
  id: number;
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  overview?: string;
  tagline?: string;
  vote_average?: number;
  vote_count?: number;
  runtime?: number | null;
  episode_run_time?: number[];
  genres?: { name?: string }[];
  status?: string;
  number_of_seasons?: number;
  number_of_episodes?: number;
  seasons?: {
    season_number: number;
    name?: string;
    episode_count?: number;
    air_date?: string | null;
    poster_path?: string | null;
  }[];
  next_episode_to_air?: {
    season_number: number;
    episode_number: number;
    name?: string;
    air_date?: string | null;
    runtime?: number | null;
  } | null;
  last_episode_to_air?: {
    season_number: number;
    episode_number: number;
    name?: string;
    air_date?: string | null;
    runtime?: number | null;
  } | null;
};

type TmdbWatchProviderItem = {
  provider_id?: number;
  provider_name?: string;
  logo_path?: string | null;
  display_priority?: number;
};

type TmdbWatchProviderCountry = {
  flatrate?: TmdbWatchProviderItem[];
  free?: TmdbWatchProviderItem[];
  ads?: TmdbWatchProviderItem[];
  rent?: TmdbWatchProviderItem[];
  buy?: TmdbWatchProviderItem[];
};

type TmdbWatchProvidersResponse = {
  results?: Record<string, TmdbWatchProviderCountry>;
};

type TmdbWatchRegionsResponse = {
  results?: {
    iso_3166_1?: string;
    english_name?: string;
    native_name?: string;
  }[];
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

export function backdropUrl(path: string | null | undefined): string | null {
  return path ? `${IMAGE_BASE}/w780${path}` : null;
}

function providerLogoUrl(path: string | null | undefined): string | null {
  return path ? `${IMAGE_BASE}/w92${path}` : null;
}

function profileUrl(path: string | null | undefined): string | null {
  return path ? `${IMAGE_BASE}/w185${path}` : null;
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

function normalizeCredit(item: TmdbCreditItem): Title | null {
  if (item.adult || (item.media_type !== 'movie' && item.media_type !== 'tv')) {
    return null;
  }
  return normalize(item);
}

function titleKey(title: Title): string {
  return `${title.mediaType}-${title.id}`;
}

function rankedCreditTitles(
  items: TmdbCreditItem[],
  excludedKeys: Set<string> = new Set(),
  limit = 12,
): Title[] {
  const byKey = new Map<
    string,
    { title: Title; popularity: number; voteCount: number }
  >();
  for (const item of items) {
    const title = normalizeCredit(item);
    if (!title) {
      continue;
    }
    const key = titleKey(title);
    if (excludedKeys.has(key)) {
      continue;
    }
    const candidate = {
      title,
      popularity: item.popularity ?? 0,
      voteCount: item.vote_count ?? 0,
    };
    const current = byKey.get(key);
    if (
      !current ||
      candidate.popularity > current.popularity ||
      (candidate.popularity === current.popularity &&
        candidate.voteCount > current.voteCount)
    ) {
      byKey.set(key, candidate);
    }
  }
  return Array.from(byKey.values())
    .sort(
      (a, b) =>
        b.voteCount - a.voteCount ||
        b.popularity - a.popularity ||
        a.title.title.localeCompare(b.title.title, 'it'),
    )
    .slice(0, limit)
    .map((entry) => entry.title);
}

function personTitleCredits(
  items: TmdbCreditItem[],
  creditFor: (item: TmdbCreditItem) => string | null,
): PersonTitleCredit[] {
  const byKey = new Map<
    string,
    {
      value: PersonTitleCredit;
      popularity: number;
      voteCount: number;
    }
  >();

  for (const item of items) {
    const title = normalizeCredit(item);
    if (!title) {
      continue;
    }
    const value: PersonTitleCredit = {
      ...title,
      credit: creditFor(item),
      releaseDate: item.release_date ?? item.first_air_date ?? null,
    };
    const key = titleKey(title);
    const candidate = {
      value,
      popularity: item.popularity ?? 0,
      voteCount: item.vote_count ?? 0,
    };
    const current = byKey.get(key);
    if (
      !current ||
      (!current.value.credit && Boolean(value.credit)) ||
      (Boolean(current.value.credit) === Boolean(value.credit) &&
        candidate.popularity > current.popularity)
    ) {
      byKey.set(key, candidate);
    }
  }

  return Array.from(byKey.values())
    .sort(
      (a, b) =>
        (b.value.releaseDate ?? '').localeCompare(
          a.value.releaseDate ?? '',
        ) ||
        b.voteCount - a.voteCount ||
        b.popularity - a.popularity ||
        a.value.title.localeCompare(b.value.title, 'it'),
    )
    .map((entry) => entry.value);
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

export type TrendingMediaFilter = 'all' | MediaType;

const WEEKLY_TREND_CACHE_TTL_MS = 60 * 60 * 1000;
const weeklyTrendCache = new Map<
  TrendingMediaFilter,
  { expiresAt: number; promise: Promise<Title[]> }
>();

async function loadWeeklyTrendingTitles(
  mediaFilter: TrendingMediaFilter,
): Promise<Title[]> {
  const data = await request<TmdbTrendingResponse>(
    `/trending/${mediaFilter}/week`,
  );
  const fallbackMediaType = mediaFilter === 'all' ? null : mediaFilter;

  return (data.results ?? [])
    .filter((item) => !item.adult)
    .map((item) =>
      normalize({
        ...item,
        media_type: item.media_type ?? fallbackMediaType ?? '',
      }),
    )
    .filter((item): item is Title => item !== null);
}

/** Titoli più in tendenza su TMDB nell'ultima settimana. */
export function getWeeklyTrendingTitles(
  mediaFilter: TrendingMediaFilter,
): Promise<Title[]> {
  const cached = weeklyTrendCache.get(mediaFilter);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.promise;
  }

  const promise = loadWeeklyTrendingTitles(mediaFilter).catch((error) => {
    weeklyTrendCache.delete(mediaFilter);
    throw error;
  });
  weeklyTrendCache.set(mediaFilter, {
    expiresAt: Date.now() + WEEKLY_TREND_CACHE_TTL_MS,
    promise,
  });
  return promise;
}

const personCreditsCache = new Map<number, Promise<TmdbCombinedCreditsResponse>>();
const personDetailsCache = new Map<number, Promise<PersonDetails>>();
const catalogSearchCache = new Map<string, Promise<CatalogSearchResult>>();
const MAX_CATALOG_SEARCH_CACHE_ENTRIES = 50;

function getPersonCredits(personId: number): Promise<TmdbCombinedCreditsResponse> {
  const cached = personCreditsCache.get(personId);
  if (cached) {
    return cached;
  }
  const requestPromise = request<TmdbCombinedCreditsResponse>(
    `/person/${personId}/combined_credits`,
  ).catch((error) => {
    personCreditsCache.delete(personId);
    throw error;
  });
  personCreditsCache.set(personId, requestPromise);
  return requestPromise;
}

async function loadPersonDetails(personId: number): Promise<PersonDetails> {
  const [person, credits] = await Promise.all([
    request<TmdbPersonDetailsResponse>(`/person/${personId}`),
    getPersonCredits(personId),
  ]);
  const name = person.name?.trim();
  if (!name) {
    throw new Error('Profilo TMDB non valido');
  }

  const acting = personTitleCredits(
    (credits.cast ?? []).filter(
      (credit) =>
        !/\b(self|himself|herself|themself|themselves)\b/i.test(
          credit.character ?? '',
        ),
    ),
    (credit) => credit.character?.trim() || null,
  );
  const directing = personTitleCredits(
    (credits.crew ?? []).filter((credit) => credit.job === 'Director'),
    () => 'Regia',
  );

  return {
    id: person.id,
    name,
    biography: person.biography?.trim() ?? '',
    birthday: person.birthday ?? null,
    deathday: person.deathday ?? null,
    placeOfBirth: person.place_of_birth?.trim() || null,
    knownForDepartment: person.known_for_department?.trim() || null,
    profileUrl: profileUrl(person.profile_path),
    acting,
    directing,
  };
}

/** Profilo TMDB con filmografie complete come interprete e regista. */
export function getPersonDetails(personId: number): Promise<PersonDetails> {
  const cached = personDetailsCache.get(personId);
  if (cached) {
    return cached;
  }
  const requestPromise = loadPersonDetails(personId).catch((error) => {
    personDetailsCache.delete(personId);
    throw error;
  });
  personDetailsCache.set(personId, requestPromise);
  return requestPromise;
}

async function loadCatalogSearch(trimmed: string): Promise<CatalogSearchResult> {
  const [titles, peopleResponse] = await Promise.all([
    searchTitles(trimmed),
    request<TmdbPersonSearchResponse>('/search/person', {
      query: trimmed,
      include_adult: 'false',
      page: '1',
    }),
  ]);
  const people = (peopleResponse.results ?? [])
    .filter(
      (person): person is TmdbPersonSearchItem & { id: number; name: string } =>
        !person.adult &&
        Number.isInteger(person.id) &&
        Number(person.id) > 0 &&
        Boolean(person.name?.trim()),
    )
    .slice(0, 3);

  const creditsByPerson = await Promise.all(
    people.map(async (person) => ({
      person,
      credits: await getPersonCredits(person.id),
    })),
  );
  const personSections: PersonTitleSection[] = [];

  for (const { person, credits } of creditsByPerson) {
    const directedTitles = rankedCreditTitles(
      (credits.crew ?? []).filter((credit) => credit.job === 'Director'),
    );
    const directedKeys = new Set(directedTitles.map(titleKey));
    const castTitles = rankedCreditTitles(
      (credits.cast ?? []).filter(
        (credit) =>
          !/\b(self|himself|herself|themself|themselves)\b/i.test(
            credit.character ?? '',
          ),
      ),
      directedKeys,
    );

    if (castTitles.length > 0) {
      personSections.push({
        id: `${person.id}-cast`,
        personId: person.id,
        personName: person.name.trim(),
        kind: 'cast',
        title: `Con ${person.name.trim()}`,
        titles: castTitles,
      });
    }
    if (directedTitles.length > 0) {
      personSections.push({
        id: `${person.id}-director`,
        personId: person.id,
        personName: person.name.trim(),
        kind: 'director',
        title: `Diretto da ${person.name.trim()}`,
        titles: directedTitles,
      });
    }
  }

  return { titles, personSections };
}

/** Cerca titoli direttamente e tramite cast/regia delle prime persone corrispondenti. */
export function searchCatalog(query: string): Promise<CatalogSearchResult> {
  const trimmed = query.trim();
  if (!trimmed) {
    return Promise.resolve({ titles: [], personSections: [] });
  }
  const cacheKey = trimmed.toLocaleLowerCase('it');
  const cached = catalogSearchCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  if (catalogSearchCache.size >= MAX_CATALOG_SEARCH_CACHE_ENTRIES) {
    const oldestKey = catalogSearchCache.keys().next().value;
    if (oldestKey) {
      catalogSearchCache.delete(oldestKey);
    }
  }
  const requestPromise = loadCatalogSearch(trimmed).catch((error) => {
    catalogSearchCache.delete(cacheKey);
    throw error;
  });
  catalogSearchCache.set(cacheKey, requestPromise);
  return requestPromise;
}

/** Dettaglio completo di un film o una serie TV. */
export async function getTitleDetails(
  mediaType: MediaType,
  titleId: number,
): Promise<TitleDetails> {
  const data = await request<TmdbTitleDetailsResponse>(`/${mediaType}/${titleId}`);
  const releaseDate = data.release_date ?? data.first_air_date ?? null;
  const seasons =
    mediaType === 'tv'
      ? (data.seasons ?? [])
          .filter((season) => season.season_number > 0)
          .map((season) => ({
            seasonNumber: season.season_number,
            name: season.name ?? `Stagione ${season.season_number}`,
            episodeCount: season.episode_count ?? 0,
            airDate: season.air_date ?? null,
            posterUrl: posterUrl(season.poster_path, 'w185'),
          }))
      : [];
  const nextEpisode = data.next_episode_to_air
    ? {
        seasonNumber: data.next_episode_to_air.season_number,
        episodeNumber: data.next_episode_to_air.episode_number,
        name:
          data.next_episode_to_air.name ??
          `Episodio ${data.next_episode_to_air.episode_number}`,
        airDate: data.next_episode_to_air.air_date ?? null,
      }
    : null;
  const lastEpisode = data.last_episode_to_air
    ? {
        seasonNumber: data.last_episode_to_air.season_number,
        episodeNumber: data.last_episode_to_air.episode_number,
        name:
          data.last_episode_to_air.name ??
          `Episodio ${data.last_episode_to_air.episode_number}`,
        airDate: data.last_episode_to_air.air_date ?? null,
      }
    : null;

  return {
    id: data.id,
    mediaType,
    title: data.title ?? data.name ?? 'Senza titolo',
    year: releaseDate ? releaseDate.slice(0, 4) : null,
    posterPath: data.poster_path ?? null,
    posterUrl: posterUrl(data.poster_path, 'w500'),
    backdropUrl: backdropUrl(data.backdrop_path),
    overview: data.overview ?? '',
    tagline: data.tagline ?? '',
    voteAverage: data.vote_average ?? 0,
    voteCount: data.vote_count ?? 0,
    releaseDate,
    runtime:
      data.runtime ??
      data.episode_run_time?.find((duration) => duration > 0) ??
      data.last_episode_to_air?.runtime ??
      data.next_episode_to_air?.runtime ??
      null,
    genres: (data.genres ?? [])
      .map((genre) => genre.name?.trim())
      .filter((name): name is string => Boolean(name)),
    status: data.status ?? null,
    numberOfSeasons: mediaType === 'tv' ? (data.number_of_seasons ?? seasons.length) : null,
    numberOfEpisodes:
      mediaType === 'tv'
        ? (data.number_of_episodes ??
          seasons.reduce((total, season) => total + season.episodeCount, 0))
        : null,
    seasons,
    lastEpisode,
    nextEpisode,
  };
}

/** Regia e primi dieci interpreti di un film o dell'intera serie TV. */
export async function getTitleCredits(
  mediaType: MediaType,
  titleId: number,
): Promise<TitleCredits> {
  if (mediaType === 'movie') {
    const data = await request<TmdbMovieCreditsResponse>(
      `/movie/${titleId}/credits`,
    );
    const cast = (data.cast ?? [])
      .filter(
        (member): member is TmdbMovieCastItem & { id: number; name: string } =>
          !member.adult &&
          Number.isInteger(member.id) &&
          Number(member.id) > 0 &&
          Boolean(member.name?.trim()),
      )
      .sort(
        (a, b) =>
          (a.order ?? Number.MAX_SAFE_INTEGER) -
          (b.order ?? Number.MAX_SAFE_INTEGER),
      )
      .slice(0, 10)
      .map((member) => ({
        id: member.id,
        name: member.name.trim(),
        character: member.character?.trim() || null,
        profileUrl: profileUrl(member.profile_path),
      }));
    const directors = (data.crew ?? [])
      .filter(
        (
          member,
        ): member is TmdbMovieCrewItem & { id: number; name: string } =>
          !member.adult &&
          member.job === 'Director' &&
          Number.isInteger(member.id) &&
          Number(member.id) > 0 &&
          Boolean(member.name?.trim()),
      )
      .filter(
        (member, index, members) =>
          members.findIndex((candidate) => candidate.id === member.id) === index,
      )
      .map((member) => ({
        id: member.id,
        name: member.name.trim(),
        episodeCount: null,
        profileUrl: profileUrl(member.profile_path),
      }));
    return { cast, directors };
  }

  const data = await request<TmdbTvAggregateCreditsResponse>(
    `/tv/${titleId}/aggregate_credits`,
  );
  const cast = (data.cast ?? [])
    .filter(
      (member): member is TmdbTvCastItem & { id: number; name: string } =>
        !member.adult &&
        Number.isInteger(member.id) &&
        Number(member.id) > 0 &&
        Boolean(member.name?.trim()),
    )
    .sort(
      (a, b) =>
        (a.order ?? Number.MAX_SAFE_INTEGER) -
          (b.order ?? Number.MAX_SAFE_INTEGER) ||
        (b.total_episode_count ?? 0) - (a.total_episode_count ?? 0),
    )
    .slice(0, 10)
    .map((member) => {
      const character = [...(member.roles ?? [])]
        .sort(
          (a, b) => (b.episode_count ?? 0) - (a.episode_count ?? 0),
        )
        .map((role) => role.character?.trim())
        .find((role): role is string => Boolean(role));
      return {
        id: member.id,
        name: member.name.trim(),
        character: character ?? null,
        profileUrl: profileUrl(member.profile_path),
      };
    });
  const directors = (data.crew ?? [])
    .filter(
      (member): member is TmdbTvCrewItem & { id: number; name: string } =>
        !member.adult &&
        Number.isInteger(member.id) &&
        Number(member.id) > 0 &&
        Boolean(member.name?.trim()),
    )
    .map((member) => ({
      member,
      episodeCount: (member.jobs ?? [])
        .filter((job) => job.job === 'Director')
        .reduce((total, job) => total + (job.episode_count ?? 0), 0),
    }))
    .filter((entry) => entry.episodeCount > 0)
    .sort(
      (a, b) =>
        b.episodeCount - a.episodeCount ||
        a.member.name.localeCompare(b.member.name, 'it'),
    )
    .map(({ member, episodeCount }) => ({
      id: member.id,
      name: member.name.trim(),
      episodeCount,
      profileUrl: profileUrl(member.profile_path),
    }));
  return { cast, directors };
}

function normalizeWatchProviders(
  items: TmdbWatchProviderItem[] | undefined,
): WatchProvider[] {
  return (items ?? [])
    .filter(
      (item): item is TmdbWatchProviderItem & {
        provider_id: number;
        provider_name: string;
      } =>
        Number.isInteger(item.provider_id) &&
        Number(item.provider_id) > 0 &&
        Boolean(item.provider_name?.trim()),
    )
    .map((item) => ({
      id: item.provider_id,
      name: item.provider_name.trim(),
      logoUrl: providerLogoUrl(item.logo_path),
      priority: item.display_priority ?? 1000,
    }))
    .sort((a, b) => a.priority - b.priority || a.name.localeCompare(b.name));
}

function mergeWatchProviders(
  ...groups: (TmdbWatchProviderItem[] | undefined)[]
): WatchProvider[] {
  const providers = new Map<number, WatchProvider>();
  for (const provider of groups.flatMap(normalizeWatchProviders)) {
    const current = providers.get(provider.id);
    if (!current || provider.priority < current.priority) {
      providers.set(provider.id, provider);
    }
  }
  return Array.from(providers.values()).sort(
    (a, b) => a.priority - b.priority || a.name.localeCompare(b.name),
  );
}

export async function fetchWatchProviderRegions(): Promise<WatchProviderRegion[]> {
  const data = await request<TmdbWatchRegionsResponse>('/watch/providers/regions');
  return (data.results ?? [])
    .map((region) => {
      const code = region.iso_3166_1?.trim().toUpperCase() ?? '';
      const name =
        region.native_name?.trim() || region.english_name?.trim() || code;
      return { code, name };
    })
    .filter((region) => /^[A-Z]{2}$/.test(region.code) && Boolean(region.name))
    .sort((a, b) => a.name.localeCompare(b.name, 'it'));
}

export async function fetchTitleWatchProviders(
  mediaType: MediaType,
  titleId: number,
  region: string,
): Promise<WatchProviderAvailability> {
  if (!Number.isInteger(titleId) || titleId <= 0) {
    throw new Error('Titolo non valido');
  }
  const normalizedRegion = region.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(normalizedRegion)) {
    throw new Error('Paese non valido');
  }

  const data = await request<TmdbWatchProvidersResponse>(
    `/${mediaType}/${titleId}/watch/providers`,
  );
  const country = data.results?.[normalizedRegion];
  return {
    region: normalizedRegion,
    subscription: normalizeWatchProviders(country?.flatrate),
    free: mergeWatchProviders(country?.free, country?.ads),
    rent: normalizeWatchProviders(country?.rent),
    buy: normalizeWatchProviders(country?.buy),
  };
}

// ---------------------------------------------------------------------------
// Serie TV: dettaglio, stagioni ed episodi
// ---------------------------------------------------------------------------

export type SeasonSummary = {
  seasonNumber: number;
  name: string;
  episodeCount: number;
  airDate: string | null;
  posterUrl: string | null;
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
    air_date?: string | null;
    poster_path?: string | null;
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
      airDate: s.air_date ?? null,
      posterUrl: posterUrl(s.poster_path, 'w185'),
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
