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

export function createBadgeRegistry(): BadgeEvaluatorRegistry {
  const registry = new BadgeEvaluatorRegistry();
  registry.register(cinephileEvaluator);
  registry.register(archivistEvaluator);
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
