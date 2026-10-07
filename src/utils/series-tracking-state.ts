export const SERIES_TRACKING_STATES = [
  'active',
  'abandoned',
] as const;

export type SeriesTrackingState =
  (typeof SERIES_TRACKING_STATES)[number];

export type BaseLibraryStatus = 'to_watch' | 'watching' | 'watched';

export type LibraryDisplayStatus =
  | BaseLibraryStatus
  | 'abandoned';

type SeriesStateItem = {
  mediaType: 'movie' | 'tv';
  status: BaseLibraryStatus;
  seriesTrackingState: SeriesTrackingState;
};

export function getLibraryDisplayStatus(
  item: SeriesStateItem,
): LibraryDisplayStatus {
  if (
    item.mediaType === 'tv' &&
    item.status === 'watching' &&
    item.seriesTrackingState !== 'active'
  ) {
    return item.seriesTrackingState;
  }
  return item.status;
}

export function canChangeSeriesTrackingState(
  item: SeriesStateItem,
): boolean {
  return item.mediaType === 'tv' && item.status === 'watching';
}

export function isContinueWatchingEligible(
  item: SeriesStateItem,
): boolean {
  return (
    item.status === 'watching' &&
    (item.mediaType === 'movie' ||
      item.seriesTrackingState === 'active')
  );
}

export function isReminderEligible(
  item: Pick<
    SeriesStateItem,
    'mediaType' | 'seriesTrackingState'
  >,
): boolean {
  return !(
    item.mediaType === 'tv' &&
    item.seriesTrackingState === 'abandoned'
  );
}
