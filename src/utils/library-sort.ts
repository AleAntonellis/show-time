type SortableLibraryItem = {
  id: string;
  title: string;
  status: 'to_watch' | 'watching' | 'watched';
  mediaType: 'movie' | 'tv';
  addedAt: string;
  updatedAt: string;
  latestEpisodeActivityAt: string | null;
  latestTrackedActivityAt: string | null;
  latestImportAt: string | null;
};

export type LibraryGroupSortMode = 'default' | 'alphabetical';

const STATUS_RANK: Record<SortableLibraryItem['status'], number> = {
  watching: 0,
  to_watch: 1,
  watched: 2,
};

function descending(first: string, second: string): number {
  return second.localeCompare(first);
}

function fallbackComparison(
  first: SortableLibraryItem,
  second: SortableLibraryItem,
): number {
  return (
    descending(first.addedAt, second.addedAt) ||
    first.title.localeCompare(second.title, 'it') ||
    first.id.localeCompare(second.id)
  );
}

function compareWatching(
  first: SortableLibraryItem,
  second: SortableLibraryItem,
): number {
  const firstActivity =
    first.latestEpisodeActivityAt ??
    (first.mediaType === 'movie' ? first.updatedAt : first.addedAt);
  const secondActivity =
    second.latestEpisodeActivityAt ??
    (second.mediaType === 'movie'
      ? second.updatedAt
      : second.addedAt);
  return (
    descending(firstActivity, secondActivity) ||
    fallbackComparison(first, second)
  );
}

function compareWatched(
  first: SortableLibraryItem,
  second: SortableLibraryItem,
): number {
  const firstHasTrackedActivity =
    first.latestTrackedActivityAt != null;
  const secondHasTrackedActivity =
    second.latestTrackedActivityAt != null;
  if (firstHasTrackedActivity !== secondHasTrackedActivity) {
    return firstHasTrackedActivity ? -1 : 1;
  }

  if (
    first.latestTrackedActivityAt &&
    second.latestTrackedActivityAt
  ) {
    return (
      descending(
        first.latestTrackedActivityAt,
        second.latestTrackedActivityAt,
      ) || fallbackComparison(first, second)
    );
  }

  return (
    descending(
      first.latestImportAt ?? first.addedAt,
      second.latestImportAt ?? second.addedAt,
    ) || fallbackComparison(first, second)
  );
}

export function sortLibraryItems<
  Item extends SortableLibraryItem,
>(items: readonly Item[]): Item[] {
  return [...items].sort((first, second) => {
    const statusDifference =
      STATUS_RANK[first.status] - STATUS_RANK[second.status];
    if (statusDifference !== 0) {
      return statusDifference;
    }
    if (first.status === 'watching') {
      return compareWatching(first, second);
    }
    if (first.status === 'to_watch') {
      return (
        descending(first.addedAt, second.addedAt) ||
        fallbackComparison(first, second)
      );
    }
    return compareWatched(first, second);
  });
}

export function sortLibraryGroup<
  Item extends SortableLibraryItem,
>(
  items: readonly Item[],
  mode: LibraryGroupSortMode,
): Item[] {
  if (mode === 'default') {
    return [...items];
  }
  return [...items].sort(
    (first, second) =>
      first.title.localeCompare(second.title, 'it', {
        numeric: true,
        sensitivity: 'base',
      }) || first.id.localeCompare(second.id),
  );
}
