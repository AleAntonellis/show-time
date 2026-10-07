/**
 * Livello dati della libreria personale (Supabase).
 *
 * Film  → stato manuale: da vedere / in corso / visto.
 * Serie → tracking per episodio; lo stato è derivato dal progresso.
 */

import {
  ALL_BADGE_IDS,
  BADGE_IDS,
  queueBadgeEvaluation,
} from '@/services/badges';
import { fetchAllPages } from '@/services/pagination';
import { getSupabase } from '@/services/supabase';
import { getTvDetails, posterUrl, type MediaType, type Title } from '@/services/tmdb';

export type LibraryStatus = 'to_watch' | 'watching' | 'watched';
export type EpisodeWatchSource = 'tracked' | 'imported';
export type MovieWatchSource = 'tracked' | 'imported';
export type WatchedEpisodes = Map<string, EpisodeWatchSource>;

export const STATUS_LABELS: Record<LibraryStatus, string> = {
  to_watch: 'Da vedere',
  watching: 'In corso',
  watched: 'Visto',
};

// Ordine di visualizzazione dei gruppi in libreria.
export const STATUS_ORDER: LibraryStatus[] = ['watching', 'to_watch', 'watched'];

// Stati selezionabili manualmente per i film.
export const MOVIE_STATUSES: LibraryStatus[] = [
  'to_watch',
  'watching',
  'watched',
];

export type LibraryItem = {
  id: string;
  status: LibraryStatus;
  rating: number | null;
  notes: string | null;
  addedAt: string;
  updatedAt: string;
  tmdbId: number;
  mediaType: MediaType;
  title: string;
  year: string | null;
  posterUrl: string | null;
  overview: string;
  runtime: number | null;
  genres: string[];
  totalEpisodes: number | null;
  watchedEpisodes: number;
  viewingCount: number;
  importedViewings: number;
  lastRecordedOn: string | null;
};

export type Viewing = {
  id: string;
  watchedOn: string;
  note: string | null;
  rating: number | null;
  createdAt: string;
};

export type SeriesViewing = {
  id: string;
  watchedOn: string;
  note: string | null;
  rating: number | null;
  createdAt: string;
};

type ViewingRow = {
  id: string;
  watched_on: string;
  note: string | null;
  rating: number | null;
  created_at: string;
};

type SeriesViewingRow = {
  id: string;
  watched_on: string;
  note: string | null;
  rating: number | null;
  created_at: string;
};

type LibraryRow = {
  id: string;
  status: LibraryStatus;
  rating: number | null;
  notes: string | null;
  added_at: string;
  updated_at: string;
  imported_viewings: number;
  titles: {
    tmdb_id: number;
    media_type: MediaType;
    title: string;
    year: string | null;
    poster_path: string | null;
    overview: string | null;
    runtime: number | null;
    genres: string[] | null;
    total_episodes: number | null;
  } | null;
};

function toItem(
  row: LibraryRow,
  watchedByItem: Map<string, number>,
  viewingsByItem: Map<string, number>,
  lastRecordedByItem: Map<string, string>,
): LibraryItem {
  const t = row.titles;
  const mediaType = t?.media_type ?? 'movie';
  const watchedEpisodes = watchedByItem.get(row.id) ?? 0;
  const totalEpisodes = t?.total_episodes ?? null;
  return {
    id: row.id,
    status:
      mediaType === 'tv'
        ? deriveSeriesStatus(watchedEpisodes, totalEpisodes)
        : row.status,
    rating: row.rating,
    notes: row.notes,
    addedAt: row.added_at,
    updatedAt: row.updated_at,
    tmdbId: t?.tmdb_id ?? 0,
    mediaType,
    title: t?.title ?? 'Senza titolo',
    year: t?.year ?? null,
    posterUrl: posterUrl(t?.poster_path),
    overview: t?.overview ?? '',
    runtime: t?.runtime ?? null,
    genres: t?.genres ?? [],
    totalEpisodes,
    watchedEpisodes,
    viewingCount: viewingsByItem.get(row.id) ?? 0,
    importedViewings: row.imported_viewings,
    lastRecordedOn: lastRecordedByItem.get(row.id) ?? null,
  };
}

