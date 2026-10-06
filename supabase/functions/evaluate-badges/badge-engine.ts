export const BADGE_CATEGORIES = [
  'catalog',
  'viewing',
  'diary',
  'social',
  'people',
  'exploration',
] as const;

export const BADGE_LEVEL_KEYS = [
  'bronze',
  'silver',
  'gold',
  'platinum',
] as const;

export type BadgeCategory = (typeof BADGE_CATEGORIES)[number];
export type BadgeLevelKey = (typeof BADGE_LEVEL_KEYS)[number];

export type BadgeLevelDefinition = {
  level: number;
  key: BadgeLevelKey;
  name: string;
  description: string;
  threshold: number;
  iconKey: string;
};

export type BadgeDefinition = {
  id: string;
  version: number;
  category: BadgeCategory;
  name: string;
  description: string;
  iconKey: string;
  isActive: boolean;
  levels: BadgeLevelDefinition[];
};

export type BadgeEvaluationContext = {
  evaluatedAt: string;
  isBackfill: boolean;
};

export type BadgeEvidence = {
  itemIds?: string[];
  activityIds?: string[];
  seasonKeys?: string[];
  genreKeys?: string[];
  groupDate?: string;
  backfill?: true;
};

export type BadgeEvaluation = {
  badgeId: string;
  version: number;
  progress: number;
  unlockedLevels: number[];
  nextThreshold: number | null;
  evidence: BadgeEvidence;
};

export type BadgeEvaluator = {
  badgeId: string;
  version: number;
  evaluate: (
    definition: BadgeDefinition,
    facts: unknown,
    context: BadgeEvaluationContext,
  ) => BadgeEvaluation;
};

export class BadgeEngineError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = 'BadgeEngineError';
  }
}

export class BadgeEvaluatorRegistry {
  private readonly evaluators = new Map<string, BadgeEvaluator>();

  register(evaluator: BadgeEvaluator): void {
    const key = registryKey(evaluator.badgeId, evaluator.version);
    if (this.evaluators.has(key)) {
      throw new BadgeEngineError(
        `Valutatore duplicato: ${key}`,
        'duplicate_evaluator',
      );
    }
    this.evaluators.set(key, evaluator);
  }

  evaluate(
    definition: BadgeDefinition,
    facts: unknown,
    context: BadgeEvaluationContext,
  ): BadgeEvaluation {
    const key = registryKey(definition.id, definition.version);
    const evaluator = this.evaluators.get(key);
    if (!evaluator) {
      throw new BadgeEngineError(
        `Valutatore non disponibile per ${key}`,
        'evaluator_not_found',
      );
    }
    return evaluator.evaluate(definition, facts, context);
  }

  has(badgeId: string, version: number): boolean {
    return this.evaluators.has(registryKey(badgeId, version));
  }
}

export type CinephileFacts = {
  completedMovieIds: string[];
};

export type ArchivistFacts = {
  libraryItemIds: string[];
};

export type NostalgicFacts = {
  completedClassicItemIds: string[];
};

export type SerialistFacts = {
  completedEndedSeriesIds: string[];
};

export const CANONICAL_GENRE_KEYS = [
  'action_adventure',
  'animation',
  'comedy',
  'crime',
  'documentary_news',
  'drama_soap',
  'family_youth',
  'science_fiction_fantasy',
  'horror',
  'mystery_thriller',
  'romance',
  'history_war_politics',
  'music',
  'reality_talk',
  'western',
] as const;

export type CanonicalGenreKey =
  (typeof CANONICAL_GENRE_KEYS)[number];

export type GenreTitleFact = {
  itemId: string;
  genreNames: string[];
  tmdbGenreIds: number[];
};

export type GenreExplorerFacts = {
  completedTitles: GenreTitleFact[];
};

export type TrackedEpisodeFact = {
  watchId: string;
  libraryItemId: string;
  seasonNumber: number;
  episodeNumber: number;
  watchedOn: string;
};

export type OneMoreEpisodeFacts = {
  trackedEpisodes: TrackedEpisodeFact[];
};

