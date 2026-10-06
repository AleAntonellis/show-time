import { StyleSheet, View } from 'react-native';

import {
  getBadgeLevelVisual,
  type BadgePatchState,
} from '@/components/badge-level-visuals';
import { ThemedText } from '@/components/themed-text';
import { Brand, Spacing } from '@/constants/theme';
import type { BadgeLevelKey } from '@/services/badges';

export function ArchivistBadgePatch({
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
      accessibilityLabel={`Archivista ${levelName}, ${
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
          <View style={styles.indexCards}>
            <View
              style={[
                styles.indexCard,
                styles.indexCardLeft,
                { borderColor: visual.metal },
              ]}
            />
            <View
              style={[
                styles.indexCard,
                styles.indexCardRight,
                { borderColor: visual.metal },
              ]}
            />
          </View>
          <View
            style={[
              styles.cabinet,
              {
                width: size * 0.48,
                height: size * 0.52,
                borderColor: visual.metal,
              },
            ]}>
            <ArchiveDrawer color={visual.metal} />
            <ArchiveDrawer color={visual.metal} />
            <ArchiveDrawer color={visual.metal} last />
          </View>
          <View
            style={[
              styles.cabinetFeet,
              {
                width: size * 0.38,
                borderColor: visual.metal,
              },
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

function ArchiveDrawer({
  color,
  last = false,
}: {
  color: string;
  last?: boolean;
}) {
  return (
    <View
      style={[
        styles.drawer,
        !last && { borderBottomColor: color, borderBottomWidth: 2 },
      ]}>
      <View style={[styles.drawerLabel, { borderColor: color }]} />
      <View style={[styles.drawerHandle, { backgroundColor: color }]} />
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
  indexCards: {
    position: 'absolute',
    top: '16%',
    width: '48%',
    height: '22%',
  },
  indexCard: {
    position: 'absolute',
    width: '66%',
    height: '100%',
    borderWidth: 2,
    borderRadius: 3,
    backgroundColor: 'rgba(4,2,18,0.9)',
  },
  indexCardLeft: {
    left: 0,
    transform: [{ rotate: '-8deg' }],
  },
  indexCardRight: {
    right: 0,
    transform: [{ rotate: '8deg' }],
  },
  cabinet: {
    overflow: 'hidden',
    borderWidth: 3,
    borderRadius: 5,
    backgroundColor: 'rgba(4,2,18,0.9)',
  },
  drawer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerLabel: {
    position: 'absolute',
    left: '17%',
    width: '28%',
    height: '34%',
    borderWidth: 1,
    borderRadius: 2,
  },
  drawerHandle: {
    position: 'absolute',
    right: '17%',
    width: '22%',
    height: 3,
    borderRadius: 2,
  },
  cabinetFeet: {
    position: 'absolute',
    bottom: '15%',
    height: 5,
    borderRightWidth: 4,
    borderLeftWidth: 4,
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
