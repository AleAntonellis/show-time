import { getLibrary, type LibraryItem } from '@/services/library';
import {
  daysUntilDate,
  isReminderWindowDay,
} from '@/services/reminder-window';
import { getCachedTitleDetails } from '@/services/tmdb-cache';
import {
  type MediaType,
  type TitleDetails,
} from '@/services/tmdb';
import { isReminderEligible } from '@/utils/series-tracking-state';

export type ReminderKind =
  | 'movie_release'
  | 'series_premiere'
  | 'season_premiere'
  | 'episode_release';

export type UpcomingReminder = {
  id: string;
  kind: ReminderKind;
  libraryItemId: string;
  tmdbId: number;
  mediaType: MediaType;
  title: string;
  posterUrl: string | null;
  date: string;
  daysUntil: number;
  headline: string;
  description: string;
};

export type ReminderCenter = {
  reminders: UpcomingReminder[];
  failures: string[];
  checkedAt: string;
  windowDays: number;
};

const MAX_CONCURRENCY = 4;

function movieReminder(
  item: LibraryItem,
  details: TitleDetails,
  now: Date,
  windowDays: number,
): UpcomingReminder | null {
  if (!details.releaseDate) {
    return null;
  }
  const daysUntil = daysUntilDate(details.releaseDate, now);
  if (!isReminderWindowDay(daysUntil, windowDays)) {
    return null;
  }
  return {
    id: `movie-${item.id}-${details.releaseDate}`,
    kind: 'movie_release',
    libraryItemId: item.id,
    tmdbId: item.tmdbId,
    mediaType: item.mediaType,
    title: item.title,
    posterUrl: item.posterUrl ?? details.posterUrl,
    date: details.releaseDate,
    daysUntil,
    headline: 'Uscita del film',
    description: 'Il film salvato nella tua libreria è in uscita.',
  };
}

function tvReminder(
  item: LibraryItem,
  details: TitleDetails,
  now: Date,
  windowDays: number,
): UpcomingReminder | null {
  const candidates: UpcomingReminder[] = [];

  for (const season of details.seasons) {
    if (!season.airDate) {
      continue;
    }
    const daysUntil = daysUntilDate(season.airDate, now);
    if (!isReminderWindowDay(daysUntil, windowDays)) {
      continue;
    }
    const isSeriesPremiere = season.seasonNumber === 1;
    candidates.push({
      id: `season-${item.id}-${season.seasonNumber}-${season.airDate}`,
      kind: isSeriesPremiere ? 'series_premiere' : 'season_premiere',
      libraryItemId: item.id,
      tmdbId: item.tmdbId,
      mediaType: item.mediaType,
      title: item.title,
      posterUrl: season.posterUrl ?? item.posterUrl ?? details.posterUrl,
      date: season.airDate,
      daysUntil,
      headline: isSeriesPremiere ? 'Debutto della serie' : 'Nuova stagione',
      description: `${season.name} · ${season.episodeCount} episodi`,
    });
  }

  const nextEpisodeAirDate = details.nextEpisode?.airDate;
  if (details.nextEpisode && nextEpisodeAirDate) {
    const daysUntil = daysUntilDate(nextEpisodeAirDate, now);
    if (isReminderWindowDay(daysUntil, windowDays)) {
      const episode = details.nextEpisode;
      const matchingPremiere = candidates.some(
        (candidate) =>
          candidate.date === nextEpisodeAirDate &&
          candidate.kind !== 'episode_release' &&
          episode.episodeNumber === 1,
      );
      if (!matchingPremiere) {
        candidates.push({
          id: `episode-${item.id}-${episode.seasonNumber}-${episode.episodeNumber}-${nextEpisodeAirDate}`,
          kind: 'episode_release',
          libraryItemId: item.id,
          tmdbId: item.tmdbId,
          mediaType: item.mediaType,
          title: item.title,
          posterUrl: item.posterUrl ?? details.posterUrl,
          date: nextEpisodeAirDate,
          daysUntil,
          headline: episode.episodeNumber === 1 ? 'Nuova stagione' : 'Nuovo episodio',
          description: `S${episode.seasonNumber} E${episode.episodeNumber} · ${episode.name}`,
        });
      }
    }
  }

  return candidates.sort(
    (a, b) => a.daysUntil - b.daysUntil || a.date.localeCompare(b.date),
  )[0] ?? null;
}

export async function getReminderCenter({
  windowDays = 10,
  forceRefresh = false,
  now = new Date(),
}: {
  windowDays?: number;
  forceRefresh?: boolean;
  now?: Date;
} = {}): Promise<ReminderCenter> {
  if (!Number.isInteger(windowDays) || windowDays < 0) {
    throw new Error('La finestra dei reminder deve essere un numero intero positivo');
  }

  const items = (await getLibrary()).filter(isReminderEligible);
  const reminders: UpcomingReminder[] = [];
  const failures: string[] = [];
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const item = items[cursor];
      cursor += 1;
      try {
        const details = await getCachedTitleDetails(
          item.mediaType,
          item.tmdbId,
          forceRefresh,
        );
        const reminder =
          item.mediaType === 'movie'
            ? movieReminder(item, details, now, windowDays)
            : tvReminder(item, details, now, windowDays);
        if (reminder) {
          reminders.push(reminder);
        }
      } catch (err) {
        failures.push(
          `${item.title}: ${
            err instanceof Error ? err.message : 'impossibile controllare TMDB'
          }`,
        );
      }
    }
  }

  const workerCount = Math.min(MAX_CONCURRENCY, Math.max(items.length, 1));
  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  reminders.sort(
    (a, b) =>
      a.daysUntil - b.daysUntil ||
      a.date.localeCompare(b.date) ||
      a.title.localeCompare(b.title),
  );

  return {
    reminders,
    failures,
    checkedAt: new Date().toISOString(),
    windowDays,
  };
}
