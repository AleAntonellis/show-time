import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type GestureResponderEvent,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Brand, Spacing } from '@/constants/theme';

const SMALL_TEXT_LINE_HEIGHT = 20;

export function ExpandableQuotedText({
  text,
  numberOfLines = 3,
}: {
  text: string;
  numberOfLines?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const [canExpand, setCanExpand] = useState(false);

  function toggle(event: GestureResponderEvent) {
    event.stopPropagation();
    setExpanded((value) => !value);
  }

  return (
    <View style={styles.container}>
      <View
        aria-hidden
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={styles.measureContainer}>
        <ThemedText
          type="small"
          style={styles.text}
          onLayout={(event) => {
            const nextCanExpand =
              event.nativeEvent.layout.height >
              numberOfLines * SMALL_TEXT_LINE_HEIGHT + 1;
            setCanExpand((current) =>
              current === nextCanExpand ? current : nextCanExpand,
            );
          }}>
          “{text}”
        </ThemedText>
      </View>
      <ThemedText
        type="small"
        numberOfLines={expanded ? undefined : numberOfLines}
        style={styles.text}>
        “{text}”
      </ThemedText>
      {canExpand && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            expanded ? 'Mostra meno testo' : 'Leggi tutto il testo'
          }
          onPress={toggle}
          hitSlop={6}
          style={({ pressed }) => pressed && styles.pressed}>
          <ThemedText type="smallBold" style={styles.toggle}>
            {expanded ? 'Mostra meno' : 'Leggi tutto'}
          </ThemedText>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minWidth: 0,
    gap: Spacing.half,
  },
  text: {
    fontStyle: 'italic',
  },
  measureContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    opacity: 0,
    pointerEvents: 'none',
  },
  toggle: {
    color: Brand.glowBlue,
    alignSelf: 'flex-start',
  },
  pressed: {
    opacity: 0.8,
  },
});