export type RegularSeasonDefinition = {
  seasonNumber: number;
  episodeCount: number;
};

export type WatchedEpisodeFact = {
  seasonNumber: number;
  episodeNumber: number;
};

export type FirstWatchFacts = {
  activityIds: string[];
};

export type FirstReviewFacts = {
  activityIds: string[];
};

export type SeasonCompleteFacts = {
  completedSeasonKeys: string[];
};

function registryKey(badgeId: string, version: number): string {
  return `${badgeId}@${version}`;
}

function assertDefinition(
  definition: BadgeDefinition,
  badgeId: string,
  version: number,
): void {
  if (definition.id !== badgeId || definition.version !== version) {
    throw new BadgeEngineError(
      `Definizione non compatibile: attesa ${badgeId}@${version}`,
      'definition_mismatch',
    );
  }
  if (!definition.isActive) {
    throw new BadgeEngineError(
      `Definizione non attiva: ${badgeId}@${version}`,
      'definition_inactive',
    );
  }
  if (definition.levels.length === 0) {
    throw new BadgeEngineError(
      `Definizione senza livelli: ${badgeId}@${version}`,
      'levels_missing',
    );
  }
}

function assertSingleAchievementDefinition(
  definition: BadgeDefinition,
  badgeId: string,
  version: number,
): void {
  assertDefinition(definition, badgeId, version);
  const [level] = definition.levels;
  if (
    definition.levels.length !== 1 ||
    level.level !== 1 ||
    level.threshold !== 1
  ) {
    throw new BadgeEngineError(
      `Definizione badge singolo non valida: ${badgeId}@${version}`,
      'definition_invalid',
    );
  }
}

function parseStringArrayFact(
  facts: unknown,
  key: 'activityIds' | 'completedSeasonKeys',
  label: string,
): string[] {
  if (
    typeof facts !== 'object' ||
    facts == null ||
    !(key in facts)
  ) {
    throw new BadgeEngineError(
      `Fatti ${label} non validi`,
      'facts_invalid',
    );
  }
  const values = (facts as Record<string, unknown>)[key];
  if (
    !Array.isArray(values) ||
    values.some((value) => typeof value !== 'string' || !value.trim())
  ) {
    throw new BadgeEngineError(
      `Fatti ${label} non validi`,
      'facts_invalid',
    );
  }
  return values;
}

function singleAchievementEvaluation({
  definition,
  badgeId,
  factIds,
  evidenceKey,
  context,
}: {
  definition: BadgeDefinition;
  badgeId: string;
  factIds: string[];
  evidenceKey: 'activityIds' | 'seasonKeys';
  context: BadgeEvaluationContext;
}): BadgeEvaluation {
  assertSingleAchievementDefinition(definition, badgeId, 1);
  const uniqueFactIds = Array.from(
    new Set(factIds.map((value) => value.trim())),
  ).sort();
  const progress = uniqueFactIds.length > 0 ? 1 : 0;
  const evidence: BadgeEvidence =
    evidenceKey === 'seasonKeys'
      ? { seasonKeys: uniqueFactIds.slice(0, 1) }
      : { activityIds: uniqueFactIds.slice(0, 1) };
  if (context.isBackfill) {
    evidence.backfill = true;
  }

  return {
    badgeId: definition.id,
    version: definition.version,
    progress,
    unlockedLevels: progress === 1 ? [1] : [],
    nextThreshold: progress === 1 ? null : 1,
    evidence,
  };
}

function parseCinephileFacts(facts: unknown): CinephileFacts {
  if (
    typeof facts !== 'object' ||
    facts == null ||
    !('completedMovieIds' in facts) ||
    !Array.isArray(facts.completedMovieIds) ||
    facts.completedMovieIds.some(
      (value) => typeof value !== 'string' || !value.trim(),
    )
  ) {
    throw new BadgeEngineError(
      'Fatti Cinefilo non validi',
      'facts_invalid',
    );
  }
  return { completedMovieIds: facts.completedMovieIds };
}

