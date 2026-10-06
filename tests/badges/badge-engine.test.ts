import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BadgeEngineError,
  BadgeEvaluatorRegistry,
  canonicalGenreKeysFromNames,
  canonicalGenreKeysFromTmdbIds,
  cinephileEvaluator,
  createBadgeRegistry,
  getNewlyUnlockedLevels,
  hasCompletedRegularSeries,
  hasCompletedSeason,
  isReleaseYearBefore,
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

const archivistDefinition: BadgeDefinition = {
  id: 'archivist',
  version: 1,
  category: 'catalog',
  name: 'Archivista',
  description: 'Costruisci una Libreria ampia.',
  iconKey: 'archivist',
  isActive: true,
  levels: [
    {
      level: 1,
      key: 'bronze',
      name: 'Bronzo',
      description: 'Aggiungi 500 titoli.',
      threshold: 500,
      iconKey: 'archivist-bronze',
    },
    {
      level: 2,
      key: 'silver',
      name: 'Argento',
      description: 'Aggiungi 1.500 titoli.',
      threshold: 1500,
      iconKey: 'archivist-silver',
    },
    {
      level: 3,
      key: 'gold',
      name: 'Oro',
      description: 'Aggiungi 2.500 titoli.',
      threshold: 2500,
      iconKey: 'archivist-gold',
    },
    {
      level: 4,
      key: 'platinum',
      name: 'Platino',
      description: 'Aggiungi 5.000 titoli.',
      threshold: 5000,
      iconKey: 'archivist-platinum',
    },
  ],
};

const nostalgicDefinition: BadgeDefinition = {
  id: 'nostalgic',
  version: 1,
  category: 'exploration',
  name: 'Nostalgico',
  description: 'Completa titoli usciti prima del 1990.',
  iconKey: 'nostalgic',
  isActive: true,
  levels: [
    {
      level: 1,
      key: 'bronze',
      name: 'Bronzo',
      description: 'Completa 50 titoli.',
      threshold: 50,
      iconKey: 'nostalgic-bronze',
    },
    {
      level: 2,
      key: 'silver',
      name: 'Argento',
      description: 'Completa 150 titoli.',
      threshold: 150,
      iconKey: 'nostalgic-silver',
    },
    {
      level: 3,
      key: 'gold',
      name: 'Oro',
      description: 'Completa 250 titoli.',
      threshold: 250,
      iconKey: 'nostalgic-gold',
    },
    {
      level: 4,
      key: 'platinum',
      name: 'Platino',
      description: 'Completa 500 titoli.',
      threshold: 500,
      iconKey: 'nostalgic-platinum',
    },
  ],
};

const serialistDefinition: BadgeDefinition = {
  id: 'serialist',
  version: 1,
  category: 'catalog',
  name: 'Serialista',
  description: 'Completa serie concluse.',
  iconKey: 'serialist',
  isActive: true,
  levels: [
    {
      level: 1,
      key: 'bronze',
      name: 'Bronzo',
      description: 'Completa 25 serie.',
      threshold: 25,
      iconKey: 'serialist-bronze',
    },
    {
      level: 2,
      key: 'silver',
      name: 'Argento',
      description: 'Completa 100 serie.',
      threshold: 100,
      iconKey: 'serialist-silver',
    },
    {
      level: 3,
      key: 'gold',
      name: 'Oro',
      description: 'Completa 250 serie.',
      threshold: 250,
      iconKey: 'serialist-gold',
    },
    {
      level: 4,
      key: 'platinum',
      name: 'Platino',
      description: 'Completa 500 serie.',
      threshold: 500,
      iconKey: 'serialist-platinum',
    },
  ],
};

const genreExplorerDefinition: BadgeDefinition = {
  id: 'genre_explorer',
  version: 1,
  category: 'exploration',
  name: 'Esploratore di generi',
  description: 'Completa titoli in generi differenti.',
  iconKey: 'genre-explorer',
  isActive: true,
  levels: [
    {
      level: 1,
      key: 'bronze',
      name: 'Bronzo',
      description: 'Completa 5 generi.',
      threshold: 5,
      iconKey: 'genre-explorer-bronze',
    },
    {
      level: 2,
      key: 'silver',
      name: 'Argento',
      description: 'Completa 8 generi.',
      threshold: 8,
      iconKey: 'genre-explorer-silver',
    },
    {
      level: 3,
      key: 'gold',
      name: 'Oro',
      description: 'Completa 12 generi.',
      threshold: 12,
      iconKey: 'genre-explorer-gold',
    },
    {
      level: 4,
      key: 'platinum',
      name: 'Platino',
      description: 'Completa 15 generi.',
      threshold: 15,
      iconKey: 'genre-explorer-platinum',
    },
  ],
};

