import { StyleSheet, View } from 'react-native';

import {
  getBadgeLevelVisual,
  type BadgePatchState,
} from '@/components/badge-level-visuals';
import { ThemedText } from '@/components/themed-text';
import { Brand, Spacing } from '@/constants/theme';
import type { BadgeLevelKey } from '@/services/badges';

export function NostalgicBadgePatch({
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
      accessibilityLabel={`Nostalgico ${levelName}, ${
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
          <View style={styles.antenna}>
            <View
              style={[
                styles.antennaLeft,
                { backgroundColor: visual.metal },
              ]}
            />
            <View
              style={[
                styles.antennaRight,
                { backgroundColor: visual.metal },
              ]}
            />
            <View
              style={[
                styles.antennaJoint,
                { backgroundColor: visual.metal },
              ]}
            />
          </View>
          <View
            style={[
              styles.television,
              {
                width: size * 0.58,
                height: size * 0.43,
                borderColor: visual.metal,
              },
            ]}>
            <View
              style={[
                styles.screen,
                { borderColor: visual.metal },
              ]}>
              <View
                style={[
                  styles.scanLine,
                  styles.scanLineTop,
                  { backgroundColor: visual.metal },
                ]}
              />
              <View
                style={[
                  styles.scanLine,
                  { backgroundColor: visual.metal },
                ]}
              />
              <View
                style={[
                  styles.scanLine,
                  styles.scanLineBottom,
                  { backgroundColor: visual.metal },
                ]}
              />
            </View>
            <View style={styles.controls}>
              <View
                style={[
                  styles.knob,
                  { borderColor: visual.metal },
                ]}
              />
              <View
                style={[
                  styles.knob,
                  { borderColor: visual.metal },
                ]}
              />
              <View style={styles.speaker}>
                <View
                  style={[
                    styles.speakerLine,
                    { backgroundColor: visual.metal },
                  ]}
                />
                <View
                  style={[
                    styles.speakerLine,
                    { backgroundColor: visual.metal },
                  ]}
                />
                <View
                  style={[
                    styles.speakerLine,
                    { backgroundColor: visual.metal },
                  ]}
                />
              </View>
            </View>
          </View>
          <View style={styles.feet}>
            <View
              style={[
                styles.foot,
                { backgroundColor: visual.metal },
              ]}
            />
            <View
              style={[
                styles.foot,
                { backgroundColor: visual.metal },
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
  antenna: {
    position: 'absolute',
    top: '13%',
    width: '40%',
    height: '22%',
  },
  antennaLeft: {
    position: 'absolute',
    bottom: 0,
    left: '24%',
    width: 2,
    height: '100%',
    borderRadius: 1,
    transform: [{ rotate: '-36deg' }],
  },
  antennaRight: {
    position: 'absolute',
    right: '24%',
    bottom: 0,
    width: 2,
    height: '100%',
    borderRadius: 1,
    transform: [{ rotate: '36deg' }],
  },
  antennaJoint: {
    position: 'absolute',
    bottom: -2,
    left: '45%',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  television: {
    marginTop: '13%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 5,
    borderWidth: 3,
    borderRadius: 9,
    backgroundColor: 'rgba(4,2,18,0.9)',
  },
  screen: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.025)',
  },
  scanLine: {
    width: '62%',
    height: 2,
    borderRadius: 1,
    opacity: 0.75,
  },
  scanLineTop: {
    position: 'absolute',
    top: '27%',
    width: '48%',
  },
  scanLineBottom: {
    position: 'absolute',
    bottom: '27%',
    width: '48%',
  },
  controls: {
    width: '20%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 2,
  },
  knob: {
    width: 8,
    height: 8,
    borderWidth: 2,
    borderRadius: 4,
  },
  speaker: {
    gap: 2,
  },
  speakerLine: {
    width: 9,
    height: 1,
    borderRadius: 1,
  },
  feet: {
    position: 'absolute',
    bottom: '17%',
    width: '43%',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  foot: {
    width: 12,
    height: 3,
    borderRadius: 2,
    transform: [{ rotate: '-8deg' }],
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
