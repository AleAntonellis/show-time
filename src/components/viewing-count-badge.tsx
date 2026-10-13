import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Brand, Spacing } from '@/constants/theme';

export function ViewingCountBadge({ count }: { count: number }) {
  if (count < 2) {
    return null;
  }

  return (
    <View
      accessible
      accessibilityLabel={`Visto ${count} volte`}
      style={styles.badge}>
      <ThemedText type="smallBold" style={styles.text}>
        ×{count}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    minWidth: 32,
    minHeight: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.one,
    borderRadius: Spacing.three,
    backgroundColor: 'rgba(106,76,255,0.20)',
  },
  text: {
    color: Brand.softViolet,
  },
});
