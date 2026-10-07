import {
  PROFILE_BADGE_ORDER,
  isIntroductoryBadgeId,
} from '@/constants/badges';

export const COLLAPSED_PROFILE_TROPHY_LIMIT = 6;

type SortableProfileTrophy = {
  badgeId: string;
  badgeName: string;
  level: number;
};

export function sortProfileTrophies<
  Trophy extends SortableProfileTrophy,
>(trophies: readonly Trophy[]): Trophy[] {
  return [...trophies].sort((first, second) => {
    const firstIsIntroductory = isIntroductoryBadgeId(
      first.badgeId,
    );
    const secondIsIntroductory = isIntroductoryBadgeId(
      second.badgeId,
    );
    if (firstIsIntroductory !== secondIsIntroductory) {
      return firstIsIntroductory ? 1 : -1;
    }
    if (!firstIsIntroductory && first.level !== second.level) {
      return second.level - first.level;
    }
    const firstIndex = PROFILE_BADGE_ORDER.indexOf(
      first.badgeId as (typeof PROFILE_BADGE_ORDER)[number],
    );
    const secondIndex = PROFILE_BADGE_ORDER.indexOf(
      second.badgeId as (typeof PROFILE_BADGE_ORDER)[number],
    );
    return (
      (firstIndex < 0 ? Number.MAX_SAFE_INTEGER : firstIndex) -
        (secondIndex < 0 ? Number.MAX_SAFE_INTEGER : secondIndex) ||
      first.badgeName.localeCompare(second.badgeName, 'it')
    );
  });
}

export function visibleProfileTrophies<Trophy>(
  trophies: readonly Trophy[],
  expanded: boolean,
): Trophy[] {
  return expanded
    ? [...trophies]
    : trophies.slice(0, COLLAPSED_PROFILE_TROPHY_LIMIT);
}