function movieIds(count: number): string[] {
  return Array.from({ length: count }, (_, index) => `movie-${index + 1}`);
}

function libraryItemIds(count: number): string[] {
  return Array.from(
    { length: count },
    (_, index) => `library-item-${index + 1}`,
  );
}

const context = {
  evaluatedAt: '2026-10-05T10:00:00.000Z',
  isBackfill: false,
};

function introductoryDefinition(
  id: string,
  name: string,
): BadgeDefinition {
  return {
    id,
    version: 1,
    category: 'viewing',
    name,
    description: `${name}.`,
    iconKey: id,
    isActive: true,
    levels: [
      {
        level: 1,
        key: 'bronze',
        name,
        description: `${name}.`,
        threshold: 1,
        iconKey: id,
      },
    ],
  };
}

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
  assert.equal(evaluation.evidence.itemIds?.length, 49);
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

test('Archivista conta tutti i titoli distinti della Libreria', () => {
  const evaluation = createBadgeRegistry().evaluate(
    archivistDefinition,
    {
      libraryItemIds: [
        ...libraryItemIds(499),
        'library-item-1',
        ' library-item-2 ',
      ],
    },
    context,
  );

  assert.equal(evaluation.progress, 499);
  assert.deepEqual(evaluation.unlockedLevels, []);
  assert.equal(evaluation.nextThreshold, 500);
  assert.equal(evaluation.evidence.itemIds, undefined);
});

test('Archivista sblocca Bronzo e Argento a 1.500 titoli', () => {
  const evaluation = createBadgeRegistry().evaluate(
    archivistDefinition,
    { libraryItemIds: libraryItemIds(1500) },
    { ...context, isBackfill: true },
  );

  assert.equal(evaluation.progress, 1500);
  assert.deepEqual(evaluation.unlockedLevels, [1, 2]);
  assert.equal(evaluation.nextThreshold, 2500);
  assert.equal(evaluation.evidence.backfill, true);
});

test('Archivista rifiuta fatti malformati', () => {
  assert.throws(
    () =>
      createBadgeRegistry().evaluate(
        archivistDefinition,
        { libraryItemIds: ['library-item-1', 2] },
        context,
      ),
    (error: unknown) =>
      error instanceof BadgeEngineError &&
      error.code === 'facts_invalid',
  );
});

test('Nostalgico deduplica i titoli completati prima del 1990', () => {
  const evaluation = createBadgeRegistry().evaluate(
    nostalgicDefinition,
    {
      completedClassicItemIds: [
        ...libraryItemIds(49),
        'library-item-1',
        ' library-item-2 ',
      ],
    },
    context,
  );

  assert.equal(evaluation.progress, 49);
  assert.deepEqual(evaluation.unlockedLevels, []);
  assert.equal(evaluation.nextThreshold, 50);
  assert.equal(evaluation.evidence.itemIds, undefined);
});

test('Nostalgico sblocca Bronzo e Argento a 150 titoli', () => {
  const evaluation = createBadgeRegistry().evaluate(
    nostalgicDefinition,
    { completedClassicItemIds: libraryItemIds(150) },
    { ...context, isBackfill: true },
  );

  assert.equal(evaluation.progress, 150);
  assert.deepEqual(evaluation.unlockedLevels, [1, 2]);
  assert.equal(evaluation.nextThreshold, 250);
  assert.equal(evaluation.evidence.backfill, true);
});

test('Nostalgico rifiuta fatti malformati', () => {
  assert.throws(
    () =>
      createBadgeRegistry().evaluate(
        nostalgicDefinition,
        { completedClassicItemIds: ['library-item-1', 2] },
        context,
      ),
    (error: unknown) =>
      error instanceof BadgeEngineError &&
      error.code === 'facts_invalid',
  );
});

test('Nostalgico accetta soltanto anni validi precedenti al 1990', () => {
  assert.equal(isReleaseYearBefore('1989', 1990), true);
  assert.equal(isReleaseYearBefore(' 1975 ', 1990), true);
  assert.equal(isReleaseYearBefore('1990', 1990), false);
  assert.equal(isReleaseYearBefore('0000', 1990), false);
  assert.equal(isReleaseYearBefore('89', 1990), false);
  assert.equal(isReleaseYearBefore('', 1990), false);
  assert.equal(isReleaseYearBefore(null, 1990), false);
});

