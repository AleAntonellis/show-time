import { StyleSheet, View } from 'react-native';

import {
  getBadgeLevelVisual,
  type BadgePatchState,
} from '@/components/badge-level-visuals';
import { ThemedText } from '@/components/themed-text';
import { Brand, Spacing } from '@/constants/theme';
import type { BadgeLevelKey } from '@/services/badges';

export function OneMoreEpisodeBadgePatch({
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
      accessibilityLabel={`Ancora un episodio ${levelName}, ${
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
          <EpisodeCard
            color={visual.metal}
            style={styles.cardBack}
            label="03"
          />
          <EpisodeCard
            color={visual.metal}
            style={styles.cardMiddle}
            label="04"
          />
          <EpisodeCard
            color={visual.metal}
            style={styles.cardFront}
            label="05"
            showPlay
          />
          <View style={styles.moreDots}>
            <View
              style={[styles.moreDot, { backgroundColor: visual.metal }]}
            />
            <View
              style={[styles.moreDot, { backgroundColor: visual.metal }]}
            />
            <View
              style={[styles.moreDot, { backgroundColor: visual.metal }]}
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

function EpisodeCard({
  color,
  label,
  showPlay = false,
  style,
}: {
  color: string;
  label: string;
  showPlay?: boolean;
  style: object;
}) {
  return (
    <View style={[styles.episodeCard, style, { borderColor: color }]}>
      <View style={[styles.episodeNumber, { borderColor: color }]}>
        <ThemedText
          type="smallBold"
          style={[styles.episodeNumberText, { color }]}>
          {label}
        </ThemedText>
      </View>
      {showPlay && (
        <View style={[styles.play, { borderLeftColor: color }]} />
      )}
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
    width: '48%',
    height: '37%',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderRadius: 5,
    backgroundColor: 'rgba(4,2,18,0.92)',
  },
  cardBack: {
    top: '18%',
    left: '18%',
    opacity: 0.5,
  },
  cardMiddle: {
    top: '27%',
    left: '27%',
    opacity: 0.72,
  },
  cardFront: {
    top: '36%',
    left: '36%',
  },
  episodeNumber: {
    position: 'absolute',
    top: 4,
    left: 4,
    minWidth: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 3,
  },
  episodeNumberText: {
    fontSize: 8,
    lineHeight: 11,
  },
  play: {
    width: 0,
    height: 0,
    marginTop: 6,
    marginLeft: 4,
    borderTopWidth: 7,
    borderBottomWidth: 7,
    borderLeftWidth: 11,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  moreDots: {
    position: 'absolute',
    bottom: '10%',
    flexDirection: 'row',
    gap: 4,
  },
  moreDot: {
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