function recordLatestDate(
  datesByItem: Map<string, string>,
  itemId: string,
  watchedOn: string,
) {
  const current = datesByItem.get(itemId);
  if (!current || watchedOn > current) {
    datesByItem.set(itemId, watchedOn);
  }
}

function toViewing(row: ViewingRow): Viewing {
  return {
    id: row.id,
    watchedOn: row.watched_on,
    note: row.note,
    rating: row.rating,
    createdAt: row.created_at,
  };
}

function toSeriesViewing(row: SeriesViewingRow): SeriesViewing {
  return {
    id: row.id,
    watchedOn: row.watched_on,
    note: row.note,
    rating: row.rating,
    createdAt: row.created_at,
  };
}

const SELECT =
  'id, status, rating, notes, added_at, updated_at, imported_viewings, titles ( tmdb_id, media_type, title, year, poster_path, overview, runtime, genres, total_episodes )';

async function getUserId(): Promise<string> {
  const { data, error } = await getSupabase().auth.getUser();
  if (error || !data.user) {
    throw new Error('Sessione non valida');
  }
  return data.user.id;
}

/** Deriva lo stato di una serie dal progresso episodi. */
export function deriveSeriesStatus(watched: number, total: number | null): LibraryStatus {
  if (watched <= 0) {
    return 'to_watch';
  }
  if (total != null && watched >= total) {
    return 'watched';
  }
  return 'watching';
}

export function getMovieWatchSource(
  item: Pick<LibraryItem, 'importedViewings' | 'viewingCount'>,
): MovieWatchSource | null {
  if (item.importedViewings === 1 && item.viewingCount === 0) {
    return 'imported';
  }
  if (item.importedViewings === 0 && item.viewingCount === 1) {
    return 'tracked';
  }
  return null;
}

export function canReclassifyMovieWatch(
  item: Pick<
    LibraryItem,
    'importedViewings' | 'mediaType' | 'status' | 'viewingCount'
  >,
): boolean {
  return (
    item.mediaType === 'movie' &&
    item.status === 'watched' &&
    getMovieWatchSource(item) !== null
  );
}

/** Salva (o aggiorna lo stato di) un titolo TMDB nella libreria dell'utente. */
export async function addToLibrary(title: Title, status: LibraryStatus): Promise<void> {
  let totalEpisodes: number | null = null;
  if (title.mediaType === 'tv') {
    try {
      totalEpisodes = (await getTvDetails(title.id)).numberOfEpisodes;
    } catch {
      totalEpisodes = null; // opzionale: si popolerà aprendo il dettaglio
    }
  }
  const { error } = await getSupabase().rpc('add_to_library', {
    p_tmdb_id: title.id,
    p_media_type: title.mediaType,
    p_title: title.title,
    p_year: title.year,
    p_poster_path: title.posterPath,
    p_overview: title.overview,
    p_status: status,
    p_total_episodes: totalEpisodes,
  });
  if (error) {
    throw new Error(error.message);
  }
  queueBadgeEvaluation([
    BADGE_IDS.cinephile,
    BADGE_IDS.archivist,
    BADGE_IDS.nostalgic,
    BADGE_IDS.genreExplorer,
  ]);
}

/** Ritorna tutti i titoli in libreria, con il conteggio episodi visti per le serie. */
export async function getLibrary(): Promise<LibraryItem[]> {
  const supabase = getSupabase();
  const [rawData, watches, viewings, episodeViewings] = await Promise.all([
    fetchAllPages<unknown>((from, to) =>
      supabase
        .from('library_items')
        .select(SELECT)
        .order('updated_at', { ascending: false })
        .order('id', { ascending: true })
        .range(from, to),
    ),
    fetchAllPages<{
      library_item_id: string;
      source: EpisodeWatchSource;
      watched_on: string;
    }>((from, to) =>
      supabase
        .from('episode_watches')
        .select('library_item_id, source, watched_on')
        .order('created_at', { ascending: true })
        .order('id', { ascending: true })
        .range(from, to),
    ),
    fetchAllPages<{ library_item_id: string; watched_on: string }>((from, to) =>
      supabase
        .from('viewings')
        .select('library_item_id, watched_on')
        .order('created_at', { ascending: true })
        .order('id', { ascending: true })
        .range(from, to),
    ),
    fetchAllPages<{ library_item_id: string; watched_on: string }>((from, to) =>
      supabase
        .from('episode_viewings')
        .select('library_item_id, watched_on')
        .order('created_at', { ascending: true })
        .order('id', { ascending: true })
        .range(from, to),
    ),
  ]);
  const data = rawData as LibraryRow[];

  const watchedByItem = new Map<string, number>();
  const lastRecordedByItem = new Map<string, string>();
  for (const row of watches) {
    watchedByItem.set(row.library_item_id, (watchedByItem.get(row.library_item_id) ?? 0) + 1);
    if (row.source === 'tracked') {
      recordLatestDate(lastRecordedByItem, row.library_item_id, row.watched_on);
    }
  }
  const viewingsByItem = new Map<string, number>();
  for (const row of viewings) {
    viewingsByItem.set(
      row.library_item_id,
      (viewingsByItem.get(row.library_item_id) ?? 0) + 1,
    );
    recordLatestDate(lastRecordedByItem, row.library_item_id, row.watched_on);
  }
  for (const row of episodeViewings) {
    recordLatestDate(lastRecordedByItem, row.library_item_id, row.watched_on);
  }

  return data.map((row) =>
    toItem(row, watchedByItem, viewingsByItem, lastRecordedByItem),
  );
}

