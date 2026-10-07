import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { BadgePatch } from '@/components/badge-patch';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, Spacing } from '@/constants/theme';
import type { FollowedProfileTrophy } from '@/services/follower-profile';
import {
  COLLAPSED_PROFILE_TROPHY_LIMIT,
  visibleProfileTrophies,
} from '@/utils/profile-trophies';

export function ProfileTrophyGrid({
  trophies,
  warning,
}: {
  trophies: FollowedProfileTrophy[];
  warning: string | null;
}) {
  const [expanded, setExpanded] = useState(false);

  const canExpand =
    trophies.length > COLLAPSED_PROFILE_TROPHY_LIMIT;
  const visibleTrophies = visibleProfileTrophies(
    trophies,
    expanded,
  );

  return (
    <ThemedView type="backgroundElement" style={styles.section}>
      <View style={styles.heading}>
        <View style={styles.headingCopy}>
          <ThemedText type="subtitle" style={styles.title}>
            Trofei
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Il livello più alto raggiunto per ogni traguardo.
          </ThemedText>
        </View>
        <View style={styles.count}>
          <ThemedText type="smallBold" style={styles.countText}>
            {trophies.length}
          </ThemedText>
        </View>
      </View>

      {warning ? (
        <ThemedText type="small" style={styles.warning}>
          {warning}
        </ThemedText>
      ) : trophies.length === 0 ? (
        <ThemedText
          type="small"
          themeColor="textSecondary"
          style={styles.empty}>
          Nessun trofeo sbloccato.
        </ThemedText>
      ) : (
        <View style={styles.grid}>
          {visibleTrophies.map((trophy) => (
            <View key={trophy.badgeId} style={styles.item}>
              <BadgePatch
                badgeId={trophy.badgeId}
                badgeName={trophy.badgeName}
                levelKey={trophy.levelKey}
                levelName={trophy.levelName}
                state="unlocked"
                size={76}
              />
              <ThemedText
                type="smallBold"
                numberOfLines={2}
                style={styles.badgeName}>
                {trophy.badgeName}
              </ThemedText>
            </View>
          ))}
        </View>
      )}
      {!warning && canExpand && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            expanded
              ? 'Mostra meno trofei'
              : `Mostra tutti i ${trophies.length} trofei`
          }
          onPress={() => setExpanded((current) => !current)}
          style={({ pressed }) => [
            styles.toggle,
            pressed && styles.togglePressed,
          ]}>
          <ThemedText type="smallBold" style={styles.toggleText}>
            {expanded
              ? 'Mostra meno'
              : `Mostra tutti · ${trophies.length}`}
          </ThemedText>
        </Pressable>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.four,
  },
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  headingCopy: {
    flex: 1,
    minWidth: 0,
    gap: Spacing.half,
  },
  title: {
    fontSize: 24,
    lineHeight: 30,
  },
  count: {
    minWidth: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: 'rgba(106,76,255,0.2)',
  },
  countText: {
    color: Brand.softViolet,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  item: {
    width: 88,
    minHeight: 122,
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: Spacing.one,
  },
  badgeName: {
    maxWidth: 88,
    fontSize: 13,
    lineHeight: 17,
    textAlign: 'center',
  },
  empty: {
    paddingVertical: Spacing.two,
    textAlign: 'center',
  },
  warning: {
    color: Brand.sunsetOrange,
    textAlign: 'center',
  },
  toggle: {
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Spacing.three,
    backgroundColor: 'rgba(47,107,255,0.14)',
  },
  togglePressed: {
    opacity: 0.78,
  },
  toggleText: {
    color: Brand.glowBlue,
  },
});
