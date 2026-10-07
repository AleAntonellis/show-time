import assert from 'node:assert/strict';
import test from 'node:test';

import {
  sortLibraryGroup,
  sortLibraryItems,
} from '../../src/utils/library-sort';

type SortItem = Parameters<typeof sortLibraryItems>[0][number];

function item(
  overrides: Partial<SortItem> & Pick<SortItem, 'id' | 'status'>,
): SortItem {
  return {
    title: overrides.id,
    mediaType: 'tv',
    addedAt: '2026-01-01T10:00:00Z',
    updatedAt: '2026-01-01T10:00:00Z',
    latestEpisodeActivityAt: null,
    latestTrackedActivityAt: null,
    latestImportAt: null,
    ...overrides,
  };
}

test('In corso ordina per ultima modifica episodio decrescente', () => {
  const sorted = sortLibraryItems([
    item({
      id: 'older-series',
      status: 'watching',
      latestEpisodeActivityAt: '2026-10-01T10:00:00Z',
    }),
    item({
      id: 'newer-series',
      status: 'watching',
      latestEpisodeActivityAt: '2026-10-03T10:00:00Z',
    }),
    item({
      id: 'middle-series',
      status: 'watching',
      latestEpisodeActivityAt: '2026-10-02T10:00:00Z',
    }),
  ]);

  assert.deepEqual(
    sorted.map((entry) => entry.id),
    ['newer-series', 'middle-series', 'older-series'],
  );
});

test('Da vedere ordina per aggiunta in Libreria decrescente', () => {
  const sorted = sortLibraryItems([
    item({
      id: 'older',
      status: 'to_watch',
      addedAt: '2026-09-01T10:00:00Z',
    }),
    item({
      id: 'newer',
      status: 'to_watch',
      addedAt: '2026-10-01T10:00:00Z',
    }),
  ]);

  assert.deepEqual(
    sorted.map((entry) => entry.id),
    ['newer', 'older'],
  );
});

test('Visti privilegia attività ShowTime e poi ordina gli importati', () => {
  const sorted = sortLibraryItems([
    item({
      id: 'newest-import',
      status: 'watched',
      latestImportAt: '2026-10-06T10:00:00Z',
    }),
    item({
      id: 'older-tracked',
      status: 'watched',
      latestTrackedActivityAt: '2026-09-01T10:00:00Z',
    }),
    item({
      id: 'newer-tracked',
      status: 'watched',
      latestTrackedActivityAt: '2026-10-01T10:00:00Z',
    }),
    item({
      id: 'older-import',
      status: 'watched',
      latestImportAt: '2026-08-01T10:00:00Z',
    }),
  ]);

  assert.deepEqual(
    sorted.map((entry) => entry.id),
    [
      'newer-tracked',
      'older-tracked',
      'newest-import',
      'older-import',
    ],
  );
});

test('l’ordine generale mantiene i gruppi In corso, Da vedere e Visti', () => {
  const sorted = sortLibraryItems([
    item({ id: 'watched', status: 'watched' }),
    item({ id: 'watchlist', status: 'to_watch' }),
    item({ id: 'watching', status: 'watching' }),
  ]);

  assert.deepEqual(
    sorted.map((entry) => entry.id),
    ['watching', 'watchlist', 'watched'],
  );
});

test('ogni gruppo può passare all’ordinamento alfabetico italiano', () => {
  const defaultOrder = [
    item({
      id: 'zeta',
      status: 'watched',
      title: 'Zeta',
    }),
    item({
      id: 'alien',
      status: 'watched',
      title: 'Álien',
    }),
    item({
      id: 'avatar-10',
      status: 'watched',
      title: 'Avatar 10',
    }),
    item({
      id: 'avatar-2',
      status: 'watched',
      title: 'Avatar 2',
    }),
  ];

  assert.deepEqual(
    sortLibraryGroup(defaultOrder, 'alphabetical').map(
      (entry) => entry.id,
    ),
    ['alien', 'avatar-2', 'avatar-10', 'zeta'],
  );
  assert.deepEqual(
    sortLibraryGroup(defaultOrder, 'default').map(
      (entry) => entry.id,
    ),
    ['zeta', 'alien', 'avatar-10', 'avatar-2'],
  );
});
