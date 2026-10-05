import { withSupabase } from '@supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';

import {
  BADGE_CATEGORIES,
  BADGE_LEVEL_KEYS,
  BadgeEngineError,
  createBadgeRegistry,
  type BadgeCategory,
  type BadgeDefinition,
  type BadgeEvaluation,
  type BadgeEvaluationContext,
  type BadgeLevelDefinition,
  type BadgeLevelKey,
  type CinephileFacts,
} from './badge-engine.ts';

const PAGE_SIZE = 1000;
const registry = createBadgeRegistry();

type EvaluateRequest = {
  badgeIds?: string[];
  backfill?: boolean;
};

type BadgeDefinitionRow = {
  id: string;
  version: number;
  category: string;
  name: string;
  description: string;
  icon_key: string;
  is_active: boolean;
};

type BadgeLevelRow = {
  badge_id: string;
  badge_version: number;
  level: number;
  level_key: string;
  name: string;
  description: string;
  threshold: number;
  icon_key: string;
};

type NewUnlockRow = {
  badge_id: string;
  badge_version: number;
  level: number;
  level_key: string;
  unlocked_at: string;
};

type EvaluationResult = {
  evaluation: Omit<BadgeEvaluation, 'evidence'>;
  newUnlocks: NewUnlockRow[];
};

function isBadgeCategory(value: string): value is BadgeCategory {
  return (BADGE_CATEGORIES as readonly string[]).includes(value);
}

function isBadgeLevelKey(value: string): value is BadgeLevelKey {
  return (BADGE_LEVEL_KEYS as readonly string[]).includes(value);
}

function parseBody(value: unknown): EvaluateRequest {
  if (typeof value !== 'object' || value == null) {
    throw new BadgeEngineError(
      'Payload valutazione non valido',
      'request_invalid',
    );
  }
  const body = value as Record<string, unknown>;
  if (
    body.badgeIds != null &&
    (!Array.isArray(body.badgeIds) ||
      body.badgeIds.some(
        (badgeId) => typeof badgeId !== 'string' || !badgeId.trim(),
      ))
  ) {
    throw new BadgeEngineError(
      'Elenco badge non valido',
      'badge_ids_invalid',
    );
  }
  if (body.backfill != null && typeof body.backfill !== 'boolean') {
    throw new BadgeEngineError(
      'Flag backfill non valido',
      'backfill_invalid',
    );
  }
  return {
    badgeIds: body.badgeIds
      ? Array.from(
          new Set((body.badgeIds as string[]).map((badgeId) => badgeId.trim())),
        )
      : undefined,
    backfill: body.backfill ?? false,
  };
}

function parseRequestText(value: string): EvaluateRequest {
  if (!value) {
    return {};
  }
  try {
    return parseBody(JSON.parse(value));
  } catch (error) {
    if (error instanceof BadgeEngineError) {
      throw error;
    }
    throw new BadgeEngineError(
      'JSON richiesta non valido',
      'request_invalid',
    );
  }
}

function toDefinition(
  row: BadgeDefinitionRow,
  levelRows: BadgeLevelRow[],
): BadgeDefinition {
  if (!isBadgeCategory(row.category)) {
    throw new BadgeEngineError(
      `Categoria badge non valida: ${row.category}`,
      'definition_invalid',
    );
  }
  const levels: BadgeLevelDefinition[] = levelRows
    .filter(
      (level) =>
        level.badge_id === row.id && level.badge_version === row.version,
    )
    .map((level) => {
      if (!isBadgeLevelKey(level.level_key)) {
        throw new BadgeEngineError(
          `Livello badge non valido: ${level.level_key}`,
          'definition_invalid',
        );
      }
      return {
        level: level.level,
        key: level.level_key,
        name: level.name,
        description: level.description,
        threshold: level.threshold,
        iconKey: level.icon_key,
      };
    })
    .sort((first, second) => first.level - second.level);

  return {
    id: row.id,
    version: row.version,
    category: row.category,
    name: row.name,
    description: row.description,
    iconKey: row.icon_key,
    isActive: row.is_active,
    levels,
  };
}

async function loadCinephileFacts(
  supabaseAdmin: SupabaseClient,
  userId: string,
): Promise<CinephileFacts> {
  const completedMovieIds: string[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabaseAdmin
      .from('library_items')
      .select('id, titles!inner(media_type)')
      .eq('user_id', userId)
      .eq('status', 'watched')
      .eq('titles.media_type', 'movie')
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) {
      throw new BadgeEngineError(
        `Impossibile leggere i film completati: ${error.message}`,
        'facts_load_failed',
      );
    }
    const rows = data ?? [];
    completedMovieIds.push(
      ...rows
        .map((row) => row.id)
        .filter((id): id is string => typeof id === 'string'),
    );
    if (rows.length < PAGE_SIZE) {
      break;
    }
  }
  return { completedMovieIds };
}

async function loadFacts(
  definition: BadgeDefinition,
  supabaseAdmin: SupabaseClient,
  userId: string,
): Promise<unknown> {
  if (definition.id === 'cinephile' && definition.version === 1) {
    return loadCinephileFacts(supabaseAdmin, userId);
  }
  throw new BadgeEngineError(
    `Caricatore fatti non disponibile per ${definition.id}@${definition.version}`,
    'facts_loader_not_found',
  );
}

