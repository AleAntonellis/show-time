import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BadgeEngineError,
  BadgeEvaluatorRegistry,
  canonicalGenreKeysFromNames,
  canonicalGenreKeysFromTmdbIds,
  cinephileEvaluator,
  completedRegularSeriesSource,
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

const oneMoreEpisodeDefinition: BadgeDefinition = {
  id: 'one_more_episode',
  version: 1,
  category: 'viewing',
  name: 'Ancora un episodio',
  description: 'Completa più episodi della stessa serie.',
  iconKey: 'one-more-episode',
  isActive: true,
  levels: [
    {
      level: 1,
      key: 'bronze',
      name: 'Bronzo',
      description: 'Completa 3 episodi.',
      threshold: 3,
      iconKey: 'one-more-episode-bronze',
    },
    {
      level: 2,
      key: 'silver',
      name: 'Argento',
      description: 'Completa 5 episodi.',
      threshold: 5,
      iconKey: 'one-more-episode-silver',
    },
    {
      level: 3,
      key: 'gold',
      name: 'Oro',
      description: 'Completa 8 episodi.',
      threshold: 8,
      iconKey: 'one-more-episode-gold',
    },
    {
      level: 4,
      key: 'platinum',
      name: 'Platino',
      description: 'Completa 12 episodi.',
      threshold: 12,
      iconKey: 'one-more-episode-platinum',
    },
  ],
};

const marathonDefinition: BadgeDefinition = {
  id: 'marathon',
  version: 1,
  category: 'viewing',
  name: 'Maratoneta',
  description: 'Completa stagioni in uno o due giorni consecutivi.',
  iconKey: 'marathon',
  isActive: true,
  levels: [
    {
      level: 1,
      key: 'bronze',
      name: 'Bronzo',
      description: 'Completa 1 stagione.',
      threshold: 1,
      iconKey: 'marathon-bronze',
    },
    {
      level: 2,
      key: 'silver',
      name: 'Argento',
      description: 'Completa 5 stagioni.',
      threshold: 5,
      iconKey: 'marathon-silver',
    },
    {
      level: 3,
      key: 'gold',
      name: 'Oro',
      description: 'Completa 15 stagioni.',
      threshold: 15,
      iconKey: 'marathon-gold',
    },
    {
      level: 4,
      key: 'platinum',
      name: 'Platino',
      description: 'Completa 30 stagioni.',
      threshold: 30,
      iconKey: 'marathon-platinum',
    },
  ],
};

