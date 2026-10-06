import { StyleSheet, View } from 'react-native';

import {
  getBadgeLevelVisual,
  type BadgePatchState,
} from '@/components/badge-level-visuals';
import { ThemedText } from '@/components/themed-text';
import { Brand, Spacing } from '@/constants/theme';
import type { BadgeLevelKey } from '@/services/badges';

export function GenreExplorerBadgePatch({
  levelKey,
  levelName,
  state,
  size = 112,
}: {
  levelKey: BadgeLevelKey;
  levelName: string;
  state: BadgePatchState;
  size?: number;
}) {
  const visual = getBadgeLevelVisual(levelKey, state);
  const locked = state === 'locked';

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={`Esploratore di generi ${levelName}, ${
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
            borderColor: visual.metal,
            backgroundColor: visual.dark,
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
              borderColor: visual.metal,
            },
          ]}>
          <View
            style={[
              styles.compassRing,
              {
                width: size * 0.53,
                height: size * 0.53,
                borderRadius: size * 0.265,
                borderColor: visual.metal,
              },
            ]}>
            <View
              style={[
                styles.axisVertical,
                { backgroundColor: visual.metal },
              ]}
            />
            <View
              style={[
                styles.axisHorizontal,
                { backgroundColor: visual.metal },
              ]}
            />
            <View
              style={[
                styles.needle,
                {
                  borderBottomColor: visual.metal,
                },
              ]}
            />
            <View
              style={[
                styles.needleSouth,
                {
                  borderTopColor: Brand.pureWhite,
                },
              ]}
            />
            <View
              style={[
                styles.compassCenter,
                { backgroundColor: visual.metal },
              ]}
            />
          </View>
          <GenreNode position="top" color={visual.metal} />
          <GenreNode position="right" color={visual.metal} />
          <GenreNode position="bottom" color={visual.metal} />
          <GenreNode position="left" color={visual.metal} />
        </View>
      </View>
      <View
        style={[
          styles.levelPill,
          {
            borderColor: visual.metal,
            backgroundColor: locked ? '#252838' : visual.dark,
          },
        ]}>
        <ThemedText
          type="smallBold"
          style={[styles.levelText, { color: visual.metal }]}>
          {levelName}
        </ThemedText>
      </View>
    </View>
  );
}

function GenreNode({
  position,
  color,
}: {
  position: 'top' | 'right' | 'bottom' | 'left';
  color: string;
}) {
  return (
    <View
      style={[
        styles.genreNode,
        styles[`genreNode${position}`],
        { borderColor: color },
      ]}>
      <View
        style={[
          styles.genreNodeCenter,
          { backgroundColor: color },
        ]}
      />
    </View>
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
  compassRing: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    backgroundColor: 'rgba(4,2,18,0.88)',
  },
  axisVertical: {
    position: 'absolute',
    width: 1,
    height: '82%',
    opacity: 0.55,
  },
  axisHorizontal: {
    position: 'absolute',
    width: '82%',
    height: 1,
    opacity: 0.55,
  },
  needle: {
    position: 'absolute',
    top: '13%',
    width: 0,
    height: 0,
    borderRightWidth: 7,
    borderBottomWidth: 22,
    borderLeftWidth: 7,
    borderRightColor: 'transparent',
    borderLeftColor: 'transparent',
  },
  needleSouth: {
    position: 'absolute',
    bottom: '13%',
    width: 0,
    height: 0,
    borderTopWidth: 22,
    borderRightWidth: 7,
    borderLeftWidth: 7,
    borderRightColor: 'transparent',
    borderLeftColor: 'transparent',
    opacity: 0.72,
  },
  compassCenter: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  genreNode: {
    position: 'absolute',
    width: 12,
    height: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 6,
    backgroundColor: 'rgba(4,2,18,0.9)',
  },
  genreNodetop: {
    top: '10%',
  },
  genreNoderight: {
    right: '10%',
  },
  genreNodebottom: {
    bottom: '10%',
  },
  genreNodeleft: {
    left: '10%',
  },
  genreNodeCenter: {
    width: 4,
    height: 4,
    borderRadius: 2,
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
