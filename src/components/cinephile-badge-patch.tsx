import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Brand, Spacing } from '@/constants/theme';
import type { BadgeLevelKey } from '@/services/badges';

type PatchState = 'locked' | 'next' | 'unlocked';

const LEVEL_VISUALS: Record<
  BadgeLevelKey,
  { metal: string; dark: string; glow: string }
> = {
  bronze: {
    metal: '#C37A4A',
    dark: '#704127',
    glow: 'rgba(195,122,74,0.34)',
  },
  silver: {
    metal: '#D6DBE5',
    dark: '#788196',
    glow: 'rgba(214,219,229,0.28)',
  },
  gold: {
    metal: '#FFD35A',
    dark: '#9B6F15',
    glow: 'rgba(255,211,90,0.34)',
  },
  platinum: {
    metal: '#A8E9FF',
    dark: '#4E88A3',
    glow: 'rgba(168,233,255,0.34)',
  },
};

export function CinephileBadgePatch({
  levelKey,
  levelName,
  state,
  size = 112,
}: {
  levelKey: BadgeLevelKey;
  levelName: string;
  state: PatchState;
  size?: number;
}) {
  const visual = LEVEL_VISUALS[levelKey];
  const locked = state === 'locked';
  const metal = locked ? '#555A6C' : visual.metal;
  const dark = locked ? '#303445' : visual.dark;

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={`Cinefilo ${levelName}, ${
        state === 'unlocked'
          ? 'sbloccato'
          : state === 'next'
            ? 'prossimo livello'
            : 'bloccato'
      }`}
      style={styles.wrapper}>
      <View
        style={[
          styles.glow,
          {
            width: size + 14,
            height: size + 14,
            borderRadius: (size + 14) / 2,
            backgroundColor:
              state === 'next' ? Brand.softViolet : visual.glow,
            opacity: locked ? 0.18 : state === 'next' ? 0.34 : 0.24,
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
            borderColor: metal,
            backgroundColor: dark,
            opacity: locked ? 0.58 : 1,
          },
          state === 'next' && styles.patchNext,
        ]}>
        <View
          style={[
            styles.innerRing,
            {
              width: size - 18,
              height: size - 18,
              borderRadius: (size - 18) / 2,
              borderColor: metal,
            },
          ]}>
          <View
            style={[
              styles.reel,
              {
                width: size * 0.46,
                height: size * 0.46,
                borderRadius: size * 0.23,
                borderColor: metal,
              },
            ]}>
            <View
              style={[
                styles.reelCenter,
                {
                  width: size * 0.08,
                  height: size * 0.08,
                  borderRadius: size * 0.04,
                  backgroundColor: metal,
                },
              ]}
            />
            <ReelHole top="13%" left="38%" color={metal} size={size} />
            <ReelHole top="38%" left="13%" color={metal} size={size} />
            <ReelHole top="38%" right="13%" color={metal} size={size} />
            <ReelHole bottom="13%" left="38%" color={metal} size={size} />
          </View>
          <View
            style={[
              styles.filmStrip,
              {
                width: size * 0.54,
                height: size * 0.13,
                borderColor: metal,
              },
            ]}>
            <View style={[styles.filmFrame, { borderColor: metal }]} />
            <View style={[styles.filmFrame, { borderColor: metal }]} />
            <View style={[styles.filmFrame, { borderColor: metal }]} />
          </View>
          <View style={styles.spark}>
            <View
              style={[
                styles.sparkVertical,
                { backgroundColor: Brand.pureWhite },
              ]}
            />
            <View
              style={[
                styles.sparkHorizontal,
                { backgroundColor: Brand.pureWhite },
              ]}
            />
          </View>
        </View>
      </View>
      <View
        style={[
          styles.levelPill,
          {
            borderColor: metal,
            backgroundColor: locked ? '#252838' : dark,
          },
        ]}>
        <ThemedText
          type="smallBold"
          style={[styles.levelText, { color: metal }]}>
          {levelName}
        </ThemedText>
      </View>
    </View>
  );
}

function ReelHole({
  top,
  left,
  right,
  bottom,
  color,
  size,
}: {
  top?: `${number}%`;
  left?: `${number}%`;
  right?: `${number}%`;
  bottom?: `${number}%`;
  color: string;
  size: number;
}) {
  return (
    <View
      style={[
        styles.reelHole,
        {
          top,
          left,
          right,
          bottom,
          width: size * 0.09,
          height: size * 0.09,
          borderRadius: size * 0.045,
          borderColor: color,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  glow: {
    position: 'absolute',
    top: -7,
  },
  patch: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
  },
  patchNext: {
    borderColor: Brand.softViolet,
    boxShadow: '0 0 20px rgba(106,76,255,0.52)',
  },
  innerRing: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    backgroundColor: 'rgba(4,2,18,0.72)',
  },
  reel: {
    position: 'absolute',
    top: '18%',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
  },
  reelCenter: {
    position: 'absolute',
  },
  reelHole: {
    position: 'absolute',
    borderWidth: 2,
    backgroundColor: 'rgba(4,2,18,0.78)',
  },
  filmStrip: {
    position: 'absolute',
    bottom: '17%',
    flexDirection: 'row',
    borderWidth: 2,
    transform: [{ rotate: '-7deg' }],
    backgroundColor: 'rgba(4,2,18,0.82)',
  },
  filmFrame: {
    flex: 1,
    borderRightWidth: 1,
  },
  spark: {
    position: 'absolute',
    top: '19%',
    right: '17%',
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sparkVertical: {
    position: 'absolute',
    width: 2,
    height: 16,
    borderRadius: 1,
  },
  sparkHorizontal: {
    position: 'absolute',
    width: 16,
    height: 2,
    borderRadius: 1,
  },
  levelPill: {
    minWidth: 82,
    alignItems: 'center',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderWidth: 1,
    borderRadius: Spacing.three,
  },
  levelText: {
    textAlign: 'center',
  },
});
