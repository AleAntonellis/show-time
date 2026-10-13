import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getEpisodeViewingCount,
  getMovieViewingCount,
  getSeriesViewingCount,
} from '../../src/utils/viewing-count';

test('film somma importazioni e visioni registrate', () => {
  assert.equal(
    getMovieViewingCount({
      status: 'watched',
      importedViewings: 1,
      recordedViewings: 2,
    }),
    3,
  );
  assert.equal(
    getMovieViewingCount({
      status: 'watched',
      importedViewings: 0,
      recordedViewings: 0,
    }),
    1,
  );
});

test('serie somma il completamento iniziale e le visioni complete successive', () => {
  assert.equal(
    getSeriesViewingCount({
      completed: true,
      recordedCompleteViewings: 2,
    }),
    3,
  );
  assert.equal(
    getSeriesViewingCount({
      completed: false,
      recordedCompleteViewings: 2,
    }),
    2,
  );
});

test('episodi non duplicano la prima visione tracked', () => {
  assert.equal(
    getEpisodeViewingCount({
      source: 'tracked',
      recordedViewings: 1,
    }),
    1,
  );
  assert.equal(
    getEpisodeViewingCount({
      source: 'tracked',
      recordedViewings: 2,
    }),
    2,
  );
  assert.equal(
    getEpisodeViewingCount({
      source: 'imported',
      recordedViewings: 2,
    }),
    3,
  );
});