function parseArchivistFacts(facts: unknown): ArchivistFacts {
  if (
    typeof facts !== 'object' ||
    facts == null ||
    !('libraryItemIds' in facts) ||
    !Array.isArray(facts.libraryItemIds) ||
    facts.libraryItemIds.some(
      (value) => typeof value !== 'string' || !value.trim(),
    )
  ) {
    throw new BadgeEngineError(
      'Fatti Archivista non validi',
      'facts_invalid',
    );
  }
  return { libraryItemIds: facts.libraryItemIds };
}

function parseNostalgicFacts(facts: unknown): NostalgicFacts {
  if (
    typeof facts !== 'object' ||
    facts == null ||
    !('completedClassicItemIds' in facts) ||
    !Array.isArray(facts.completedClassicItemIds) ||
    facts.completedClassicItemIds.some(
      (value) => typeof value !== 'string' || !value.trim(),
    )
  ) {
    throw new BadgeEngineError(
      'Fatti Nostalgico non validi',
      'facts_invalid',
    );
  }
  return {
    completedClassicItemIds: facts.completedClassicItemIds,
  };
}

function parseSerialistFacts(facts: unknown): SerialistFacts {
  if (
    typeof facts !== 'object' ||
    facts == null ||
    !('completedEndedSeriesIds' in facts) ||
    !Array.isArray(facts.completedEndedSeriesIds) ||
    facts.completedEndedSeriesIds.some(
      (value) => typeof value !== 'string' || !value.trim(),
    )
  ) {
    throw new BadgeEngineError(
      'Fatti Serialista non validi',
      'facts_invalid',
    );
  }
  return {
    completedEndedSeriesIds: facts.completedEndedSeriesIds,
  };
}

function parseNonEmptyStrings(value: unknown): string[] | null {
  if (!Array.isArray(value)) {
    return null;
  }
  const strings = value.filter(
    (item): item is string =>
      typeof item === 'string' && Boolean(item.trim()),
  );
  return strings.length === value.length
    ? strings.map((item) => item.trim())
    : null;
}

function parsePositiveIntegers(value: unknown): number[] | null {
  if (!Array.isArray(value)) {
    return null;
  }
  const integers = value.filter(
    (item): item is number =>
      Number.isInteger(item) && Number(item) > 0,
  );
  return integers.length === value.length ? integers : null;
}

function parseGenreExplorerFacts(facts: unknown): GenreExplorerFacts {
  if (
    typeof facts !== 'object' ||
    facts == null ||
    !('completedTitles' in facts) ||
    !Array.isArray(facts.completedTitles)
  ) {
    throw new BadgeEngineError(
      'Fatti Esploratore di generi non validi',
      'facts_invalid',
    );
  }
  const completedTitles: GenreTitleFact[] = [];
  for (const title of facts.completedTitles) {
    const genreNames =
      typeof title === 'object' &&
      title != null &&
      'genreNames' in title
        ? parseNonEmptyStrings(title.genreNames)
        : null;
    const tmdbGenreIds =
      typeof title === 'object' &&
      title != null &&
      'tmdbGenreIds' in title
        ? parsePositiveIntegers(title.tmdbGenreIds)
        : null;
    if (
      typeof title !== 'object' ||
      title == null ||
      !('itemId' in title) ||
      typeof title.itemId !== 'string' ||
      !title.itemId.trim() ||
      genreNames == null ||
      tmdbGenreIds == null
    ) {
      throw new BadgeEngineError(
        'Fatti Esploratore di generi non validi',
        'facts_invalid',
      );
    }
    completedTitles.push({
      itemId: title.itemId.trim(),
      genreNames,
      tmdbGenreIds,
    });
  }
  return { completedTitles };
}

