import assert from 'node:assert/strict';
import test from 'node:test';

import {
  canChangeSeriesTrackingState,
  getLibraryDisplayStatus,
  isContinueWatchingEligible,
  isReminderEligible,
} from '../../src/utils/series-tracking-state';

const activeSeries = {
  mediaType: 'tv' as const,
  status: 'watching' as const,
  seriesTrackingState: 'active' as const,
};

test('Abbandonata sostituisce solo lo stato In corso TV', () => {
  assert.equal(
    getLibraryDisplayStatus({
      ...activeSeries,
      seriesTrackingState: 'abandoned',
    }),
    'abandoned',
  );
  assert.equal(
    getLibraryDisplayStatus({
      ...activeSeries,
      status: 'watched',
      seriesTrackingState: 'abandoned',
    }),
    'watched',
  );
});

test('solo una serie TV in corso può cambiare stato manuale', () => {
  assert.equal(canChangeSeriesTrackingState(activeSeries), true);
  assert.equal(
    canChangeSeriesTrackingState({
      ...activeSeries,
      status: 'to_watch',
    }),
    false,
  );
  assert.equal(
    canChangeSeriesTrackingState({
      mediaType: 'movie',
      status: 'watching',
      seriesTrackingState: 'active',
    }),
    false,
  );
});

test('Abbandonata non entra in Continua a guardare', () => {
  assert.equal(isContinueWatchingEligible(activeSeries), true);
  assert.equal(
    isContinueWatchingEligible({
      ...activeSeries,
      seriesTrackingState: 'abandoned',
    }),
    false,
  );
  assert.equal(
    isContinueWatchingEligible({
      mediaType: 'movie',
      status: 'watching',
      seriesTrackingState: 'active',
    }),
    true,
  );
});

test('le serie Abbandonate sono escluse dai Reminder', () => {
  assert.equal(isReminderEligible(activeSeries), true);
  assert.equal(
    isReminderEligible({
      ...activeSeries,
      seriesTrackingState: 'abandoned',
    }),
    false,
  );
});
