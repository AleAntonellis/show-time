import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Brand, Spacing } from '@/constants/theme';
import type { MediaType } from '@/services/tmdb';

export type MediaFilterValue = 'all' | MediaType;

const OPTIONS: { value: MediaFilterValue; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'movie', label: 'Film' },
  { value: 'tv', label: 'Serie TV' },
];

export function MediaFilter({
  value,
  onChange,
}: {
  value: MediaFilterValue;
  onChange: (value: MediaFilterValue) => void;
}) {
  return (
    <View style={styles.filters}>
      {OPTIONS.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              styles.filter,
              active && styles.filterActive,
              pressed && styles.pressed,
            ]}>
            <ThemedText
              type="smallBold"
              style={active ? styles.filterTextActive : undefined}>
              {option.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  filters: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  filter: {
    minHeight: 40,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  filterActive: {
    backgroundColor: Brand.softViolet,
  },
  filterTextActive: {
    color: Brand.pureWhite,
  },
  pressed: {
    opacity: 0.8,
  },
});
