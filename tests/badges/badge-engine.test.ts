import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BadgeEngineError,
  BadgeEvaluatorRegistry,
  cinephileEvaluator,
  createBadgeRegistry,
  getNewlyUnlockedLevels,
  type BadgeDefinition,
} from '../../supabase/functions/evaluate-badges/badge-engine';

const cinephileDefinition: BadgeDefinition = {
  id: 'cinephile',
  version: 1,
  category: 'catalog',
  name: 'Cinefilo',
  description: 'Completa film.',
  iconKey: 'cinephile',
  isActive: true,
  levels: [
    {
      level: 1,
      key: 'bronze',
      name: 'Bronzo',
      description: 'Completa 50 film.',
      threshold: 50,
      iconKey: 'cinephile-bronze',
    },
    {
      level: 2,
      key: 'silver',
      name: 'Argento',
      description: 'Completa 250 film.',
      threshold: 250,
      iconKey: 'cinephile-silver',
    },
    {
      level: 3,
      key: 'gold',
      name: 'Oro',
      description: 'Completa 500 film.',
      threshold: 500,
      iconKey: 'cinephile-gold',
    },
    {
      level: 4,
      key: 'platinum',
      name: 'Platino',
      description: 'Completa 1.500 film.',
      threshold: 1500,
      iconKey: 'cinephile-platinum',
    },
  ],
};

function movieIds(count: number): string[] {
  return Array.from({ length: count }, (_, index) => `movie-${index + 1}`);
}

const context = {
  evaluatedAt: '2026-10-05T10:00:00.000Z',
  isBackfill: false,
};

test('Cinefilo deduplica i film e resta sotto Bronzo', () => {
  const registry = createBadgeRegistry();
  const evaluation = registry.evaluate(
    cinephileDefinition,
    {
      completedMovieIds: [
        ...movieIds(49),
        'movie-1',
        ' movie-2 ',
      ],
    },
    context,
  );

  assert.equal(evaluation.progress, 49);
  assert.deepEqual(evaluation.unlockedLevels, []);
  assert.equal(evaluation.nextThreshold, 50);
  assert.equal(evaluation.evidence.itemIds.length, 49);
  assert.equal('backfill' in evaluation.evidence, false);
});

test('Cinefilo sblocca Bronzo esattamente a 50 film', () => {
  const evaluation = createBadgeRegistry().evaluate(
    cinephileDefinition,
    { completedMovieIds: movieIds(50) },
    context,
  );

  assert.equal(evaluation.progress, 50);
  assert.deepEqual(evaluation.unlockedLevels, [1]);
  assert.equal(evaluation.nextThreshold, 250);
});

test('Cinefilo sblocca tutti i livelli a 1.500 film', () => {
  const evaluation = createBadgeRegistry().evaluate(
    cinephileDefinition,
    { completedMovieIds: movieIds(1500) },
    { ...context, isBackfill: true },
  );

  assert.deepEqual(evaluation.unlockedLevels, [1, 2, 3, 4]);
  assert.equal(evaluation.nextThreshold, null);
  assert.equal(evaluation.evidence.backfill, true);
});

test('il registry rifiuta una versione senza valutatore', () => {
  const registry = createBadgeRegistry();

  assert.throws(
    () =>
      registry.evaluate(
        { ...cinephileDefinition, version: 2 },
        { completedMovieIds: [] },
        context,
      ),
    (error: unknown) =>
      error instanceof BadgeEngineError &&
      error.code === 'evaluator_not_found',
  );
});

test('il registry rifiuta registrazioni duplicate', () => {
  const registry = new BadgeEvaluatorRegistry();
  registry.register(cinephileEvaluator);

  assert.throws(
    () => registry.register(cinephileEvaluator),
    (error: unknown) =>
      error instanceof BadgeEngineError &&
      error.code === 'duplicate_evaluator',
  );
});

test('il delta degli sblocchi è idempotente', () => {
  const evaluation = createBadgeRegistry().evaluate(
    cinephileDefinition,
    { completedMovieIds: movieIds(500) },
    context,
  );

  assert.deepEqual(
    getNewlyUnlockedLevels(evaluation, new Set<number>()),
    [1, 2, 3],
  );
  assert.deepEqual(
    getNewlyUnlockedLevels(evaluation, new Set([1, 2, 3])),
    [],
  );
  assert.deepEqual(
    getNewlyUnlockedLevels(evaluation, new Set([1, 2])),
    [3],
  );
});

test('Cinefilo rifiuta fatti malformati', () => {
  assert.throws(
    () =>
      createBadgeRegistry().evaluate(
        cinephileDefinition,
        { completedMovieIds: ['movie-1', 2] },
        context,
      ),
    (error: unknown) =>
      error instanceof BadgeEngineError &&
      error.code === 'facts_invalid',
  );
});
