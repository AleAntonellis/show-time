export const BADGE_IDS = {
  cinephile: 'cinephile',
  archivist: 'archivist',
  nostalgic: 'nostalgic',
  serialist: 'serialist',
  genreExplorer: 'genre_explorer',
  oneMoreEpisode: 'one_more_episode',
  marathon: 'marathon',
  encore: 'encore',
  critic: 'critic',
  wordOfMouth: 'word_of_mouth',
  firstWatch: 'first_watch',
  firstReview: 'first_review',
  seasonComplete: 'season_complete',
} as const;

export const INTRODUCTORY_BADGE_IDS = [
  BADGE_IDS.firstWatch,
  BADGE_IDS.firstReview,
  BADGE_IDS.seasonComplete,
] as const;

export const PROGRESSIVE_BADGE_IDS = [
  BADGE_IDS.cinephile,
  BADGE_IDS.serialist,
  BADGE_IDS.archivist,
  BADGE_IDS.nostalgic,
  BADGE_IDS.genreExplorer,
  BADGE_IDS.oneMoreEpisode,
  BADGE_IDS.marathon,
  BADGE_IDS.encore,
  BADGE_IDS.critic,
  BADGE_IDS.wordOfMouth,
] as const;

export const ALL_BADGE_IDS = [
  ...PROGRESSIVE_BADGE_IDS,
  ...INTRODUCTORY_BADGE_IDS,
] as const;

export const PROFILE_BADGE_ORDER = [
  ...INTRODUCTORY_BADGE_IDS,
  ...PROGRESSIVE_BADGE_IDS,
] as const;

export type IntroductoryBadgeId =
  (typeof INTRODUCTORY_BADGE_IDS)[number];

export function isIntroductoryBadgeId(
  badgeId: string,
): badgeId is IntroductoryBadgeId {
  return (INTRODUCTORY_BADGE_IDS as readonly string[]).includes(badgeId);
}

export const BADGE_LEVEL_KEYS = [
  'bronze',
  'silver',
  'gold',
  'platinum',
] as const;

export type BadgeLevelKey = (typeof BADGE_LEVEL_KEYS)[number];

export function isBadgeLevelKey(
  value: string,
): value is BadgeLevelKey {
  return (BADGE_LEVEL_KEYS as readonly string[]).includes(value);
}
