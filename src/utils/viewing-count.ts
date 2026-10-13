import type {
  EpisodeWatchSource,
  LibraryStatus,
} from '@/services/library';

export function getMovieViewingCount({
  status,
  importedViewings,
  recordedViewings,
}: {
  status: LibraryStatus;
  importedViewings: number;
  recordedViewings: number;
}): number {
  return Math.max(
    importedViewings + recordedViewings,
    status === 'watched' ? 1 : 0,
  );
}

export function getSeriesViewingCount({
  completed,
  recordedCompleteViewings,
}: {
  completed: boolean;
  recordedCompleteViewings: number;
}): number {
  return recordedCompleteViewings + (completed ? 1 : 0);
}

export function getEpisodeViewingCount({
  source,
  recordedViewings,
}: {
  source: EpisodeWatchSource;
  recordedViewings: number;
}): number {
  return source === 'imported'
    ? recordedViewings + 1
    : Math.max(recordedViewings, 1);
}