function isValidDateOnly(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return false;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function parseOneMoreEpisodeFacts(
  facts: unknown,
): OneMoreEpisodeFacts {
  if (
    typeof facts !== 'object' ||
    facts == null ||
    !('trackedEpisodes' in facts) ||
    !Array.isArray(facts.trackedEpisodes)
  ) {
    throw new BadgeEngineError(
      'Fatti Ancora un episodio non validi',
      'facts_invalid',
    );
  }
  const trackedEpisodes: TrackedEpisodeFact[] = [];
  for (const episode of facts.trackedEpisodes) {
    if (
      typeof episode !== 'object' ||
      episode == null ||
      !('watchId' in episode) ||
      typeof episode.watchId !== 'string' ||
      !episode.watchId.trim() ||
      !('libraryItemId' in episode) ||
      typeof episode.libraryItemId !== 'string' ||
      !episode.libraryItemId.trim() ||
      !('seasonNumber' in episode) ||
      !Number.isInteger(episode.seasonNumber) ||
      Number(episode.seasonNumber) <= 0 ||
      !('episodeNumber' in episode) ||
      !Number.isInteger(episode.episodeNumber) ||
      Number(episode.episodeNumber) <= 0 ||
      !('watchedOn' in episode) ||
      typeof episode.watchedOn !== 'string' ||
      !isValidDateOnly(episode.watchedOn)
    ) {
      throw new BadgeEngineError(
        'Fatti Ancora un episodio non validi',
        'facts_invalid',
      );
    }
    trackedEpisodes.push({
      watchId: episode.watchId.trim(),
      libraryItemId: episode.libraryItemId.trim(),
      seasonNumber: Number(episode.seasonNumber),
      episodeNumber: Number(episode.episodeNumber),
      watchedOn: episode.watchedOn,
    });
  }
  return { trackedEpisodes };
}

function normalizeGenreName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('it')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const CANONICAL_GENRE_ALIASES: Record<
  CanonicalGenreKey,
  readonly string[]
> = {
  action_adventure: [
    'Action',
    'Adventure',
    'Action & Adventure',
    'Azione',
    'Avventura',
    'Azione e avventura',
  ],
  animation: ['Animation', 'Animazione'],
  comedy: ['Comedy', 'Commedia'],
  crime: ['Crime', 'Crimine'],
  documentary_news: [
    'Documentary',
    'Documentario',
    'News',
    'Notizie',
  ],
  drama_soap: ['Drama', 'Dramma', 'Soap'],
  family_youth: ['Family', 'Famiglia', 'Kids', 'Ragazzi'],
  science_fiction_fantasy: [
    'Science Fiction',
    'Fantascienza',
    'Fantasy',
    'Sci-Fi & Fantasy',
    'Fantascienza e fantasy',
  ],
  horror: ['Horror'],
  mystery_thriller: ['Mystery', 'Mistero', 'Thriller'],
  romance: ['Romance', 'Romantico'],
  history_war_politics: [
    'History',
    'Storia',
    'War',
    'Guerra',
    'War & Politics',
    'Guerra e politica',
  ],
  music: ['Music', 'Musica'],
  reality_talk: ['Reality', 'Talk', 'Talk Show'],
  western: ['Western'],
};

const GENRE_ALIAS_TO_KEY = new Map<string, CanonicalGenreKey>();
for (const genreKey of CANONICAL_GENRE_KEYS) {
  for (const alias of CANONICAL_GENRE_ALIASES[genreKey]) {
    GENRE_ALIAS_TO_KEY.set(normalizeGenreName(alias), genreKey);
  }
}

const TMDB_GENRE_ID_TO_KEY = new Map<number, CanonicalGenreKey>([
  [28, 'action_adventure'],
  [12, 'action_adventure'],
  [10759, 'action_adventure'],
  [16, 'animation'],
  [35, 'comedy'],
  [80, 'crime'],
  [99, 'documentary_news'],
  [10763, 'documentary_news'],
  [18, 'drama_soap'],
  [10766, 'drama_soap'],
  [10751, 'family_youth'],
  [10762, 'family_youth'],
  [878, 'science_fiction_fantasy'],
  [14, 'science_fiction_fantasy'],
  [10765, 'science_fiction_fantasy'],
  [27, 'horror'],
  [9648, 'mystery_thriller'],
  [53, 'mystery_thriller'],
  [10749, 'romance'],
  [36, 'history_war_politics'],
  [10752, 'history_war_politics'],
  [10768, 'history_war_politics'],
  [10402, 'music'],
  [10764, 'reality_talk'],
  [10767, 'reality_talk'],
  [37, 'western'],
]);

export function canonicalGenreKeysFromNames(
  genres: readonly string[],
): CanonicalGenreKey[] {
  return Array.from(
    new Set(
      genres.flatMap((genre) => {
        const key = GENRE_ALIAS_TO_KEY.get(normalizeGenreName(genre));
        return key ? [key] : [];
      }),
    ),
  ).sort();
}

export function canonicalGenreKeysFromTmdbIds(
  genreIds: readonly number[],
): CanonicalGenreKey[] {
  return Array.from(
    new Set(
      genreIds.flatMap((genreId) => {
        const key = TMDB_GENRE_ID_TO_KEY.get(genreId);
        return key ? [key] : [];
      }),
    ),
  ).sort();
}

function progressiveDistinctItemEvaluation({
  definition,
  badgeId,
  itemIds,
  context,
  includeItemIds,
}: {
  definition: BadgeDefinition;
  badgeId: string;
  itemIds: string[];
  context: BadgeEvaluationContext;
  includeItemIds: boolean;
}): BadgeEvaluation {
  assertDefinition(definition, badgeId, 1);
  const distinctItemIds = Array.from(
    new Set(itemIds.map((value) => value.trim())),
  ).sort();
  const progress = distinctItemIds.length;
  const levels = [...definition.levels].sort(
    (first, second) => first.threshold - second.threshold,
  );
  const unlockedLevels = levels
    .filter((level) => progress >= level.threshold)
    .map((level) => level.level);
  const nextThreshold =
    levels.find((level) => progress < level.threshold)?.threshold ?? null;

  return {
    badgeId: definition.id,
    version: definition.version,
    progress,
    unlockedLevels,
    nextThreshold,
    evidence: {
      ...(includeItemIds ? { itemIds: distinctItemIds } : {}),
      ...(context.isBackfill ? { backfill: true as const } : {}),
    },
  };
}

export const cinephileEvaluator: BadgeEvaluator = {
  badgeId: 'cinephile',
  version: 1,
  evaluate(definition, rawFacts, context) {
    const facts = parseCinephileFacts(rawFacts);
    return progressiveDistinctItemEvaluation({
      definition,
      badgeId: 'cinephile',
      itemIds: facts.completedMovieIds,
      context,
      includeItemIds: true,
    });
  },
};

export const archivistEvaluator: BadgeEvaluator = {
  badgeId: 'archivist',
  version: 1,
  evaluate(definition, rawFacts, context) {
    const facts = parseArchivistFacts(rawFacts);
    return progressiveDistinctItemEvaluation({
      definition,
      badgeId: 'archivist',
      itemIds: facts.libraryItemIds,
      context,
      includeItemIds: false,
    });
  },
};

export const nostalgicEvaluator: BadgeEvaluator = {
  badgeId: 'nostalgic',
  version: 1,
  evaluate(definition, rawFacts, context) {
    const facts = parseNostalgicFacts(rawFacts);
    return progressiveDistinctItemEvaluation({
      definition,
      badgeId: 'nostalgic',
      itemIds: facts.completedClassicItemIds,
      context,
      includeItemIds: false,
    });
  },
};

export const serialistEvaluator: BadgeEvaluator = {
  badgeId: 'serialist',
  version: 1,
  evaluate(definition, rawFacts, context) {
    const facts = parseSerialistFacts(rawFacts);
    return progressiveDistinctItemEvaluation({
      definition,
      badgeId: 'serialist',
      itemIds: facts.completedEndedSeriesIds,
      context,
      includeItemIds: false,
    });
  },
};

export const genreExplorerEvaluator: BadgeEvaluator = {
  badgeId: 'genre_explorer',
  version: 1,
  evaluate(definition, rawFacts, context) {
    assertDefinition(definition, 'genre_explorer', 1);
    const facts = parseGenreExplorerFacts(rawFacts);
    const genreKeys = new Set<CanonicalGenreKey>();
    for (const title of facts.completedTitles) {
      for (const genreKey of canonicalGenreKeysFromNames(
        title.genreNames,
      )) {
        genreKeys.add(genreKey);
      }
      for (const genreKey of canonicalGenreKeysFromTmdbIds(
        title.tmdbGenreIds,
      )) {
        genreKeys.add(genreKey);
      }
    }
    const sortedGenreKeys = Array.from(genreKeys).sort();
    const progress = sortedGenreKeys.length;
    const levels = [...definition.levels].sort(
      (first, second) => first.threshold - second.threshold,
    );
    return {
      badgeId: definition.id,
      version: definition.version,
      progress,
      unlockedLevels: levels
        .filter((level) => progress >= level.threshold)
        .map((level) => level.level),
      nextThreshold:
        levels.find((level) => progress < level.threshold)?.threshold ??
        null,
      evidence: {
        genreKeys: sortedGenreKeys,
        ...(context.isBackfill ? { backfill: true as const } : {}),
      },
    };
  },
};

export const oneMoreEpisodeEvaluator: BadgeEvaluator = {
  badgeId: 'one_more_episode',
  version: 1,
  evaluate(definition, rawFacts, context) {
    assertDefinition(definition, 'one_more_episode', 1);
    const facts = parseOneMoreEpisodeFacts(rawFacts);
    const groups = new Map<
      string,
      {
        libraryItemId: string;
        watchedOn: string;
        watchesByEpisode: Map<string, string>;
      }
    >();
    for (const episode of facts.trackedEpisodes) {
      const groupKey = `${episode.libraryItemId}|${episode.watchedOn}`;
      const group = groups.get(groupKey) ?? {
        libraryItemId: episode.libraryItemId,
        watchedOn: episode.watchedOn,
        watchesByEpisode: new Map<string, string>(),
      };
      const episodeKey =
        `${episode.seasonNumber}:${episode.episodeNumber}`;
      if (!group.watchesByEpisode.has(episodeKey)) {
        group.watchesByEpisode.set(episodeKey, episode.watchId);
      }
      groups.set(groupKey, group);
    }
    const winningGroup =
      Array.from(groups.values()).sort(
        (first, second) =>
          second.watchesByEpisode.size -
            first.watchesByEpisode.size ||
          second.watchedOn.localeCompare(first.watchedOn) ||
          first.libraryItemId.localeCompare(second.libraryItemId),
      )[0] ?? null;
    const progress = winningGroup?.watchesByEpisode.size ?? 0;
    const levels = [...definition.levels].sort(
      (first, second) => first.threshold - second.threshold,
    );
    return {
      badgeId: definition.id,
      version: definition.version,
      progress,
      unlockedLevels: levels
        .filter((level) => progress >= level.threshold)
        .map((level) => level.level),
      nextThreshold:
        levels.find((level) => progress < level.threshold)?.threshold ??
        null,
      evidence: {
        activityIds: winningGroup
          ? Array.from(winningGroup.watchesByEpisode.values()).sort()
          : [],
        ...(winningGroup
          ? { groupDate: winningGroup.watchedOn }
          : {}),
        ...(context.isBackfill ? { backfill: true as const } : {}),
      },
    };
  },
};

export const firstWatchEvaluator: BadgeEvaluator = {
  badgeId: 'first_watch',
  version: 1,
  evaluate(definition, rawFacts, context) {
    return singleAchievementEvaluation({
      definition,
      badgeId: 'first_watch',
      factIds: parseStringArrayFact(
        rawFacts,
        'activityIds',
        'Primo ciak',
      ),
      evidenceKey: 'activityIds',
      context,
    });
  },
};

export const firstReviewEvaluator: BadgeEvaluator = {
  badgeId: 'first_review',
  version: 1,
  evaluate(definition, rawFacts, context) {
    return singleAchievementEvaluation({
      definition,
      badgeId: 'first_review',
      factIds: parseStringArrayFact(
        rawFacts,
        'activityIds',
        'Prima recensione',
      ),
      evidenceKey: 'activityIds',
      context,
    });
  },
};

export const seasonCompleteEvaluator: BadgeEvaluator = {
  badgeId: 'season_complete',
  version: 1,
  evaluate(definition, rawFacts, context) {
    return singleAchievementEvaluation({
      definition,
      badgeId: 'season_complete',
      factIds: parseStringArrayFact(
        rawFacts,
        'completedSeasonKeys',
        'Stagione chiusa',
      ),
      evidenceKey: 'seasonKeys',
      context,
    });
  },
};

export function hasCompletedSeason(
  watchedEpisodeNumbers: readonly number[],
  catalogEpisodeNumbers: readonly number[],
): boolean {
  if (
    catalogEpisodeNumbers.length === 0 ||
    catalogEpisodeNumbers.some(
      (episodeNumber) =>
        !Number.isInteger(episodeNumber) || episodeNumber <= 0,
    )
  ) {
    return false;
  }
  const watched = new Set(
    watchedEpisodeNumbers.filter(
      (episodeNumber) =>
        Number.isInteger(episodeNumber) && episodeNumber > 0,
    ),
  );
  return Array.from(new Set(catalogEpisodeNumbers)).every((episodeNumber) =>
    watched.has(episodeNumber),
  );
}

export function isReleaseYearBefore(
  value: unknown,
  cutoffYear: number,
): boolean {
  if (
    typeof value !== 'string' ||
    !Number.isInteger(cutoffYear) ||
    cutoffYear <= 1
  ) {
    return false;
  }
  const normalized = value.trim();
  if (!/^\d{4}$/.test(normalized)) {
    return false;
  }
  const year = Number(normalized);
  return year > 0 && year < cutoffYear;
}

export function hasCompletedRegularSeries(
  watchedEpisodes: readonly WatchedEpisodeFact[],
  regularSeasons: readonly RegularSeasonDefinition[],
): boolean {
  if (regularSeasons.length === 0) {
    return false;
  }
  const seasonNumbers = new Set<number>();
  for (const season of regularSeasons) {
    if (
      !Number.isInteger(season.seasonNumber) ||
      season.seasonNumber <= 0 ||
      !Number.isInteger(season.episodeCount) ||
      season.episodeCount <= 0 ||
      seasonNumbers.has(season.seasonNumber)
    ) {
      return false;
    }
    seasonNumbers.add(season.seasonNumber);
  }

  const watchedKeys = new Set(
    watchedEpisodes
      .filter(
        (episode) =>
          Number.isInteger(episode.seasonNumber) &&
          episode.seasonNumber > 0 &&
          Number.isInteger(episode.episodeNumber) &&
          episode.episodeNumber > 0,
      )
      .map(
        (episode) =>
          `${episode.seasonNumber}:${episode.episodeNumber}`,
      ),
  );
  return regularSeasons.every((season) => {
    for (
      let episodeNumber = 1;
      episodeNumber <= season.episodeCount;
      episodeNumber += 1
    ) {
      if (!watchedKeys.has(`${season.seasonNumber}:${episodeNumber}`)) {
        return false;
      }
    }
    return true;
  });
}

export function createBadgeRegistry(): BadgeEvaluatorRegistry {
  const registry = new BadgeEvaluatorRegistry();
  registry.register(cinephileEvaluator);
  registry.register(archivistEvaluator);
  registry.register(nostalgicEvaluator);
  registry.register(serialistEvaluator);
  registry.register(genreExplorerEvaluator);
  registry.register(oneMoreEpisodeEvaluator);
  registry.register(firstWatchEvaluator);
  registry.register(firstReviewEvaluator);
  registry.register(seasonCompleteEvaluator);
  return registry;
}

export function getNewlyUnlockedLevels(
  evaluation: BadgeEvaluation,
  existingLevels: ReadonlySet<number>,
): number[] {
  return evaluation.unlockedLevels.filter(
    (level) => !existingLevels.has(level),
  );
}