/** Ritorna una singola voce di libreria per id. */
export async function getLibraryItem(itemId: string): Promise<LibraryItem | null> {
  const supabase = getSupabase();
  const [{ data, error }, watches, viewings, episodeViewings] = await Promise.all([
    supabase.from('library_items').select(SELECT).eq('id', itemId).maybeSingle(),
    fetchAllPages<{
      library_item_id: string;
      source: EpisodeWatchSource;
      watched_on: string;
    }>((from, to) =>
      supabase
        .from('episode_watches')
        .select('library_item_id, source, watched_on')
        .eq('library_item_id', itemId)
        .order('created_at', { ascending: true })
        .order('id', { ascending: true })
        .range(from, to),
    ),
    fetchAllPages<{ library_item_id: string; watched_on: string }>((from, to) =>
      supabase
        .from('viewings')
        .select('library_item_id, watched_on')
        .eq('library_item_id', itemId)
        .order('created_at', { ascending: true })
        .order('id', { ascending: true })
        .range(from, to),
    ),
    fetchAllPages<{ library_item_id: string; watched_on: string }>((from, to) =>
      supabase
        .from('episode_viewings')
        .select('library_item_id, watched_on')
        .eq('library_item_id', itemId)
        .order('created_at', { ascending: true })
        .order('id', { ascending: true })
        .range(from, to),
    ),
  ]);
  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    return null;
  }
  const watchedByItem = new Map<string, number>([[itemId, watches.length]]);
  const viewingsByItem = new Map<string, number>([[itemId, viewings.length]]);
  const lastRecordedByItem = new Map<string, string>();
  for (const row of watches) {
    if (row.source === 'tracked') {
      recordLatestDate(lastRecordedByItem, itemId, row.watched_on);
    }
  }
  for (const row of [...viewings, ...episodeViewings]) {
    recordLatestDate(lastRecordedByItem, itemId, row.watched_on);
  }
  return toItem(
    data as unknown as LibraryRow,
    watchedByItem,
    viewingsByItem,
    lastRecordedByItem,
  );
}

/** Cerca una voce di libreria tramite la chiave TMDB del titolo. */
export async function getLibraryItemByTmdb(
  mediaType: MediaType,
  tmdbId: number,
): Promise<LibraryItem | null> {
  const items = await getLibrary();
  return items.find((item) => item.mediaType === mediaType && item.tmdbId === tmdbId) ?? null;
}

/** Aggiorna lo stato di una voce di libreria (usato per i film). */
export async function updateStatus(
  itemId: string,
  status: LibraryStatus,
  badgeIds: readonly string[] = [
    BADGE_IDS.cinephile,
    BADGE_IDS.nostalgic,
    BADGE_IDS.genreExplorer,
  ],
): Promise<void> {
  const { error } = await getSupabase()
    .from('library_items')
    .update({ status })
    .eq('id', itemId);
  if (error) {
    throw new Error(error.message);
  }
  queueBadgeEvaluation(badgeIds);
}