const encoreDefinition: BadgeDefinition = {
  id: 'encore',
  version: 1,
  category: 'viewing',
  name: 'Encore',
  description: 'Rivedi titoli già completati.',
  iconKey: 'encore',
  isActive: true,
  levels: [
    {
      level: 1,
      key: 'bronze',
      name: 'Bronzo',
      description: 'Rivedi 5 titoli.',
      threshold: 5,
      iconKey: 'encore-bronze',
    },
    {
      level: 2,
      key: 'silver',
      name: 'Argento',
      description: 'Rivedi 25 titoli.',
      threshold: 25,
      iconKey: 'encore-silver',
    },
    {
      level: 3,
      key: 'gold',
      name: 'Oro',
      description: 'Rivedi 100 titoli.',
      threshold: 100,
      iconKey: 'encore-gold',
    },
    {
      level: 4,
      key: 'platinum',
      name: 'Platino',
      description: 'Rivedi 250 titoli.',
      threshold: 250,
      iconKey: 'encore-platinum',
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

test('Ancora un episodio conta episodi distinti della stessa serie e data', () => {
  const evaluation = createBadgeRegistry().evaluate(
    oneMoreEpisodeDefinition,
    {
      trackedEpisodes: [
        {
          watchId: 'watch-1',
          libraryItemId: 'series-1',
          seasonNumber: 1,
          episodeNumber: 1,
          watchedOn: '2026-10-06',
        },
        {
          watchId: 'watch-2',
          libraryItemId: 'series-1',
          seasonNumber: 1,
          episodeNumber: 2,
          watchedOn: '2026-10-06',
        },
        {
          watchId: 'watch-3',
          libraryItemId: 'series-1',
          seasonNumber: 2,
          episodeNumber: 1,
          watchedOn: '2026-10-06',
        },
        {
          watchId: 'watch-duplicate',
          libraryItemId: 'series-1',
          seasonNumber: 2,
          episodeNumber: 1,
          watchedOn: '2026-10-06',
        },
      ],
    },
    context,
  );

  assert.equal(evaluation.progress, 3);
  assert.deepEqual(evaluation.unlockedLevels, [1]);
  assert.equal(evaluation.nextThreshold, 5);
  assert.deepEqual(evaluation.evidence.activityIds, [
    'watch-1',
    'watch-2',
    'watch-3',
  ]);
  assert.equal(evaluation.evidence.groupDate, '2026-10-06');
});

test('Ancora un episodio non combina serie o date differenti', () => {
  const evaluation = createBadgeRegistry().evaluate(
    oneMoreEpisodeDefinition,
    {
      trackedEpisodes: [
        {
          watchId: 'watch-1',
          libraryItemId: 'series-1',
          seasonNumber: 1,
          episodeNumber: 1,
          watchedOn: '2026-10-05',
        },
        {
          watchId: 'watch-2',
          libraryItemId: 'series-1',
          seasonNumber: 1,
          episodeNumber: 2,
          watchedOn: '2026-10-05',
        },
        {
          watchId: 'watch-3',
          libraryItemId: 'series-1',
          seasonNumber: 1,
          episodeNumber: 3,
          watchedOn: '2026-10-06',
        },
        {
          watchId: 'watch-4',
          libraryItemId: 'series-2',
          seasonNumber: 1,
          episodeNumber: 1,
          watchedOn: '2026-10-05',
        },
      ],
    },
    context,
  );

  assert.equal(evaluation.progress, 2);
  assert.deepEqual(evaluation.unlockedLevels, []);
  assert.equal(evaluation.evidence.groupDate, '2026-10-05');
});

test('Ancora un episodio usa il gruppo più recente in caso di parità', () => {
  const evaluation = createBadgeRegistry().evaluate(
    oneMoreEpisodeDefinition,
    {
      trackedEpisodes: [
        {
          watchId: 'older',
          libraryItemId: 'series-1',
          seasonNumber: 1,
          episodeNumber: 1,
          watchedOn: '2026-10-05',
        },
        {
          watchId: 'newer',
          libraryItemId: 'series-2',
          seasonNumber: 1,
          episodeNumber: 1,
          watchedOn: '2026-10-06',
        },
      ],
    },
    context,
  );

  assert.equal(evaluation.progress, 1);
  assert.deepEqual(evaluation.evidence.activityIds, ['newer']);
  assert.equal(evaluation.evidence.groupDate, '2026-10-06');
});

test('Ancora un episodio rifiuta Speciali e date non valide', () => {
  for (const trackedEpisode of [
    {
      watchId: 'special',
      libraryItemId: 'series-1',
      seasonNumber: 0,
      episodeNumber: 1,
      watchedOn: '2026-10-06',
    },
    {
      watchId: 'invalid-date',
      libraryItemId: 'series-1',
      seasonNumber: 1,
      episodeNumber: 1,
      watchedOn: '2026-02-30',
    },
  ]) {
    assert.throws(
      () =>
        createBadgeRegistry().evaluate(
          oneMoreEpisodeDefinition,
          { trackedEpisodes: [trackedEpisode] },
          context,
        ),
      (error: unknown) =>
        error instanceof BadgeEngineError &&
        error.code === 'facts_invalid',
    );
  }
});

test('Maratoneta conta stagioni complete in uno o due giorni consecutivi', () => {
  const evaluation = createBadgeRegistry().evaluate(
    marathonDefinition,
    {
      seasons: [
        {
          seasonKey: 'series-2:S3',
          episodeCount: 8,
          trackedEpisodes: Array.from({ length: 8 }, (_, index) => ({
            watchId: `series-2-watch-${index + 1}`,
            episodeNumber: 8 - index,
            watchedOn: index < 4 ? '2026-10-07' : '2026-10-06',
          })),
        },
        {
          seasonKey: 'series-1:S1',
          episodeCount: 10,
          trackedEpisodes: Array.from({ length: 10 }, (_, index) => ({
            watchId: `series-1-watch-${index + 1}`,
            episodeNumber: index + 1,
            watchedOn: '2026-10-05',
          })),
        },
      ],
    },
    { ...context, isBackfill: true },
  );

  assert.equal(evaluation.progress, 2);
  assert.deepEqual(evaluation.unlockedLevels, [1]);
  assert.equal(evaluation.nextThreshold, 5);
  assert.deepEqual(evaluation.evidence.seasonKeys, [
    'series-1:S1',
    'series-2:S3',
  ]);
  assert.equal(evaluation.evidence.backfill, true);
});

test('Maratoneta richiede almeno 8 episodi e la stagione completa', () => {
  const evaluation = createBadgeRegistry().evaluate(
    marathonDefinition,
    {
      seasons: [
        {
          seasonKey: 'short:S1',
          episodeCount: 7,
          trackedEpisodes: Array.from({ length: 7 }, (_, index) => ({
            watchId: `short-${index + 1}`,
            episodeNumber: index + 1,
            watchedOn: '2026-10-05',
          })),
        },
        {
          seasonKey: 'incomplete:S1',
          episodeCount: 8,
          trackedEpisodes: Array.from({ length: 7 }, (_, index) => ({
            watchId: `incomplete-${index + 1}`,
            episodeNumber: index + 1,
            watchedOn: '2026-10-05',
          })),
        },
      ],
    },
    context,
  );

  assert.equal(evaluation.progress, 0);
  assert.deepEqual(evaluation.unlockedLevels, []);
  assert.equal(evaluation.nextThreshold, 1);
  assert.deepEqual(evaluation.evidence.seasonKeys, []);
});

test('Maratoneta sblocca Argento esattamente a 5 stagioni', () => {
  const evaluation = createBadgeRegistry().evaluate(
    marathonDefinition,
    {
      seasons: Array.from({ length: 5 }, (_, seasonIndex) => ({
        seasonKey: `series-${seasonIndex + 1}:S1`,
        episodeCount: 8,
        trackedEpisodes: Array.from(
          { length: 8 },
          (_, episodeIndex) => ({
            watchId:
              `series-${seasonIndex + 1}-watch-${episodeIndex + 1}`,
            episodeNumber: episodeIndex + 1,
            watchedOn: '2026-10-05',
          }),
        ),
      })),
    },
    context,
  );

  assert.equal(evaluation.progress, 5);
  assert.deepEqual(evaluation.unlockedLevels, [1, 2]);
  assert.equal(evaluation.nextThreshold, 15);
});

test('Maratoneta non combina date distanti e gestisce il cambio anno', () => {
  const evaluation = createBadgeRegistry().evaluate(
    marathonDefinition,
    {
      seasons: [
        {
          seasonKey: 'invalid-window:S1',
          episodeCount: 8,
          trackedEpisodes: Array.from({ length: 8 }, (_, index) => ({
            watchId: `invalid-window-${index + 1}`,
            episodeNumber: index + 1,
            watchedOn: index < 4 ? '2026-10-05' : '2026-10-07',
          })),
        },
        {
          seasonKey: 'new-year:S1',
          episodeCount: 8,
          trackedEpisodes: Array.from({ length: 8 }, (_, index) => ({
            watchId: `new-year-${index + 1}`,
            episodeNumber: index + 1,
            watchedOn:
              index < 4 ? '2026-12-31' : '2027-01-01',
          })),
        },
      ],
    },
    context,
  );

  assert.equal(evaluation.progress, 1);
  assert.deepEqual(evaluation.evidence.seasonKeys, ['new-year:S1']);
});

test('Maratoneta rifiuta date non valide ed episodi duplicati', () => {
  for (const trackedEpisodes of [
    [
      {
        watchId: 'invalid-date',
        episodeNumber: 1,
        watchedOn: '2026-02-30',
      },
    ],
    [
      {
        watchId: 'first',
        episodeNumber: 1,
        watchedOn: '2026-10-06',
      },
      {
        watchId: 'duplicate',
        episodeNumber: 1,
        watchedOn: '2026-10-06',
      },
    ],
  ]) {
    assert.throws(
      () =>
        createBadgeRegistry().evaluate(
          marathonDefinition,
          {
            seasons: [
              {
                seasonKey: 'series-1:S1',
                episodeCount: 8,
                trackedEpisodes,
              },
            ],
          },
          context,
        ),
      (error: unknown) =>
        error instanceof BadgeEngineError &&
        error.code === 'facts_invalid',
    );
  }
});

test('Encore conta import più tracked e due visioni tracked', () => {
  const evaluation = createBadgeRegistry().evaluate(
    encoreDefinition,
    {
      titles: [
        {
          itemId: 'movie-imported',
          initialViewingSource: 'imported',
          trackedViewingIds: ['viewing-1'],
        },
        {
          itemId: 'movie-tracked',
          initialViewingSource: null,
          trackedViewingIds: ['viewing-2', 'viewing-3'],
        },
        {
          itemId: 'series-tracked',
          initialViewingSource: 'tracked',
          trackedViewingIds: ['series-viewing-1'],
        },
        {
          itemId: 'not-rewatched',
          initialViewingSource: null,
          trackedViewingIds: ['single-viewing'],
        },
      ],
    },
    { ...context, isBackfill: true },
  );

  assert.equal(evaluation.progress, 3);
  assert.deepEqual(evaluation.unlockedLevels, []);
  assert.equal(evaluation.nextThreshold, 5);
  assert.deepEqual(evaluation.evidence.itemIds, [
    'movie-imported',
    'movie-tracked',
    'series-tracked',
  ]);
  assert.equal(evaluation.evidence.backfill, true);
});

test('Encore non conta due volte la stessa visione tracked', () => {
  const evaluation = createBadgeRegistry().evaluate(
    encoreDefinition,
    {
      titles: [
        {
          itemId: 'movie-1',
          initialViewingSource: null,
          trackedViewingIds: ['viewing-1', 'viewing-1'],
        },
      ],
    },
    context,
  );

  assert.equal(evaluation.progress, 0);
  assert.deepEqual(evaluation.evidence.itemIds, []);
});

test('Encore sblocca Argento esattamente a 25 titoli', () => {
  const evaluation = createBadgeRegistry().evaluate(
    encoreDefinition,
    {
      titles: Array.from({ length: 25 }, (_, index) => ({
        itemId: `title-${index + 1}`,
        initialViewingSource: 'imported',
        trackedViewingIds: [`viewing-${index + 1}`],
      })),
    },
    context,
  );

  assert.equal(evaluation.progress, 25);
  assert.deepEqual(evaluation.unlockedLevels, [1, 2]);
  assert.equal(evaluation.nextThreshold, 100);
});

test('Encore rifiuta fatti malformati', () => {
  for (const title of [
    {
      itemId: 'movie-1',
      initialViewingSource: 'unknown',
      trackedViewingIds: ['viewing-1'],
    },
    {
      itemId: 'movie-1',
      initialViewingSource: null,
      trackedViewingIds: [1],
    },
  ]) {
    assert.throws(
      () =>
        createBadgeRegistry().evaluate(
          encoreDefinition,
          { titles: [title] },
          context,
        ),
      (error: unknown) =>
        error instanceof BadgeEngineError &&
        error.code === 'facts_invalid',
    );
  }
});

test('Encore riconosce soltanto una prima visione serie uniforme', () => {
  const seasons = [{ seasonNumber: 1, episodeCount: 3 }];

  assert.equal(
    completedRegularSeriesSource(
      [1, 2, 3].map((episodeNumber) => ({
        seasonNumber: 1,
        episodeNumber,
        source: 'imported',
      })),
      seasons,
    ),
    'imported',
  );
  assert.equal(
    completedRegularSeriesSource(
      [1, 2, 3].map((episodeNumber) => ({
        seasonNumber: 1,
        episodeNumber,
        source: 'tracked',
      })),
      seasons,
    ),
    'tracked',
  );
  assert.equal(
    completedRegularSeriesSource(
      [
        { seasonNumber: 1, episodeNumber: 1, source: 'imported' },
        { seasonNumber: 1, episodeNumber: 2, source: 'tracked' },
        { seasonNumber: 1, episodeNumber: 3, source: 'tracked' },
      ],
      seasons,
    ),
    null,
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
