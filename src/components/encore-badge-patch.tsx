import { StyleSheet, View } from 'react-native';

import {
  getBadgeLevelVisual,
  type BadgePatchState,
} from '@/components/badge-level-visuals';
import { ThemedText } from '@/components/themed-text';
import { Brand, Spacing } from '@/constants/theme';
import type { BadgeLevelKey } from '@/services/badges';

export function EncoreBadgePatch({
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
      accessibilityLabel={`Encore ${levelName}, ${
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
              styles.topLoop,
              { borderColor: visual.metal },
            ]}
          />
          <View
            style={[
              styles.topArrow,
              { borderLeftColor: visual.metal },
            ]}
          />
          <View
            style={[
              styles.bottomLoop,
              { borderColor: visual.metal },
            ]}
          />
          <View
            style={[
              styles.bottomArrow,
              { borderRightColor: visual.metal },
            ]}
          />
          <View
            style={[
              styles.frame,
              styles.frameBack,
              { borderColor: visual.metal },
            ]}>
            <FilmHoles color={visual.metal} />
          </View>
          <View
            style={[
              styles.frame,
              styles.frameFront,
              { borderColor: visual.metal },
            ]}>
            <FilmHoles color={visual.metal} />
            <View
              style={[
                styles.play,
                { borderLeftColor: visual.metal },
              ]}
            />
          </View>
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

function FilmHoles({ color }: { color: string }) {
  return (
    <>
      <View style={styles.holesTop}>
        {Array.from({ length: 4 }, (_, index) => (
          <View
            key={index}
            style={[styles.hole, { backgroundColor: color }]}
          />
        ))}
      </View>
      <View style={styles.holesBottom}>
        {Array.from({ length: 4 }, (_, index) => (
          <View
            key={index}
            style={[styles.hole, { backgroundColor: color }]}
          />
        ))}
      </View>
    </>
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
  topLoop: {
    position: 'absolute',
    top: 10,
    width: 64,
    height: 35,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderRadius: 32,
  },
  topArrow: {
    position: 'absolute',
    top: 29,
    right: 8,
    width: 0,
    height: 0,
    borderTopWidth: 6,
    borderBottomWidth: 6,
    borderLeftWidth: 10,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  bottomLoop: {
    position: 'absolute',
    bottom: 10,
    width: 64,
    height: 35,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderRadius: 32,
  },
  bottomArrow: {
    position: 'absolute',
    bottom: 29,
    left: 8,
    width: 0,
    height: 0,
    borderTopWidth: 6,
    borderBottomWidth: 6,
    borderRightWidth: 10,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  frame: {
    position: 'absolute',
    width: 43,
    height: 31,
    borderWidth: 2,
    borderRadius: 5,
    backgroundColor: 'rgba(4,2,18,0.94)',
  },
  frameBack: {
    top: 27,
    left: 20,
    opacity: 0.58,
  },
  frameFront: {
    top: 36,
    left: 31,
    alignItems: 'center',
    justifyContent: 'center',
  },
  holesTop: {
    position: 'absolute',
    top: 2,
    left: 3,
    right: 3,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  holesBottom: {
    position: 'absolute',
    right: 3,
    bottom: 2,
    left: 3,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  hole: {
    width: 4,
    height: 3,
    borderRadius: 1,
  },
  play: {
    width: 0,
    height: 0,
    marginLeft: 3,
    borderTopWidth: 6,
    borderBottomWidth: 6,
    borderLeftWidth: 10,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
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