function statusFor(error: unknown): number {
  if (!(error instanceof BadgeEngineError)) {
    return 500;
  }
  if (
    error.code === 'request_invalid' ||
    error.code === 'badge_ids_invalid' ||
    error.code === 'backfill_invalid' ||
    error.code === 'facts_invalid'
  ) {
    return 400;
  }
  if (
    error.code === 'evaluator_not_found' ||
    error.code === 'facts_loader_not_found' ||
    error.code === 'definition_mismatch' ||
    error.code === 'definition_inactive' ||
    error.code === 'levels_missing' ||
    error.code === 'definition_invalid'
  ) {
    return 409;
  }
  return 500;
}

export default {
  fetch: withSupabase({ auth: 'user' }, async (request, context) => {
    if (request.method !== 'POST') {
      return Response.json(
        { error: { code: 'method_not_allowed', message: 'Metodo non consentito' } },
        { status: 405 },
      );
    }

    try {
      const body = parseRequestText(await request.text());
      const userId = context.userClaims?.id;
      if (!userId) {
        return Response.json(
          { error: { code: 'unauthorized', message: 'Autenticazione richiesta' } },
          { status: 401 },
        );
      }

      let definitionsQuery = context.supabaseAdmin
        .from('badge_definitions')
        .select(
          'id, version, category, name, description, icon_key, is_active',
        )
        .eq('is_active', true)
        .order('id', { ascending: true })
        .order('version', { ascending: false });
      if (body.badgeIds?.length) {
        definitionsQuery = definitionsQuery.in('id', body.badgeIds);
      }
      const { data: rawDefinitions, error: definitionsError } =
        await definitionsQuery;
      if (definitionsError) {
        throw new BadgeEngineError(
          `Impossibile leggere le definizioni badge: ${definitionsError.message}`,
          'definitions_load_failed',
        );
      }
      const latestDefinitions = new Map<string, BadgeDefinitionRow>();
      for (const definition of (rawDefinitions ?? []) as BadgeDefinitionRow[]) {
        if (!latestDefinitions.has(definition.id)) {
          latestDefinitions.set(definition.id, definition);
        }
      }
      const definitionRows = Array.from(latestDefinitions.values());
      if (body.badgeIds?.length) {
        const returnedIds = new Set(
          definitionRows.map((definition) => definition.id),
        );
        const missingIds = body.badgeIds.filter(
          (badgeId) => !returnedIds.has(badgeId),
        );
        if (missingIds.length > 0) {
          throw new BadgeEngineError(
            `Definizioni badge non disponibili: ${missingIds.join(', ')}`,
            'definition_not_found',
          );
        }
      }

      const definitionIds = Array.from(
        new Set(definitionRows.map((definition) => definition.id)),
      );
      const { data: rawLevels, error: levelsError } =
        definitionIds.length > 0
          ? await context.supabaseAdmin
              .from('badge_levels')
              .select(
                'badge_id, badge_version, level, level_key, name, description, threshold, icon_key',
              )
              .in('badge_id', definitionIds)
              .order('badge_id', { ascending: true })
              .order('badge_version', { ascending: false })
              .order('level', { ascending: true })
          : { data: [], error: null };
      if (levelsError) {
        throw new BadgeEngineError(
          `Impossibile leggere i livelli badge: ${levelsError.message}`,
          'levels_load_failed',
        );
      }
      const levelRows = (rawLevels ?? []) as BadgeLevelRow[];
      const definitions = definitionRows.map((definition) =>
        toDefinition(definition, levelRows),
      );
      const evaluatedAt = new Date().toISOString();
      const evaluationContext: BadgeEvaluationContext = {
        evaluatedAt,
        isBackfill: body.backfill ?? false,
      };
      const results: EvaluationResult[] = [];

      for (const definition of definitions) {
        const facts = await loadFacts(
          definition,
          context.supabaseAdmin,
          userId,
        );
        const evaluation = registry.evaluate(
          definition,
          facts,
          evaluationContext,
        );
        const { data: rawUnlocks, error: persistError } =
          await context.supabaseAdmin.rpc('apply_badge_evaluation', {
            p_user_id: userId,
            p_badge_id: evaluation.badgeId,
            p_rule_version: evaluation.version,
            p_progress: evaluation.progress,
            p_evidence: evaluation.evidence,
            p_evaluated_at: evaluatedAt,
            p_is_backfill: body.backfill ?? false,
          });
        if (persistError) {
          throw new BadgeEngineError(
            `Impossibile salvare la valutazione ${definition.id}: ${persistError.message}`,
            'evaluation_persist_failed',
          );
        }
        results.push({
          evaluation: {
            badgeId: evaluation.badgeId,
            version: evaluation.version,
            progress: evaluation.progress,
            unlockedLevels: evaluation.unlockedLevels,
            nextThreshold: evaluation.nextThreshold,
          },
          newUnlocks: (rawUnlocks ?? []) as NewUnlockRow[],
        });
      }

      return Response.json({
        evaluatedAt,
        backfill: body.backfill ?? false,
        totalNewUnlocks: results.reduce(
          (total, result) => total + result.newUnlocks.length,
          0,
        ),
        results,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Errore badge sconosciuto';
      const code =
        error instanceof BadgeEngineError
          ? error.code
          : 'badge_evaluation_failed';
      console.error('Badge evaluation failed', { code, message });
      return Response.json(
        { error: { code, message } },
        { status: statusFor(error) },
      );
    }
  }),
};
