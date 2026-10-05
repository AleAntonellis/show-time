import { StyleSheet, View } from 'react-native';

import { Brand } from '@/constants/theme';
import type { IntroductoryBadgeId } from '@/services/badges';

type PatchState = 'locked' | 'unlocked';

const BADGE_VISUALS: Record<
  IntroductoryBadgeId,
  { accent: string; dark: string; glow: string }
> = {
  first_watch: {
    accent: Brand.sunsetOrange,
    dark: '#6A2F1F',
    glow: 'rgba(255,106,44,0.34)',
  },
  first_review: {
    accent: '#7FB2FF',
    dark: '#243D72',
    glow: 'rgba(47,107,255,0.34)',
  },
  season_complete: {
    accent: '#C5A7FF',
    dark: '#49327A',
    glow: 'rgba(106,76,255,0.38)',
  },
};

export function IntroductoryBadgePatch({
  badgeId,
  badgeName,
  state,
  size = 96,
}: {
  badgeId: IntroductoryBadgeId;
  badgeName: string;
  state: PatchState;
  size?: number;
}) {
  const visual = BADGE_VISUALS[badgeId];
  const locked = state === 'locked';
  const accent = locked ? '#62677A' : visual.accent;
  const dark = locked ? '#2D3141' : visual.dark;

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={`${badgeName}, ${
        locked ? 'bloccato' : 'sbloccato'
      }`}
      style={styles.wrapper}>
      <View
        style={[
          styles.glow,
          {
            width: size + 14,
            height: size + 14,
            borderRadius: (size + 14) / 2,
            backgroundColor: visual.glow,
            opacity: locked ? 0.12 : 0.3,
          },
        ]}
      />
      <View
        style={[
          styles.patch,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: accent,
            backgroundColor: dark,
            opacity: locked ? 0.58 : 1,
          },
        ]}>
        <View
          style={[
            styles.innerRing,
            {
              width: size - 16,
              height: size - 16,
              borderRadius: (size - 16) / 2,
              borderColor: accent,
            },
          ]}>
          <BadgeSymbol badgeId={badgeId} accent={accent} />
        </View>
      </View>
    </View>
  );
}

function BadgeSymbol({
  badgeId,
  accent,
}: {
  badgeId: IntroductoryBadgeId;
  accent: string;
}) {
  if (badgeId === 'first_watch') {
    return (
      <View style={styles.clapper}>
        <View style={[styles.clapperTop, { borderColor: accent }]}>
          <View style={[styles.clapperStripe, { backgroundColor: accent }]} />
          <View style={[styles.clapperStripe, { backgroundColor: accent }]} />
          <View style={[styles.clapperStripe, { backgroundColor: accent }]} />
        </View>
        <View style={[styles.clapperBody, { borderColor: accent }]}>
          <View
            style={[
              styles.play,
              {
                borderLeftColor: accent,
              },
            ]}
          />
        </View>
      </View>
    );
  }

  if (badgeId === 'first_review') {
    return (
      <View style={styles.reviewSymbol}>
        <View style={[styles.reviewCard, { borderColor: accent }]}>
          <View style={[styles.reviewLineWide, { backgroundColor: accent }]} />
          <View style={[styles.reviewLine, { backgroundColor: accent }]} />
          <View style={[styles.reviewLine, { backgroundColor: accent }]} />
        </View>
        <View style={[styles.pencil, { backgroundColor: accent }]}>
          <View
            style={[styles.pencilTip, { borderTopColor: Brand.pureWhite }]}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.seasonSymbol}>
      <View
        style={[
          styles.seasonCardBack,
          { borderColor: accent },
        ]}
      />
      <View style={[styles.seasonCard, { borderColor: accent }]}>
        <View style={[styles.episodeLine, { backgroundColor: accent }]} />
        <View style={[styles.episodeLine, { backgroundColor: accent }]} />
        <View style={[styles.episodeLine, { backgroundColor: accent }]} />
      </View>
      <View style={[styles.check, { borderColor: Brand.pureWhite }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
  },
  patch: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
  },
  innerRing: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    backgroundColor: 'rgba(4,2,18,0.72)',
  },
  clapper: {
    width: 50,
    height: 46,
    justifyContent: 'flex-end',
  },
  clapperTop: {
    position: 'absolute',
    top: 1,
    left: 0,
    width: 50,
    height: 13,
    overflow: 'hidden',
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderWidth: 2,
    transform: [{ rotate: '-7deg' }],
    backgroundColor: 'rgba(4,2,18,0.9)',
  },
  clapperStripe: {
    width: 5,
    height: 18,
    transform: [{ rotate: '28deg' }],
  },
  clapperBody: {
    width: 50,
    height: 33,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderRadius: 3,
    backgroundColor: 'rgba(4,2,18,0.88)',
  },
  play: {
    width: 0,
    height: 0,
    marginLeft: 4,
    borderTopWidth: 8,
    borderBottomWidth: 8,
    borderLeftWidth: 13,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  reviewSymbol: {
    width: 52,
    height: 52,
  },
  reviewCard: {
    position: 'absolute',
    top: 3,
    left: 3,
    width: 42,
    height: 46,
    gap: 6,
    paddingHorizontal: 8,
    paddingTop: 10,
    borderWidth: 2,
    borderRadius: 5,
    backgroundColor: 'rgba(4,2,18,0.88)',
  },
  reviewLineWide: {
    width: 24,
    height: 3,
    borderRadius: 2,
  },
  reviewLine: {
    width: 18,
    height: 3,
    borderRadius: 2,
  },
  pencil: {
    position: 'absolute',
    right: 1,
    bottom: 4,
    width: 7,
    height: 29,
    borderRadius: 3,
    transform: [{ rotate: '38deg' }],
  },
  pencilTip: {
    position: 'absolute',
    bottom: -6,
    left: 0,
    width: 0,
    height: 0,
    borderRightWidth: 3.5,
    borderLeftWidth: 3.5,
    borderTopWidth: 7,
    borderRightColor: 'transparent',
    borderLeftColor: 'transparent',
  },
  seasonSymbol: {
    width: 56,
    height: 52,
  },
  seasonCardBack: {
    position: 'absolute',
    top: 1,
    left: 8,
    width: 42,
    height: 42,
    borderWidth: 2,
    borderRadius: 6,
    opacity: 0.5,
    transform: [{ rotate: '7deg' }],
  },
  seasonCard: {
    position: 'absolute',
    top: 6,
    left: 2,
    width: 43,
    height: 42,
    gap: 6,
    paddingHorizontal: 8,
    paddingTop: 9,
    borderWidth: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(4,2,18,0.9)',
  },
  episodeLine: {
    width: 24,
    height: 3,
    borderRadius: 2,
  },
  check: {
    position: 'absolute',
    right: 0,
    bottom: 6,
    width: 19,
    height: 11,
    borderLeftWidth: 3,
    borderBottomWidth: 3,
    transform: [{ rotate: '-45deg' }],
  },
});
