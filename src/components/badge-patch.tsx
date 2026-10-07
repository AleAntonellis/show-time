import { ArchivistBadgePatch } from '@/components/archivist-badge-patch';
import {
  type BadgePatchState,
} from '@/components/badge-level-visuals';
import { CinephileBadgePatch } from '@/components/cinephile-badge-patch';
import { CriticBadgePatch } from '@/components/critic-badge-patch';
import { EncoreBadgePatch } from '@/components/encore-badge-patch';
import { GenreExplorerBadgePatch } from '@/components/genre-explorer-badge-patch';
import { IntroductoryBadgePatch } from '@/components/introductory-badge-patch';
import { MarathonBadgePatch } from '@/components/marathon-badge-patch';
import { NostalgicBadgePatch } from '@/components/nostalgic-badge-patch';
import { OneMoreEpisodeBadgePatch } from '@/components/one-more-episode-badge-patch';
import { SerialistBadgePatch } from '@/components/serialist-badge-patch';
import { WordOfMouthBadgePatch } from '@/components/word-of-mouth-badge-patch';
import {
  BADGE_IDS,
  isIntroductoryBadgeId,
  type BadgeLevelKey,
} from '@/services/badges';

export function BadgePatch({
  badgeId,
  badgeName,
  levelKey,
  levelName,
  state,
  size,
}: {
  badgeId: string;
  badgeName: string;
  levelKey: BadgeLevelKey;
  levelName: string;
  state: BadgePatchState;
  size?: number;
}) {
  if (isIntroductoryBadgeId(badgeId)) {
    return (
      <IntroductoryBadgePatch
        badgeId={badgeId}
        badgeName={badgeName}
        state={state === 'unlocked' ? 'unlocked' : 'locked'}
        size={size}
      />
    );
  }

  const props = { levelKey, levelName, state, size };
  switch (badgeId) {
    case BADGE_IDS.cinephile:
      return <CinephileBadgePatch {...props} />;
    case BADGE_IDS.serialist:
      return <SerialistBadgePatch {...props} />;
    case BADGE_IDS.archivist:
      return <ArchivistBadgePatch {...props} />;
    case BADGE_IDS.nostalgic:
      return <NostalgicBadgePatch {...props} />;
    case BADGE_IDS.genreExplorer:
      return <GenreExplorerBadgePatch {...props} />;
    case BADGE_IDS.oneMoreEpisode:
      return <OneMoreEpisodeBadgePatch {...props} />;
    case BADGE_IDS.marathon:
      return <MarathonBadgePatch {...props} />;
    case BADGE_IDS.encore:
      return <EncoreBadgePatch {...props} />;
    case BADGE_IDS.critic:
      return <CriticBadgePatch {...props} />;
    case BADGE_IDS.wordOfMouth:
      return <WordOfMouthBadgePatch {...props} />;
    default:
      return null;
  }
}
