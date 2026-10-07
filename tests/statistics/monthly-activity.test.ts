import assert from 'node:assert/strict';
import test from 'node:test';

import {
  formatMonthKey,
  getActivitiesForMonth,
} from '../../src/utils/monthly-activity';

test('il dettaglio mensile filtra tutte e sole le attività del mese', () => {
  const activities = [
    { id: 'october-1', watchedOn: '2026-10-01' },
    { id: 'september', watchedOn: '2026-09-30' },
    { id: 'october-2', watchedOn: '2026-10-31' },
    { id: 'november', watchedOn: '2026-11-01' },
  ];

  assert.deepEqual(
    getActivitiesForMonth(activities, '2026-10').map(
      (activity) => activity.id,
    ),
    ['october-1', 'october-2'],
  );
});

test('la chiave mensile viene presentata in italiano', () => {
  assert.equal(formatMonthKey('2026-10'), 'Ottobre 2026');
  assert.equal(formatMonthKey('invalid'), 'invalid');
  assert.equal(formatMonthKey('2026-13'), '2026-13');
});