/** Registra un film come visto oggi oppure come visione importata senza data. */
export async function recordMovieWatched(
  itemId: string,
  source: MovieWatchSource,
  importedViewings: number,
): Promise<void> {
  if (source === 'tracked') {
    await addViewing(itemId, localDateString(), null, null);
    return;
  }
  const { error } = await getSupabase()
    .from('library_items')
    .update({
      status: 'watched',
      imported_viewings: Math.max(importedViewings, 1),
    })
    .eq('id', itemId);
  if (error) {
    throw new Error(error.message);
  }
  queueBadgeEvaluation([
    BADGE_IDS.cinephile,
    BADGE_IDS.nostalgic,
    BADGE_IDS.genreExplorer,
  ]);
}

async function setImportedViewings(
  itemId: string,
  count: number,
  expectedCount?: number,
): Promise<void> {
  let query = getSupabase()
    .from('library_items')
    .update({ status: 'watched', imported_viewings: count })
    .eq('id', itemId);
  if (expectedCount != null) {
    query = query.eq('imported_viewings', expectedCount);
  }
  const { data, error } = await query.select('id').maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    throw new Error('La visione è cambiata. Ricarica la libreria e riprova.');
  }
}

async function deleteViewingForReclassification(viewingId: string): Promise<void> {
  const { data, error } = await getSupabase()
    .from('viewings')
    .delete()
    .eq('id', viewingId)
    .select('id')
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    throw new Error('La visione non è più disponibile. Ricarica la libreria e riprova.');
  }
}

/** Riclassifica l'unica visione di un film senza modificarne il conteggio. */
export async function reclassifyMovieWatched(
  item: LibraryItem,
  source: MovieWatchSource,
): Promise<void> {
  const currentSource = getMovieWatchSource(item);
  if (!canReclassifyMovieWatch(item) || !currentSource) {
    throw new Error(
      'Puoi modificare l’origine solo quando il film ha una singola visione.',
    );
  }
  if (currentSource === source) {
    return;
  }

  if (source === 'tracked') {
    const viewing = await addViewing(item.id, localDateString(), null, null);
    try {
      await setImportedViewings(item.id, 0, 1);
    } catch (classificationError) {
      try {
        await deleteViewingForReclassification(viewing.id);
      } catch (rollbackError) {
        throw new Error(
          `${
            classificationError instanceof Error
              ? classificationError.message
              : 'Origine non aggiornata'
          }; rollback non riuscito: ${
            rollbackError instanceof Error
              ? rollbackError.message
              : 'visione odierna non rimossa'
          }`,
        );
      }
      throw classificationError;
    }
    return;
  }

  const viewings = await getViewings(item.id);
  if (viewings.length !== 1) {
    throw new Error('Lo storico è cambiato. Ricarica la libreria e riprova.');
  }
  const [viewing] = viewings;
  if (viewing.note != null || viewing.rating != null) {
    throw new Error(
      'Questa visione contiene una nota o un voto. Rimuovili dallo storico prima di importarla.',
    );
  }

  await setImportedViewings(item.id, 1, 0);
  try {
    await deleteViewingForReclassification(viewing.id);
  } catch (classificationError) {
    try {
      await setImportedViewings(item.id, 0, 1);
    } catch (rollbackError) {
      throw new Error(
        `${
          classificationError instanceof Error
            ? classificationError.message
            : 'Visione non riclassificata'
        }; rollback non riuscito: ${
          rollbackError instanceof Error
            ? rollbackError.message
            : 'conteggio importato non ripristinato'
        }`,
      );
    }
    throw classificationError;
  }
  queueBadgeEvaluation([BADGE_IDS.firstWatch]);
}

/** Rimuove una voce dalla libreria. */
export async function removeFromLibrary(itemId: string): Promise<void> {
  const { error } = await getSupabase().from('library_items').delete().eq('id', itemId);
  if (error) {
    throw new Error(error.message);
  }
  queueBadgeEvaluation(ALL_BADGE_IDS);
}

/** Ritorna lo storico delle visioni di un film, dalla piu' recente. */
export async function getViewings(itemId: string): Promise<Viewing[]> {
  const supabase = getSupabase();
  const rows = await fetchAllPages<ViewingRow>((from, to) =>
    supabase
      .from('viewings')
      .select('id, watched_on, note, rating, created_at')
      .eq('library_item_id', itemId)
      .order('watched_on', { ascending: false })
      .order('created_at', { ascending: false })
      .order('id', { ascending: true })
      .range(from, to),
  );
  return rows.map(toViewing);
}