test('Serialista deduplica le serie concluse completate', () => {
  const evaluation = createBadgeRegistry().evaluate(
    serialistDefinition,
    {
      completedEndedSeriesIds: [
        ...libraryItemIds(24),
        'library-item-1',
        ' library-item-2 ',
      ],
    },
    context,
  );

  assert.equal(evaluation.progress, 24);
  assert.deepEqual(evaluation.unlockedLevels, []);
  assert.equal(evaluation.nextThreshold, 25);
  assert.equal(evaluation.evidence.itemIds, undefined);
});

test('Serialista sblocca Bronzo e Argento a 100 serie', () => {
  const evaluation = createBadgeRegistry().evaluate(
    serialistDefinition,
    { completedEndedSeriesIds: libraryItemIds(100) },
    { ...context, isBackfill: true },
  );

  assert.equal(evaluation.progress, 100);
  assert.deepEqual(evaluation.unlockedLevels, [1, 2]);
  assert.equal(evaluation.nextThreshold, 250);
  assert.equal(evaluation.evidence.backfill, true);
});

test('Serialista rifiuta fatti malformati', () => {
  assert.throws(
    () =>
      createBadgeRegistry().evaluate(
        serialistDefinition,
        { completedEndedSeriesIds: ['library-item-1', 2] },
        context,
      ),
    (error: unknown) =>
      error instanceof BadgeEngineError &&
      error.code === 'facts_invalid',
  );
});

test('Serialista richiede ogni episodio di ogni stagione regolare', () => {
  const regularSeasons = [
    { seasonNumber: 1, episodeCount: 2 },
    { seasonNumber: 2, episodeCount: 2 },
  ];

  assert.equal(
    hasCompletedRegularSeries(
      [
        { seasonNumber: 1, episodeNumber: 1 },
        { seasonNumber: 1, episodeNumber: 2 },
        { seasonNumber: 2, episodeNumber: 1 },
        { seasonNumber: 2, episodeNumber: 2 },
        { seasonNumber: 0, episodeNumber: 1 },
      ],
      regularSeasons,
    ),
    true,
  );
  assert.equal(
    hasCompletedRegularSeries(
      [
        { seasonNumber: 1, episodeNumber: 1 },
        { seasonNumber: 1, episodeNumber: 2 },
        { seasonNumber: 1, episodeNumber: 3 },
        { seasonNumber: 2, episodeNumber: 1 },
      ],
      regularSeasons,
    ),
    false,
  );
  assert.equal(
    hasCompletedRegularSeries(
      [{ seasonNumber: 1, episodeNumber: 1 }],
      [{ seasonNumber: 0, episodeCount: 1 }],
    ),
    false,
  );
  assert.equal(
    hasCompletedRegularSeries(
      [{ seasonNumber: 1, episodeNumber: 1 }],
      [
        { seasonNumber: 1, episodeCount: 1 },
        { seasonNumber: 1, episodeCount: 1 },
      ],
    ),
    false,
  );
});

test('la tassonomia canonica copre i generi reali e ignora TV Movie', () => {
  const keys = canonicalGenreKeysFromNames([
    'Action & Adventure',
    'Animazione',
    'Avventura',
    'Azione',
    'Commedia',
    'Crime',
    'Documentario',
    'Dramma',
    'Famiglia',
    'Fantascienza',
    'Fantasy',
    'Guerra',
    'Horror',
    'Kids',
    'Mistero',
    'Musica',
    'Reality',
    'Romance',
    'Sci-Fi & Fantasy',
    'Storia',
    'televisione film',
    'Thriller',
    'War & Politics',
    'Western',
  ]);

  assert.equal(keys.length, 15);
  assert.equal(keys.includes('action_adventure'), true);
  assert.equal(keys.includes('science_fiction_fantasy'), true);
});

test('gli ID genere TMDB coprono le 15 categorie ed escludono TV Movie', () => {
  const keys = canonicalGenreKeysFromTmdbIds([
    28,
    16,
    35,
    80,
    99,
    18,
    10751,
    878,
    27,
    9648,
    10749,
    36,
    10402,
    10764,
    37,
    10770,
  ]);

  assert.equal(keys.length, 15);
});

test('Esploratore di generi sblocca tutti i livelli a 15 categorie', () => {
  const evaluation = createBadgeRegistry().evaluate(
    genreExplorerDefinition,
    {
      completedTitles: [
        {
          itemId: 'title-with-names',
          genreNames: [
            'Azione',
            'Avventura',
            'Animazione',
            'Commedia',
            'Crime',
            'Documentario',
            'Dramma',
            'Famiglia',
          ],
          tmdbGenreIds: [],
        },
        {
          itemId: 'title-with-ids',
          genreNames: [],
          tmdbGenreIds: [
            878,
            27,
            9648,
            10749,
            36,
            10402,
            10764,
            37,
            10770,
          ],
        },
      ],
    },
    { ...context, isBackfill: true },
  );

  assert.equal(evaluation.progress, 15);
  assert.deepEqual(evaluation.unlockedLevels, [1, 2, 3, 4]);
  assert.equal(evaluation.nextThreshold, null);
  assert.equal(evaluation.evidence.genreKeys?.length, 15);
  assert.equal(evaluation.evidence.backfill, true);
});

