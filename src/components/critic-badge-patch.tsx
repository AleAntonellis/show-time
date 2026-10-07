import { StyleSheet, View } from 'react-native';

import {
  getBadgeLevelVisual,
  type BadgePatchState,
} from '@/components/badge-level-visuals';
import { ThemedText } from '@/components/themed-text';
import { Brand, Spacing } from '@/constants/theme';
import type { BadgeLevelKey } from '@/services/badges';

export function CriticBadgePatch({
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
      accessibilityLabel={`Critico ${levelName}, ${
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
              styles.reviewCard,
              { borderColor: visual.metal },
            ]}>
            <View style={styles.filmHoles}>
              {Array.from({ length: 5 }, (_, index) => (
                <View
                  key={index}
                  style={[
                    styles.filmHole,
                    { backgroundColor: visual.metal },
                  ]}
                />
              ))}
            </View>
            <View
              style={[
                styles.quoteMark,
                styles.quoteLeft,
                { borderColor: visual.metal },
              ]}
            />
            <View
              style={[
                styles.quoteMark,
                styles.quoteRight,
                { borderColor: visual.metal },
              ]}
            />
            <View
              style={[
                styles.reviewLine,
                styles.lineOne,
                { backgroundColor: visual.metal },
              ]}
            />
            <View
              style={[
                styles.reviewLine,
                styles.lineTwo,
                { backgroundColor: visual.metal },
              ]}
            />
            <View
              style={[
                styles.reviewLine,
                styles.lineThree,
                { backgroundColor: visual.metal },
              ]}
            />
          </View>
          <View
            style={[
              styles.penBody,
              { backgroundColor: visual.metal },
            ]}
          />
          <View
            style={[
              styles.penNib,
              { borderTopColor: visual.metal },
            ]}
          />
          <View
            style={[
              styles.penSlit,
              { backgroundColor: visual.dark },
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
  reviewCard: {
    position: 'absolute',
    top: 18,
    left: 17,
    width: 57,
    height: 55,
    borderWidth: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(4,2,18,0.92)',
  },
  filmHoles: {
    position: 'absolute',
    top: 4,
    right: 5,
    left: 5,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  filmHole: {
    width: 5,
    height: 3,
    borderRadius: 1,
  },
  quoteMark: {
    position: 'absolute',
    top: 14,
    width: 8,
    height: 8,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
  },
  quoteLeft: {
    left: 8,
  },
  quoteRight: {
    left: 20,
  },
  reviewLine: {
    position: 'absolute',
    left: 8,
    height: 2,
    borderRadius: 1,
    opacity: 0.74,
  },
  lineOne: {
    top: 31,
    width: 38,
  },
  lineTwo: {
    top: 38,
    width: 32,
  },
  lineThree: {
    top: 45,
    width: 25,
  },
  penBody: {
    position: 'absolute',
    right: 17,
    bottom: 15,
    width: 8,
    height: 48,
    borderRadius: 3,
    transform: [{ rotate: '38deg' }],
  },
  penNib: {
    position: 'absolute',
    right: 10,
    bottom: 9,
    width: 0,
    height: 0,
    borderRightWidth: 7,
    borderLeftWidth: 7,
    borderTopWidth: 14,
    borderRightColor: 'transparent',
    borderLeftColor: 'transparent',
    transform: [{ rotate: '38deg' }],
  },
  penSlit: {
    position: 'absolute',
    right: 16,
    bottom: 13,
    width: 2,
    height: 7,
    transform: [{ rotate: '38deg' }],
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
