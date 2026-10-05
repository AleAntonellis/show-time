import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getCompletedCatalogTotals,
  getCompletedRuntimeMinutes,
} from '../../src/services/statistics-calculations';

test('i totali catalogo includono soltanto i titoli completati', () => {
  const totals = getCompletedCatalogTotals([
    {
      id: 'movie-watched',
      status: 'watched',
      mediaType: 'movie',
      runtime: 100,
      importedViewings: 0,
    },
    {
      id: 'movie-watchlist',
      status: 'to_watch',
      mediaType: 'movie',
      runtime: 90,
      importedViewings: 0,
    },
    {
      id: 'series-watched',
      status: 'watched',
      mediaType: 'tv',
      runtime: 45,
      importedViewings: 0,
    },
    {
      id: 'series-watching',
      status: 'watching',
      mediaType: 'tv',
      runtime: 50,
      importedViewings: 0,
    },
  ]);

  assert.deepEqual(totals, {
    totalTitles: 2,
    movies: 1,
    series: 1,
  });
});

test('il tempo film esclude i non completati e moltiplica i rewatch', () => {
  const minutes = getCompletedRuntimeMinutes({
    items: [
      {
        id: 'movie-rewatched',
        status: 'watched',
        mediaType: 'movie',
        runtime: 100,
        importedViewings: 1,
      },
      {
        id: 'movie-fallback',
        status: 'watched',
        mediaType: 'movie',
        runtime: 80,
        importedViewings: 0,
      },
      {
        id: 'movie-watchlist',
        status: 'to_watch',
        mediaType: 'movie',
        runtime: 90,
        importedViewings: 0,
      },
    ],
    movieViewings: [
      { library_item_id: 'movie-rewatched' },
      { library_item_id: 'movie-rewatched' },
      { library_item_id: 'movie-watchlist' },
    ],
    episodeWatches: [],
    episodeViewings: [],
  });

  assert.equal(minutes, 380);
});

test('il tempo episodi usa solo i completati e conta import e rewatch', () => {
  const minutes = getCompletedRuntimeMinutes({
    items: [
      {
        id: 'series',
        status: 'watching',
        mediaType: 'tv',
        runtime: 45,
        importedViewings: 0,
      },
    ],
    movieViewings: [],
    episodeWatches: [
      {
        library_item_id: 'series',
        season_number: 1,
        episode_number: 1,
        source: 'imported',
      },
      {
        library_item_id: 'series',
        season_number: 1,
        episode_number: 2,
        source: 'tracked',
      },
      {
        library_item_id: 'series',
        season_number: 1,
        episode_number: 3,
        source: 'tracked',
      },
    ],
    episodeViewings: [
      {
        library_item_id: 'series',
        season_number: 1,
        episode_number: 1,
      },
      {
        library_item_id: 'series',
        season_number: 1,
        episode_number: 2,
      },
      {
        library_item_id: 'series',
        season_number: 1,
        episode_number: 2,
      },
      {
        library_item_id: 'series',
        season_number: 1,
        episode_number: 4,
      },
    ],
  });

  assert.equal(minutes, 225);
});
