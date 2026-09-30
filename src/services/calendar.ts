import { getLibrary, type LibraryItem } from '@/services/library';
import {
  getCachedSeasonEpisodes,
  getCachedTitleDetails,
} from '@/services/tmdb-cache';
import type { DetailSeason, TitleDetails } from '@/services/tmdb';

export type CalendarEventKind = 'episode' | 'season_premiere';

export type CalendarEvent = {
  id: string;
  kind: CalendarEventKind;
  libraryItemId: string;
  tmdbId: number;
  title: string;
  posterUrl: string | null;
  date: string;
  seasonNumber: number;
  episodeNumber: number | null;
  headline: string;
  description: string;
};

export type CalendarMonth = {
  year: number;
  month: number;
  events: CalendarEvent[];
  failures: string[];
  checkedAt: string;
};

const MAX_CONCURRENCY = 4;

function dateString(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function monthBounds(year: number, month: number): { start: string; end: string } {
  const lastDay = new Date(year, month, 0).getDate();
  return {
    start: dateString(year, month, 1),
    end: dateString(year, month, lastDay),
  };
}

function todayString(now: Date): string {
  return dateString(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

function isInRange(date: string, start: string, end: string): boolean {
  return date >= start && date <= end;
}

function seasonPoster(
  details: TitleDetails,
  seasonNumber: number,
): string | null {
  return (
    details.seasons.find((season) => season.seasonNumber === seasonNumber)?.posterUrl ??
    details.posterUrl
  );
}

function seasonNumbersToLoad(
  details: TitleDetails,
  today: string,
  monthEnd: string,
): number[] {
  const numbers = new Set<number>();
  if (details.nextEpisode) {
    numbers.add(details.nextEpisode.seasonNumber);
  }
  for (const season of details.seasons) {
    if (season.airDate && season.airDate >= today && season.airDate <= monthEnd) {
      numbers.add(season.seasonNumber);
    }
  }
  return Array.from(numbers).sort((a, b) => a - b);
}

function seasonPremiereFallback(
  item: LibraryItem,
  details: TitleDetails,
  season: DetailSeason,
  rangeStart: string,
  monthEnd: string,
  events: CalendarEvent[],
): CalendarEvent | null {
  if (
    !season.airDate ||
    !isInRange(season.airDate, rangeStart, monthEnd) ||
    events.some(
      (event) =>
        event.seasonNumber === season.seasonNumber && event.date === season.airDate,
    )
  ) {
    return null;
  }
  return {
    id: `season-${item.id}-${season.seasonNumber}-${season.airDate}`,
    kind: 'season_premiere',
    libraryItemId: item.id,
    tmdbId: item.tmdbId,
    title: item.title,
    posterUrl: season.posterUrl ?? item.posterUrl ?? details.posterUrl,
    date: season.airDate,
    seasonNumber: season.seasonNumber,
    episodeNumber: null,
    headline: `Stagione ${season.seasonNumber}`,
    description: `Première · ${season.episodeCount} episodi`,
  };
}

async function eventsForSeries(
  item: LibraryItem,
  year: number,
  month: number,
  forceRefresh: boolean,
  now: Date,
): Promise<{ events: CalendarEvent[]; failures: string[] }> {
  const details = await getCachedTitleDetails('tv', item.tmdbId, forceRefresh);
  const { start, end } = monthBounds(year, month);
  const today = todayString(now);
  const rangeStart = start > today ? start : today;
  const events: CalendarEvent[] = [];
  const failures: string[] = [];
  const seasonNumbers = seasonNumbersToLoad(details, today, end);

  for (const seasonNumber of seasonNumbers) {
    try {
      const episodes = await getCachedSeasonEpisodes(
        item.tmdbId,
        seasonNumber,
        forceRefresh,
      );
      for (const episode of episodes) {
        if (!episode.airDate || !isInRange(episode.airDate, rangeStart, end)) {
          continue;
        }
        events.push({
          id: `episode-${item.id}-${seasonNumber}-${episode.episodeNumber}-${episode.airDate}`,
          kind: 'episode',
          libraryItemId: item.id,
          tmdbId: item.tmdbId,
          title: item.title,
          posterUrl:
            seasonPoster(details, seasonNumber) ?? item.posterUrl ?? details.posterUrl,
          date: episode.airDate,
          seasonNumber,
          episodeNumber: episode.episodeNumber,
          headline: `S${seasonNumber} E${episode.episodeNumber}`,
          description: episode.name,
        });
      }
    } catch (err) {
      failures.push(
        `${item.title}, stagione ${seasonNumber}: ${
          err instanceof Error ? err.message : 'impossibile caricare gli episodi'
        }`,
      );
    }
  }

  const nextEpisode = details.nextEpisode;
  const nextEpisodeAirDate = nextEpisode?.airDate;
  if (
    nextEpisode &&
    nextEpisodeAirDate &&
    isInRange(nextEpisodeAirDate, rangeStart, end) &&
    !events.some(
      (event) =>
        event.seasonNumber === nextEpisode.seasonNumber &&
        event.episodeNumber === nextEpisode.episodeNumber,
    )
  ) {
    events.push({
      id: `episode-${item.id}-${nextEpisode.seasonNumber}-${nextEpisode.episodeNumber}-${nextEpisodeAirDate}`,
      kind: 'episode',
      libraryItemId: item.id,
      tmdbId: item.tmdbId,
      title: item.title,
      posterUrl:
        seasonPoster(details, nextEpisode.seasonNumber) ??
        item.posterUrl ??
        details.posterUrl,
      date: nextEpisodeAirDate,
      seasonNumber: nextEpisode.seasonNumber,
      episodeNumber: nextEpisode.episodeNumber,
      headline: `S${nextEpisode.seasonNumber} E${nextEpisode.episodeNumber}`,
      description: nextEpisode.name,
    });
  }

  for (const season of details.seasons) {
    const fallback = seasonPremiereFallback(
      item,
      details,
      season,
      rangeStart,
      end,
      events,
    );
    if (fallback) {
      events.push(fallback);
    }
  }

  return { events, failures };
}

export async function getCalendarMonth({
  year,
  month,
  forceRefresh = false,
  now = new Date(),
}: {
  year: number;
  month: number;
  forceRefresh?: boolean;
  now?: Date;
}): Promise<CalendarMonth> {
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error('Mese del calendario non valido');
  }

  const series = (await getLibrary()).filter((item) => item.mediaType === 'tv');
  const events: CalendarEvent[] = [];
  const failures: string[] = [];
  let cursor = 0;

  async function worker() {
    while (cursor < series.length) {
      const item = series[cursor];
      cursor += 1;
      try {
        const result = await eventsForSeries(
          item,
          year,
          month,
          forceRefresh,
          now,
        );
        events.push(...result.events);
        failures.push(...result.failures);
      } catch (err) {
        failures.push(
          `${item.title}: ${
            err instanceof Error ? err.message : 'impossibile controllare TMDB'
          }`,
        );
      }
    }
  }

  const workerCount = Math.min(MAX_CONCURRENCY, Math.max(series.length, 1));
  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  events.sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      a.title.localeCompare(b.title) ||
      (a.episodeNumber ?? 0) - (b.episodeNumber ?? 0),
  );

  return {
    year,
    month,
    events,
    failures,
    checkedAt: new Date().toISOString(),
  };
}
