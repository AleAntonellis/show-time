import assert from 'node:assert/strict';
import test from 'node:test';

import type { FollowedProfileTrophy } from '../../src/services/follower-profile';
import {
  sortProfileTrophies,
  visibleProfileTrophies,
} from '../../src/utils/profile-trophies';

function trophy({
  badgeId,
  badgeName,
  level,
  levelKey,
}: Pick<
  FollowedProfileTrophy,
  'badgeId' | 'badgeName' | 'level' | 'levelKey'
>): FollowedProfileTrophy {
  return {
    badgeId,
    badgeName,
    badgeDescription: badgeName,
    level,
    levelKey,
    levelName: levelKey,
    unlockedAt: '2026-10-07T10:00:00.000Z',
  };
}

test('i trofei profilo ordinano metalli e poi badge introduttivi', () => {
  const sorted = sortProfileTrophies([
    trophy({
      badgeId: 'first_watch',
      badgeName: 'Primo ciak',
      level: 1,
      levelKey: 'bronze',
    }),
    trophy({
      badgeId: 'serialist',
      badgeName: 'Serialista',
      level: 1,
      levelKey: 'bronze',
    }),
    trophy({
      badgeId: 'cinephile',
      badgeName: 'Cinefilo',
      level: 2,
      levelKey: 'silver',
    }),
    trophy({
      badgeId: 'genre_explorer',
      badgeName: 'Esploratore di generi',
      level: 4,
      levelKey: 'platinum',
    }),
    trophy({
      badgeId: 'marathon',
      badgeName: 'Maratoneta',
      level: 3,
      levelKey: 'gold',
    }),
    trophy({
      badgeId: 'critic',
      badgeName: 'Critico',
      level: 1,
      levelKey: 'bronze',
    }),
  ]);

  assert.deepEqual(
    sorted.map((item) => item.badgeId),
    [
      'genre_explorer',
      'marathon',
      'cinephile',
      'serialist',
      'critic',
      'first_watch',
    ],
  );
});

test('i trofei profilo mostrano sei elementi finché non vengono espansi', () => {
  const trophies = Array.from({ length: 9 }, (_, index) =>
    trophy({
      badgeId: `badge-${index + 1}`,
      badgeName: `Badge ${index + 1}`,
      level: 1,
      levelKey: 'bronze',
    }),
  );

  assert.equal(visibleProfileTrophies(trophies, false).length, 6);
  assert.equal(visibleProfileTrophies(trophies, true).length, 9);
  assert.deepEqual(trophies.map((item) => item.badgeId), [
    'badge-1',
    'badge-2',
    'badge-3',
    'badge-4',
    'badge-5',
    'badge-6',
    'badge-7',
    'badge-8',
    'badge-9',
  ]);
});