test('Esploratore di generi accorpa alias equivalenti', () => {
  const evaluation = createBadgeRegistry().evaluate(
    genreExplorerDefinition,
    {
      completedTitles: [
        {
          itemId: 'action-title',
          genreNames: [
            'Action',
            'Adventure',
            'Action & Adventure',
            'Azione',
          ],
          tmdbGenreIds: [28, 12, 10759],
        },
      ],
    },
    context,
  );

  assert.equal(evaluation.progress, 1);
  assert.deepEqual(evaluation.evidence.genreKeys, [
    'action_adventure',
  ]);
});

test('Esploratore di generi rifiuta fatti malformati', () => {
  assert.throws(
    () =>
      createBadgeRegistry().evaluate(
        genreExplorerDefinition,
        {
          completedTitles: [
            {
              itemId: 'title-1',
              genreNames: ['Dramma'],
              tmdbGenreIds: ['18'],
            },
          ],
        },
        context,
      ),
    (error: unknown) =>
      error instanceof BadgeEngineError &&
      error.code === 'facts_invalid',
  );
});

test('Primo ciak si sblocca con una sola attività reale distinta', () => {
  const evaluation = createBadgeRegistry().evaluate(
    introductoryDefinition('first_watch', 'Primo ciak'),
    {
      activityIds: [
        'movie:viewing-2',
        'movie:viewing-1',
        'movie:viewing-1',
      ],
    },
    { ...context, isBackfill: true },
  );

  assert.equal(evaluation.progress, 1);
  assert.deepEqual(evaluation.unlockedLevels, [1]);
  assert.equal(evaluation.nextThreshold, null);
  assert.deepEqual(evaluation.evidence.activityIds, [
    'movie:viewing-1',
  ]);
  assert.equal(evaluation.evidence.backfill, true);
});

test('Prima recensione resta bloccata senza una nota valida', () => {
  const evaluation = createBadgeRegistry().evaluate(
    introductoryDefinition('first_review', 'Prima recensione'),
    { activityIds: [] },
    context,
  );

  assert.equal(evaluation.progress, 0);
  assert.deepEqual(evaluation.unlockedLevels, []);
  assert.equal(evaluation.nextThreshold, 1);
  assert.deepEqual(evaluation.evidence.activityIds, []);
});

test('Stagione chiusa salva soltanto la prima stagione determinante', () => {
  const evaluation = createBadgeRegistry().evaluate(
    introductoryDefinition('season_complete', 'Stagione chiusa'),
    {
      completedSeasonKeys: [
        'library-2:S2',
        'library-1:S1',
      ],
    },
    context,
  );

  assert.equal(evaluation.progress, 1);
  assert.deepEqual(evaluation.unlockedLevels, [1]);
  assert.deepEqual(evaluation.evidence.seasonKeys, ['library-1:S1']);
});

test('i badge introduttivi richiedono un solo livello a soglia 1', () => {
  const definition = introductoryDefinition('first_watch', 'Primo ciak');

  assert.throws(
    () =>
      createBadgeRegistry().evaluate(
        {
          ...definition,
          levels: [{ ...definition.levels[0], threshold: 2 }],
        },
        { activityIds: ['movie:viewing-1'] },
        context,
      ),
    (error: unknown) =>
      error instanceof BadgeEngineError &&
      error.code === 'definition_invalid',
  );
});

test('Stagione chiusa richiede tutti gli episodi ufficiali', () => {
  assert.equal(hasCompletedSeason([1, 2, 3], [1, 2, 3]), true);
  assert.equal(hasCompletedSeason([1, 2, 4], [1, 2, 3]), false);
  assert.equal(hasCompletedSeason([1, 2, 3, 99], [1, 2, 3]), true);
  assert.equal(hasCompletedSeason([1], []), false);
});

test('i fatti introduttivi malformati vengono rifiutati', () => {
  assert.throws(
    () =>
      createBadgeRegistry().evaluate(
        introductoryDefinition('first_review', 'Prima recensione'),
        { activityIds: ['movie:viewing-1', 2] },
        context,
      ),
    (error: unknown) =>
      error instanceof BadgeEngineError &&
      error.code === 'facts_invalid',
  );
});
