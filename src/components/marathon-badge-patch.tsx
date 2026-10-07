import { StyleSheet, View } from 'react-native';

import {
  getBadgeLevelVisual,
  type BadgePatchState,
} from '@/components/badge-level-visuals';
import { ThemedText } from '@/components/themed-text';
import { Brand, Spacing } from '@/constants/theme';
import type { BadgeLevelKey } from '@/services/badges';

export function MarathonBadgePatch({
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
      accessibilityLabel={`Maratoneta ${levelName}, ${
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
              styles.stopwatchCrown,
              { borderColor: visual.metal },
            ]}
          />
          <View
            style={[
              styles.stopwatchStem,
              { backgroundColor: visual.metal },
            ]}
          />
          <View
            style={[
              styles.stopwatchFace,
              { borderColor: visual.metal },
            ]}>
            <View
              style={[
                styles.stopwatchHand,
                { backgroundColor: visual.metal },
              ]}
            />
            <View
              style={[
                styles.stopwatchCenter,
                { backgroundColor: visual.metal },
              ]}
            />
            <ThemedText
              type="smallBold"
              style={[styles.episodeCount, { color: visual.metal }]}>
              8+
            </ThemedText>
          </View>
          <View style={styles.dayTrack}>
            {Array.from({ length: 8 }, (_, index) => (
              <View
                key={index}
                style={[
                  styles.episodeDot,
                  { backgroundColor: visual.metal },
                  index === 4 && styles.secondDay,
                ]}
              />
            ))}
          </View>
          <View
            style={[
              styles.finishLine,
              { borderColor: visual.metal },
            ]}
          />
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
  stopwatchCrown: {
    position: 'absolute',
    top: 9,
    width: 15,
    height: 7,
    borderWidth: 2,
    borderRadius: 3,
  },
  stopwatchStem: {
    position: 'absolute',
    top: 15,
    width: 3,
    height: 7,
  },
  stopwatchFace: {
    position: 'absolute',
    top: 20,
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderRadius: 24,
  },
  stopwatchHand: {
    position: 'absolute',
    top: 8,
    width: 2,
    height: 14,
    transform: [{ rotate: '32deg' }],
    transformOrigin: 'bottom',
  },
  stopwatchCenter: {
    position: 'absolute',
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  episodeCount: {
    marginTop: 17,
    fontSize: 10,
    lineHeight: 12,
  },
  dayTrack: {
    position: 'absolute',
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  episodeDot: {
    width: 5,
    height: 5,
    borderRadius: 2,
  },
  secondDay: {
    marginLeft: 5,
  },
  finishLine: {
    position: 'absolute',
    right: 8,
    bottom: 7,
    width: 9,
    height: 15,
    borderLeftWidth: 2,
    borderTopWidth: 2,
    borderStyle: 'dashed',
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
