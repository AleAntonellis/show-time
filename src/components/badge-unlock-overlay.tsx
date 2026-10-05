import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BadgeUnlockBanner } from '@/components/badge-unlock-banner';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import {
  evaluateBadgesAndNotify,
  getMyBadgeCatalog,
  subscribeToBadgeUnlocks,
} from '@/services/badges';

export function BadgeUnlockOverlay() {
  const insets = useSafeAreaInsets();
  const { configured, session } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(
    () =>
      subscribeToBadgeUnlocks((newUnlocks) => {
        setCount((current) => current + newUnlocks);
      }),
    [],
  );

  useEffect(() => {
    if (!configured || !session) {
      return;
    }
    let cancelled = false;
    getMyBadgeCatalog()
      .then((catalog) => {
        if (cancelled) {
          return;
        }
        const cinephile = catalog.find(
          (family) => family.id === 'cinephile' && family.isActive,
        );
        if (cinephile?.evaluatedAt == null) {
          return evaluateBadgesAndNotify({
            badgeIds: ['cinephile'],
            backfill: true,
          });
        }
      })
      .catch((error: unknown) => {
        console.error(
          'Badge backfill failed:',
          error instanceof Error ? error.message : error,
        );
      });
    return () => {
      cancelled = true;
    };
  }, [configured, session]);

  if (!session || count <= 0) {
    return null;
  }

  const top =
    Platform.OS === 'web' ? Spacing.three : insets.top + Spacing.two;

  return (
    <View
      style={[styles.overlay, { paddingTop: top, pointerEvents: 'box-none' }]}>
      <View style={styles.content}>
        <BadgeUnlockBanner
          count={count}
          onPress={() => {
            setCount(0);
            router.push('/badges');
          }}
          onDismiss={() => setCount(0)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    left: 0,
    zIndex: 100,
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
  },
});
