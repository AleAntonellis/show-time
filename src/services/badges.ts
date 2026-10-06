import { getSupabase } from '@/services/supabase';

type BadgeUnlockListener = (count: number) => void;

const unlockListeners = new Set<BadgeUnlockListener>();
const queuedBadgeIds = new Set<string>();
let evaluationTimer: ReturnType<typeof setTimeout> | null = null;

export const BADGE_IDS = {
  cinephile: 'cinephile',
  archivist: 'archivist',
  nostalgic: 'nostalgic',
  serialist: 'serialist',
  genreExplorer: 'genre_explorer',
  firstWatch: 'first_watch',
  firstReview: 'first_review',
  seasonComplete: 'season_complete',
} as const;

export const INTRODUCTORY_BADGE_IDS = [
  BADGE_IDS.firstWatch,
  BADGE_IDS.firstReview,
  BADGE_IDS.seasonComplete,
] as const;

export const ALL_BADGE_IDS = [
  BADGE_IDS.cinephile,
  BADGE_IDS.archivist,
  BADGE_IDS.nostalgic,
  BADGE_IDS.serialist,
  BADGE_IDS.genreExplorer,
  ...INTRODUCTORY_BADGE_IDS,
] as const;

export type IntroductoryBadgeId =
  (typeof INTRODUCTORY_BADGE_IDS)[number];

export function isIntroductoryBadgeId(
  badgeId: string,
): badgeId is IntroductoryBadgeId {
  return (INTRODUCTORY_BADGE_IDS as readonly string[]).includes(badgeId);
}

export type BadgeLevelKey = 'bronze' | 'silver' | 'gold' | 'platinum';

export type BadgeLevelState = {
  level: number;
  key: BadgeLevelKey;
  name: string;
  description: string;
  threshold: number;
  iconKey: string;
  unlockedAt: string | null;
  progressAtUnlock: number | null;
  seenAt: string | null;
};

export type BadgeFamilyState = {
  id: string;
  version: number;
  category: string;
  name: string;
  description: string;
  iconKey: string;
  isActive: boolean;
  currentProgress: number;
  maxProgress: number;
  nextThreshold: number | null;
  evaluatedAt: string | null;
  levels: BadgeLevelState[];
};

export type BadgeEvaluationUnlock = {
  badge_id: string;
  badge_version: number;
  level: number;
  level_key: BadgeLevelKey;
  unlocked_at: string;
};

export type BadgeEvaluationResponse = {
  evaluatedAt: string;
  backfill: boolean;
  totalNewUnlocks: number;
  results: {
    evaluation: {
      badgeId: string;
      version: number;
      progress: number;
      unlockedLevels: number[];
      nextThreshold: number | null;
    };
    newUnlocks: BadgeEvaluationUnlock[];
  }[];
};

type BadgeCatalogRow = {
  badge_id: string;
  badge_version: number;
  category: string;
  badge_name: string;
  badge_description: string;
  badge_icon_key: string;
  is_active: boolean;
  level: number;
  level_key: BadgeLevelKey;
  level_name: string;
  level_description: string;
  threshold: number;
  level_icon_key: string;
  unlocked_at: string | null;
  progress_at_unlock: number | null;
  seen_at: string | null;
  current_progress: number | null;
  max_progress: number | null;
  next_threshold: number | null;
  evaluated_at: string | null;
};

function familyKey(row: BadgeCatalogRow): string {
  return `${row.badge_id}@${row.badge_version}`;
}

export async function getMyBadgeCatalog(): Promise<BadgeFamilyState[]> {
  const { data, error } = await getSupabase().rpc('get_my_badge_catalog');
  if (error) {
    throw new Error(error.message);
  }
  const families = new Map<string, BadgeFamilyState>();
  for (const row of (data ?? []) as BadgeCatalogRow[]) {
    const key = familyKey(row);
    const existing = families.get(key);
    const level: BadgeLevelState = {
      level: Number(row.level),
      key: row.level_key,
      name: row.level_name,
      description: row.level_description,
      threshold: Number(row.threshold),
      iconKey: row.level_icon_key,
      unlockedAt: row.unlocked_at,
      progressAtUnlock:
        row.progress_at_unlock != null
          ? Number(row.progress_at_unlock)
          : null,
      seenAt: row.seen_at,
    };
    if (existing) {
      existing.levels.push(level);
      continue;
    }
    families.set(key, {
      id: row.badge_id,
      version: Number(row.badge_version),
      category: row.category,
      name: row.badge_name,
      description: row.badge_description,
      iconKey: row.badge_icon_key,
      isActive: row.is_active,
      currentProgress: Number(row.current_progress ?? 0),
      maxProgress: Number(row.max_progress ?? 0),
      nextThreshold:
        row.next_threshold != null ? Number(row.next_threshold) : null,
      evaluatedAt: row.evaluated_at,
      levels: [level],
    });
  }
  return Array.from(families.values()).map((family) => ({
    ...family,
    levels: family.levels.sort(
      (first, second) => first.level - second.level,
    ),
  }));
}

export async function getUnseenBadgeCount(): Promise<number> {
  const { data, error } = await getSupabase().rpc(
    'get_my_unseen_badge_count',
  );
  if (error) {
    throw new Error(error.message);
  }
  return Number(data ?? 0);
}

export async function markMyBadgesSeen(): Promise<number> {
  const { data, error } = await getSupabase().rpc('mark_my_badges_seen');
  if (error) {
    throw new Error(error.message);
  }
  return Number(data ?? 0);
}

export async function requestBadgeEvaluation({
  badgeIds,
  backfill = false,
}: {
  badgeIds?: string[];
  backfill?: boolean;
} = {}): Promise<BadgeEvaluationResponse> {
  const { data, error } = await getSupabase().functions.invoke(
    'evaluate-badges',
    {
      body: {
        ...(badgeIds ? { badgeIds } : {}),
        backfill,
      },
    },
  );
  if (error) {
    throw new Error(error.message);
  }
  return data as BadgeEvaluationResponse;
}

export function subscribeToBadgeUnlocks(
  listener: BadgeUnlockListener,
): () => void {
  unlockListeners.add(listener);
  return () => {
    unlockListeners.delete(listener);
  };
}

function notifyBadgeUnlocks(count: number): void {
  if (count <= 0) {
    return;
  }
  for (const listener of unlockListeners) {
    listener(count);
  }
}

export async function evaluateBadgesAndNotify({
  badgeIds,
  backfill = false,
}: {
  badgeIds?: string[];
  backfill?: boolean;
} = {}): Promise<BadgeEvaluationResponse> {
  const response = await requestBadgeEvaluation({ badgeIds, backfill });
  notifyBadgeUnlocks(response.totalNewUnlocks);
  return response;
}

export function queueBadgeEvaluation(
  badgeIds: readonly string[] = [BADGE_IDS.cinephile],
): void {
  for (const badgeId of badgeIds) {
    queuedBadgeIds.add(badgeId);
  }
  if (evaluationTimer) {
    return;
  }
  evaluationTimer = setTimeout(() => {
    evaluationTimer = null;
    const requestedBadgeIds = Array.from(queuedBadgeIds);
    queuedBadgeIds.clear();
    void evaluateBadgesAndNotify({ badgeIds: requestedBadgeIds }).catch(
      (error: unknown) => {
        console.error(
          'Badge evaluation after mutation failed:',
          error instanceof Error ? error.message : error,
        );
      },
    );
  }, 250);
}