/** Registra una visione e marca il film come visto. */
export async function addViewing(
  itemId: string,
  watchedOn: string,
  note: string | null,
  rating: number | null,
): Promise<Viewing> {
  const { data, error } = await getSupabase().rpc(
    'record_movie_viewing',
    {
      p_library_item_id: itemId,
      p_watched_on: watchedOn,
      p_note: note,
      p_rating: rating,
    },
  );
  if (error) {
    throw new Error(error.message);
  }
  const rows = (data ?? []) as ViewingRow[];
  if (rows.length !== 1) {
    throw new Error('La visione salvata non è disponibile');
  }

  queueBadgeEvaluation([
    BADGE_IDS.cinephile,
    BADGE_IDS.nostalgic,
    BADGE_IDS.genreExplorer,
    BADGE_IDS.firstWatch,
    ...(note?.trim() ? [BADGE_IDS.firstReview] : []),
  ]);
  return toViewing(rows[0]);
}

/** Elimina una singola visione dallo storico. */
export async function removeViewing(viewingId: string): Promise<void> {
  const { error } = await getSupabase().from('viewings').delete().eq('id', viewingId);
  if (error) {
    throw new Error(error.message);
  }
  queueBadgeEvaluation([
    BADGE_IDS.firstWatch,
    BADGE_IDS.firstReview,
  ]);
}

/** Ritorna tutte le visioni di uno specifico episodio, dalla piu' recente. */
export async function getEpisodeViewings(
  itemId: string,
  season: number,
  episode: number,
): Promise<Viewing[]> {
  const supabase = getSupabase();
  const rows = await fetchAllPages<ViewingRow>((from, to) =>
    supabase
      .from('episode_viewings')
      .select('id, watched_on, note, rating, created_at')
      .eq('library_item_id', itemId)
      .eq('season_number', season)
      .eq('episode_number', episode)
      .order('watched_on', { ascending: false })
      .order('created_at', { ascending: false })
      .order('id', { ascending: true })
      .range(from, to),
  );
  return rows.map(toViewing);
}

/**
 * Registra una visione dell'episodio. Se non era ancora spuntato, aggiorna anche
 * il tracking e lo stato della serie.
 */
export async function addEpisodeViewing(
  itemId: string,
  season: number,
  episode: number,
  totalEpisodes: number | null,
  watchedOn: string,
  note: string | null,
  rating: number | null,
): Promise<Viewing> {
  const userId = await getUserId();
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('episode_viewings')
    .insert({
      library_item_id: itemId,
      user_id: userId,
      season_number: season,
      episode_number: episode,
      watched_on: watchedOn,
      note,
      rating,
    })
    .select('id, watched_on, note, rating, created_at')
    .single();
  if (error) {
    throw new Error(error.message);
  }

  let watchedRows: { season_number: number; episode_number: number }[] = [];
  try {
    watchedRows = await fetchAllPages<{
      season_number: number;
      episode_number: number;
    }>((from, to) =>
      supabase
        .from('episode_watches')
        .select('season_number, episode_number')
        .eq('library_item_id', itemId)
        .order('created_at', { ascending: true })
        .order('id', { ascending: true })
        .range(from, to),
    );
  } catch (err) {
    await rollbackEpisodeViewing(
      data.id,
      err instanceof Error ? err.message : 'Impossibile leggere il progresso',
    );
  }

  const watchedKeys = new Set(
    watchedRows.map(
      (row) => `${row.season_number}-${row.episode_number}`,
    ),
  );
  const key = `${season}-${episode}`;
  if (!watchedKeys.has(key)) {
    try {
      await setEpisodeWatched(
        itemId,
        season,
        episode,
        true,
        watchedKeys.size + 1,
        totalEpisodes,
      );
    } catch (trackingError) {
      await rollbackEpisodeViewing(
        data.id,
        trackingError instanceof Error ? trackingError.message : 'Tracking non aggiornato',
      );
    }
  }

  queueBadgeEvaluation([
    BADGE_IDS.firstWatch,
    ...(note?.trim() ? [BADGE_IDS.firstReview] : []),
  ]);
  return toViewing(data as ViewingRow);
}

