import { StyleSheet, View } from 'react-native';

import {
  getBadgeLevelVisual,
  type BadgePatchState,
} from '@/components/badge-level-visuals';
import { ThemedText } from '@/components/themed-text';
import { Brand, Spacing } from '@/constants/theme';
import type { BadgeLevelKey } from '@/services/badges';

export function WordOfMouthBadgePatch({
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
      accessibilityLabel={`Passaparola ${levelName}, ${
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
              styles.senderBubble,
              { borderColor: visual.metal },
            ]}>
            <View
              style={[
                styles.play,
                { borderLeftColor: visual.metal },
              ]}
            />
          </View>
          <View
            style={[
              styles.senderTail,
              { borderTopColor: visual.metal },
            ]}
          />
          <View
            style={[
              styles.shareLine,
              { backgroundColor: visual.metal },
            ]}
          />
          <View
            style={[
              styles.shareArrow,
              { borderLeftColor: visual.metal },
            ]}
          />
          <View
            style={[
              styles.readerBubble,
              { borderColor: visual.metal },
            ]}>
            <View
              style={[
                styles.checkShort,
                { backgroundColor: visual.metal },
              ]}
            />
            <View
              style={[
                styles.checkLong,
                { backgroundColor: visual.metal },
              ]}
            />
          </View>
          <View
            style={[
              styles.readerTail,
              { borderTopColor: visual.metal },
            ]}
          />
          <View style={styles.signalDots}>
            {Array.from({ length: 3 }, (_, index) => (
              <View
                key={index}
                style={[
                  styles.signalDot,
                  { backgroundColor: visual.metal },
                ]}
              />
            ))}
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
  senderBubble: {
    position: 'absolute',
    top: 18,
    left: 9,
    width: 38,
    height: 31,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderRadius: 8,
    backgroundColor: 'rgba(4,2,18,0.92)',
  },
  senderTail: {
    position: 'absolute',
    top: 45,
    left: 18,
    width: 0,
    height: 0,
    borderRightWidth: 7,
    borderLeftWidth: 0,
    borderTopWidth: 8,
    borderRightColor: 'transparent',
  },
  play: {
    width: 0,
    height: 0,
    marginLeft: 3,
    borderTopWidth: 7,
    borderBottomWidth: 7,
    borderLeftWidth: 11,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  shareLine: {
    position: 'absolute',
    top: 43,
    left: 39,
    width: 18,
    height: 3,
    borderRadius: 2,
  },
  shareArrow: {
    position: 'absolute',
    top: 37,
    left: 54,
    width: 0,
    height: 0,
    borderTopWidth: 7,
    borderBottomWidth: 7,
    borderLeftWidth: 10,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  readerBubble: {
    position: 'absolute',
    right: 8,
    bottom: 16,
    width: 38,
    height: 31,
    borderWidth: 2,
    borderRadius: 8,
    backgroundColor: 'rgba(4,2,18,0.92)',
  },
  readerTail: {
    position: 'absolute',
    right: 17,
    bottom: 10,
    width: 0,
    height: 0,
    borderRightWidth: 0,
    borderLeftWidth: 7,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
  },
  checkShort: {
    position: 'absolute',
    top: 15,
    left: 8,
    width: 10,
    height: 3,
    borderRadius: 2,
    transform: [{ rotate: '42deg' }],
  },
  checkLong: {
    position: 'absolute',
    top: 12,
    left: 14,
    width: 17,
    height: 3,
    borderRadius: 2,
    transform: [{ rotate: '-48deg' }],
  },
  signalDots: {
    position: 'absolute',
    bottom: 10,
    left: 17,
    flexDirection: 'row',
    gap: 4,
  },
  signalDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
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
