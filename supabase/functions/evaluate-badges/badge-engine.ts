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
  itemIds: string[];
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

export const cinephileEvaluator: BadgeEvaluator = {
  badgeId: 'cinephile',
  version: 1,
  evaluate(definition, rawFacts, context) {
    assertDefinition(definition, 'cinephile', 1);
    const facts = parseCinephileFacts(rawFacts);
    const itemIds = Array.from(
      new Set(facts.completedMovieIds.map((value) => value.trim())),
    ).sort();
    const progress = itemIds.length;
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
        itemIds,
        ...(context.isBackfill ? { backfill: true as const } : {}),
      },
    };
  },
};

export function createBadgeRegistry(): BadgeEvaluatorRegistry {
  const registry = new BadgeEvaluatorRegistry();
  registry.register(cinephileEvaluator);
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