async function rollbackEpisodeViewing(viewingId: string, reason: string): Promise<never> {
  const { error } = await getSupabase().from('episode_viewings').delete().eq('id', viewingId);
  if (error) {
    throw new Error(`${reason}; rollback non riuscito: ${error.message}`);
  }
  throw new Error(reason);
}

/** Elimina una singola visione senza cambiare la spunta di progresso dell'episodio. */
export async function removeEpisodeViewing(viewingId: string): Promise<void> {
  const { error } = await getSupabase().from('episode_viewings').delete().eq('id', viewingId);
  if (error) {
    throw new Error(error.message);
  }
  queueBadgeEvaluation([
    BADGE_IDS.firstWatch,
    BADGE_IDS.firstReview,
  ]);
}

type SavedLibraryRow = {
  titles: {
    tmdb_id: number;
    media_type: MediaType;
  } | null;
};

/** Insieme delle chiavi `mediaType-tmdbId` già presenti in libreria. */
export async function getSavedKeys(): Promise<Set<string>> {
  const rows = (await fetchAllPages<unknown>((from, to) =>
    getSupabase()
      .from('library_items')
      .select('titles ( tmdb_id, media_type )')
      .order('id', { ascending: true })
      .range(from, to),
  )) as SavedLibraryRow[];
  return new Set(
    rows.flatMap((row) =>
      row.titles
        ? [`${row.titles.media_type}-${row.titles.tmdb_id}`]
        : [],
    ),
  );
}

/** Storico delle visioni complete di una serie. */
export async function getSeriesViewings(
  itemId: string,
): Promise<SeriesViewing[]> {
  const supabase = getSupabase();
  const rows = await fetchAllPages<SeriesViewingRow>((from, to) =>
    supabase
      .from('series_viewings')
      .select('id, watched_on, note, rating, created_at')
      .eq('library_item_id', itemId)
      .order('watched_on', { ascending: false })
      .order('created_at', { ascending: false })
      .order('id', { ascending: true })
      .range(from, to),
  );
  return rows.map(toSeriesViewing);
}

export async function addSeriesViewing(
  itemId: string,
  watchedOn: string,
  note: string | null,
  rating: number | null,
): Promise<SeriesViewing> {
  const trimmedNote = note?.trim() || null;
  if (trimmedNote == null && rating == null) {
    throw new Error('Inserisci una nota o un voto');
  }
  if (trimmedNote && trimmedNote.length > 1000) {
    throw new Error('La nota può contenere al massimo 1000 caratteri');
  }
  if (rating != null && (!Number.isFinite(rating) || rating < 0 || rating > 10)) {
    throw new Error('Il voto deve essere compreso tra 0 e 10');
  }
  const userId = await getUserId();
  const { data, error } = await getSupabase()
    .from('series_viewings')
    .insert({
      library_item_id: itemId,
      user_id: userId,
      watched_on: watchedOn,
      note: trimmedNote,
      rating,
    })
    .select('id, watched_on, note, rating, created_at')
    .single();
  if (error) {
    throw new Error(error.message);
  }
  queueBadgeEvaluation([
    BADGE_IDS.firstWatch,
    ...(trimmedNote ? [BADGE_IDS.firstReview] : []),
  ]);
  return toSeriesViewing(data as SeriesViewingRow);
}

export async function removeSeriesViewing(viewingId: string): Promise<void> {
  const { error } = await getSupabase()
    .from('series_viewings')
    .delete()
    .eq('id', viewingId);
  if (error) {
    throw new Error(error.message);
  }
  queueBadgeEvaluation([
    BADGE_IDS.firstWatch,
    BADGE_IDS.firstReview,
  ]);
}

// ---------------------------------------------------------------------------
// Tracking episodi (serie TV)
// ---------------------------------------------------------------------------

const episodeKey = (season: number, episode: number) => `${season}-${episode}`;

