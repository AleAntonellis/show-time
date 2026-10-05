import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Brand, Colors, Spacing } from '@/constants/theme';

export function BadgeUnlockBanner({
  count,
  onPress,
  onDismiss,
}: {
  count: number;
  onPress?: () => void;
  onDismiss: () => void;
}) {
  return (
    <View style={styles.banner}>
      <Pressable
        accessibilityRole={onPress ? 'button' : undefined}
        accessibilityLabel={
          count === 1
            ? 'Nuovo badge sbloccato'
            : `${count} nuovi badge sbloccati`
        }
        onPress={onPress}
        style={({ pressed }) => [
          styles.mainAction,
          pressed && onPress && styles.pressed,
        ]}>
        <View style={styles.icon}>
          <View style={styles.sparkVertical} />
          <View style={styles.sparkHorizontal} />
        </View>
        <View style={styles.copy}>
          <ThemedText type="smallBold">
            {count === 1
              ? 'Nuovo badge sbloccato'
              : `${count} nuovi badge sbloccati`}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {count === 1
              ? 'La tua Sala trofei si è aggiornata.'
              : 'Apri la Sala trofei per vedere i nuovi traguardi.'}
          </ThemedText>
        </View>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Chiudi notifica badge"
        onPress={(event) => {
          event.stopPropagation();
          onDismiss();
        }}
        hitSlop={8}
        style={({ pressed }) => [
          styles.dismissButton,
          pressed && styles.pressed,
        ]}>
        <ThemedText type="smallBold" style={styles.dismiss}>
          ×
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    width: '100%',
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(106,76,255,0.48)',
    borderRadius: Spacing.three,
    backgroundColor: Colors.dark.backgroundSelected,
  },
  mainAction: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
  },
  icon: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
    backgroundColor: Brand.softViolet,
  },
  sparkVertical: {
    position: 'absolute',
    width: 3,
    height: 22,
    borderRadius: 2,
    backgroundColor: Brand.pureWhite,
  },
  sparkHorizontal: {
    position: 'absolute',
    width: 22,
    height: 3,
    borderRadius: 2,
    backgroundColor: Brand.pureWhite,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: Spacing.half,
  },
  dismiss: {
    color: Brand.pureWhite,
    fontSize: 20,
    lineHeight: 24,
  },
  dismissButton: {
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
  },
  pressed: {
    opacity: 0.8,
  },
});
