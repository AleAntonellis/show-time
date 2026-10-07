import assert from 'node:assert/strict';
import test from 'node:test';

import {
  formatDurationMinutes,
  formatExactHours,
} from '../../src/utils/duration';

test('la durata omette le unità vuote e gestisce i singolari', () => {
  assert.equal(formatDurationMinutes(0), '0h');
  assert.equal(formatDurationMinutes(30), '1h');
  assert.equal(formatDurationMinutes(24 * 60), '1d');
  assert.equal(formatDurationMinutes(30 * 24 * 60), '1M');
  assert.equal(formatDurationMinutes(365 * 24 * 60), '1y');
});

test('la durata combina anni mesi giorni e ore', () => {
  const minutes =
    (365 * 24 + 30 * 24 + 5 * 24 + 6) * 60;

  assert.equal(
    formatDurationMinutes(minutes),
    '1y 1M 5d 6h',
  );
});

test('la durata arrotonda all’ora e mantiene il totale preciso', () => {
  assert.equal(formatDurationMinutes(10), '<1h');
  assert.equal(formatDurationMinutes(89), '1h');
  assert.equal(formatDurationMinutes(90), '2h');
  assert.equal(formatExactHours(90), '1,5 h totali');
});