function localDateString(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Chiavi `season-episode` e origine degli episodi visti per una serie. */
export async function getWatchedEpisodes(itemId: string): Promise<WatchedEpisodes> {
  const supabase = getSupabase();
  const rows = await fetchAllPages<{
    season_number: number;
    episode_number: number;
    source: EpisodeWatchSource;
  }>((from, to) =>
    supabase
      .from('episode_watches')
      .select('season_number, episode_number, source')
      .eq('library_item_id', itemId)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .range(from, to),
  );
  return new Map(
    rows.map((row) => [
      episodeKey(row.season_number, row.episode_number),
      row.source,
    ]),
  );
}

/**
 * Segna/desegna un episodio come visto, poi ricalcola e salva lo stato della serie.
 * `watchedCount` è il numero di episodi visti dopo questa modifica (noto lato client).
 */
export async function setEpisodeWatched(
  itemId: string,
  season: number,
  episode: number,
  watched: boolean,
  watchedCount: number,
  totalEpisodes: number | null,
  source: EpisodeWatchSource = 'tracked',
): Promise<LibraryStatus> {
  const supabase = getSupabase();

  if (watched) {
    const userId = await getUserId();
    const { error } = await supabase.from('episode_watches').upsert(
      {
        library_item_id: itemId,
        user_id: userId,
        season_number: season,
        episode_number: episode,
        source,
        watched_on: localDateString(),
      },
      { onConflict: 'library_item_id,season_number,episode_number' },
    );
    if (error) {
      throw new Error(error.message);
    }
  } else {
    const { error } = await supabase
      .from('episode_watches')
      .delete()
      .eq('library_item_id', itemId)
      .eq('season_number', season)
      .eq('episode_number', episode);
    if (error) {
      throw new Error(error.message);
    }
  }

  const status = deriveSeriesStatus(watchedCount, totalEpisodes);
  await updateStatus(itemId, status, [
    BADGE_IDS.seasonComplete,
    BADGE_IDS.nostalgic,
    BADGE_IDS.serialist,
    BADGE_IDS.genreExplorer,
  ]);
  queueBadgeEvaluation([
    BADGE_IDS.firstWatch,
    BADGE_IDS.oneMoreEpisode,
    BADGE_IDS.marathon,
  ]);
  return status;
}

/**
 * Segna/azzera in blocco tutti gli episodi di una stagione, poi ricalcola lo stato.
 * `watchedCount` è il numero di episodi visti dopo questa modifica (noto lato client).
 */
export async function setSeasonWatched(
  itemId: string,
  season: number,
  episodeNumbers: number[],
  watched: boolean,
  watchedCount: number,
  totalEpisodes: number | null,
  source: EpisodeWatchSource = 'tracked',
): Promise<LibraryStatus> {
  const supabase = getSupabase();

  if (watched) {
    const userId = await getUserId();
    const rows = episodeNumbers.map((episode) => ({
      library_item_id: itemId,
      user_id: userId,
      season_number: season,
      episode_number: episode,
      source,
      watched_on: localDateString(),
    }));
    const { error } = await supabase
      .from('episode_watches')
      .upsert(rows, { onConflict: 'library_item_id,season_number,episode_number' });
    if (error) {
      throw new Error(error.message);
    }
  } else {
    const { error } = await supabase
      .from('episode_watches')
      .delete()
      .eq('library_item_id', itemId)
      .eq('season_number', season);
    if (error) {
      throw new Error(error.message);
    }
  }

  const status = deriveSeriesStatus(watchedCount, totalEpisodes);
  await updateStatus(itemId, status, [
    BADGE_IDS.seasonComplete,
    BADGE_IDS.nostalgic,
    BADGE_IDS.serialist,
    BADGE_IDS.genreExplorer,
  ]);
  queueBadgeEvaluation([
    BADGE_IDS.firstWatch,
    BADGE_IDS.oneMoreEpisode,
    BADGE_IDS.marathon,
  ]);
  return status;
}

/**
 * Converte episodi già spuntati tra attività registrata e storico importato.
 * Se `season` è null, converte l'intera serie.
 */
export async function setWatchedEpisodesSource(
  itemId: string,
  season: number | null,
  source: EpisodeWatchSource,
): Promise<void> {
  const values =
    source === 'tracked'
      ? { source, watched_on: localDateString() }
      : { source };
  let query = getSupabase()
    .from('episode_watches')
    .update(values)
    .eq('library_item_id', itemId);
  if (season != null) {
    query = query.eq('season_number', season);
  }
  const { error } = await query;
  if (error) {
    throw new Error(error.message);
  }
  queueBadgeEvaluation([
    BADGE_IDS.firstWatch,
    BADGE_IDS.oneMoreEpisode,
    BADGE_IDS.marathon,
  ]);
}
