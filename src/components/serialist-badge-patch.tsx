import { StyleSheet, View } from 'react-native';

import {
  getBadgeLevelVisual,
  type BadgePatchState,
} from '@/components/badge-level-visuals';
import { ThemedText } from '@/components/themed-text';
import { Brand, Spacing } from '@/constants/theme';
import type { BadgeLevelKey } from '@/services/badges';

export function SerialistBadgePatch({
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
      accessibilityLabel={`Serialista ${levelName}, ${
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
              styles.episodeCard,
              styles.episodeCardBackLeft,
              { borderColor: visual.metal },
            ]}
          />
          <View
            style={[
              styles.episodeCard,
              styles.episodeCardBackRight,
              { borderColor: visual.metal },
            ]}
          />
          <View
            style={[
              styles.episodeCard,
              styles.episodeCardFront,
              { borderColor: visual.metal },
            ]}>
            <View style={styles.seasonTabs}>
              <View
                style={[
                  styles.seasonTab,
                  { backgroundColor: visual.metal },
                ]}
              />
              <View
                style={[
                  styles.seasonTab,
                  { backgroundColor: visual.metal },
                ]}
              />
              <View
                style={[
                  styles.seasonTab,
                  { backgroundColor: visual.metal },
                ]}
              />
            </View>
            <View
              style={[
                styles.play,
                { borderLeftColor: visual.metal },
              ]}
            />
            <View style={styles.episodeDots}>
              <View
                style={[
                  styles.episodeDot,
                  { backgroundColor: visual.metal },
                ]}
              />
              <View
                style={[
                  styles.episodeDot,
                  { backgroundColor: visual.metal },
                ]}
              />
              <View
                style={[
                  styles.episodeDot,
                  { backgroundColor: visual.metal },
                ]}
              />
              <View
                style={[
                  styles.episodeDot,
                  { backgroundColor: visual.metal },
                ]}
              />
            </View>
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
  episodeCard: {
    position: 'absolute',
    width: '49%',
    height: '50%',
    borderWidth: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(4,2,18,0.9)',
  },
  episodeCardBackLeft: {
    transform: [{ translateX: -8 }, { translateY: -6 }, { rotate: '-7deg' }],
    opacity: 0.55,
  },
  episodeCardBackRight: {
    transform: [{ translateX: 8 }, { translateY: -3 }, { rotate: '7deg' }],
    opacity: 0.72,
  },
  episodeCardFront: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 7,
  },
  seasonTabs: {
    position: 'absolute',
    top: 6,
    flexDirection: 'row',
    gap: 4,
  },
  seasonTab: {
    width: 8,
    height: 2,
    borderRadius: 1,
  },
  play: {
    width: 0,
    height: 0,
    marginLeft: 4,
    borderTopWidth: 9,
    borderBottomWidth: 9,
    borderLeftWidth: 14,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  episodeDots: {
    position: 'absolute',
    bottom: 7,
    flexDirection: 'row',
    gap: 4,
  },
  episodeDot: {
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
