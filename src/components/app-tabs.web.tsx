import {
  Tabs,
  TabList,
  TabSlot,
  TabTrigger,
  type TabTriggerSlotProps,
} from 'expo-router/ui';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type GestureResponderEvent,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={styles.slot} />
      <TabList style={styles.hiddenTabList}>
        <TabTrigger name="home" href="/" />
        <TabTrigger name="search" href="/search" />
        <TabTrigger name="library" href="/library" />
        <TabTrigger name="stats" href="/stats" />
        <TabTrigger name="reminders" href="/reminders" />
      </TabList>
      <BurgerNavigation />
    </Tabs>
  );
}

function BurgerNavigation() {
  const { signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignOut() {
    if (signingOut) {
      return;
    }
    setSigningOut(true);
    setError(null);
    try {
      await signOut();
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossibile uscire');
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <View style={styles.menuRoot}>
      {open && (
        <Pressable
          accessibilityLabel="Chiudi menu"
          onPress={() => setOpen(false)}
          style={styles.backdrop}
        />
      )}

      <View style={styles.menuFrame}>
        <ThemedView type="backgroundElement" style={styles.topBar}>
          <TabTrigger name="home" asChild>
            <BrandHomeButton onSelected={() => setOpen(false)} />
          </TabTrigger>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={open ? 'Chiudi menu' : 'Apri menu'}
            onPress={() => setOpen((current) => !current)}
            hitSlop={8}
            style={({ pressed }) => [
              styles.burgerButton,
              open && styles.burgerButtonOpen,
              pressed && styles.pressed,
            ]}>
            <ThemedText type="smallBold" style={styles.burgerIcon}>
              {open ? '✕' : '☰'}
            </ThemedText>
          </Pressable>
        </ThemedView>

        {open && (
          <ThemedView type="backgroundElement" style={styles.dropdown}>
            <TabTrigger name="home" asChild>
              <MenuTabButton onSelected={() => setOpen(false)}>Home</MenuTabButton>
            </TabTrigger>
            <TabTrigger name="search" asChild>
              <MenuTabButton onSelected={() => setOpen(false)}>Cerca</MenuTabButton>
            </TabTrigger>
            <TabTrigger name="library" asChild>
              <MenuTabButton onSelected={() => setOpen(false)}>Libreria</MenuTabButton>
            </TabTrigger>
            <TabTrigger name="stats" asChild>
              <MenuTabButton onSelected={() => setOpen(false)}>Statistiche</MenuTabButton>
            </TabTrigger>
            <TabTrigger name="reminders" asChild>
              <MenuTabButton onSelected={() => setOpen(false)}>Reminder</MenuTabButton>
            </TabTrigger>

            <View style={styles.divider} />

            <Pressable
              onPress={handleSignOut}
              disabled={signingOut}
              style={({ pressed }) => [
                styles.logoutButton,
                pressed && styles.pressed,
                signingOut && styles.disabled,
              ]}>
              {signingOut ? (
                <ActivityIndicator color={Brand.sunsetOrange} size="small" />
              ) : (
                <ThemedText type="smallBold" style={styles.logoutText}>
                  Esci
                </ThemedText>
              )}
            </Pressable>

            {error && (
              <ThemedText type="small" style={styles.error}>
                {error}
              </ThemedText>
            )}
          </ThemedView>
        )}
      </View>
    </View>
  );
}

function BrandHomeButton({
  onSelected,
  onPress,
  ...props
}: TabTriggerSlotProps & { onSelected: () => void }) {
  function handlePress(event: GestureResponderEvent) {
    onPress?.(event);
    onSelected();
  }

  return (
    <Pressable
      {...props}
      accessibilityLabel="Vai alla Home"
      onPress={handlePress}
      hitSlop={8}
      style={({ pressed }) => [styles.brandButton, pressed && styles.pressed]}>
      <ThemedText type="smallBold">ShowTime</ThemedText>
    </Pressable>
  );
}

function MenuTabButton({
  children,
  isFocused,
  onSelected,
  onPress,
  ...props
}: TabTriggerSlotProps & { onSelected: () => void }) {
  function handlePress(event: GestureResponderEvent) {
    onPress?.(event);
    onSelected();
  }

  return (
    <Pressable
      {...props}
      onPress={handlePress}
      style={({ pressed }) => [styles.menuItem, pressed && styles.pressed]}>
      <ThemedView
        type={isFocused ? 'backgroundSelected' : 'backgroundElement'}
        style={styles.menuItemInner}>
        <ThemedText type="smallBold" themeColor={isFocused ? 'text' : 'textSecondary'}>
          {children}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          ›
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  slot: {
    height: '100%',
  },
  hiddenTabList: {
    display: 'none',
  },
  menuRoot: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 20,
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    pointerEvents: 'box-none',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(4,2,18,0.55)',
  },
  menuFrame: {
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingTop: Spacing.three,
    pointerEvents: 'box-none',
  },
  topBar: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Spacing.four,
    paddingLeft: Spacing.three,
    paddingRight: Spacing.two,
  },
  brandButton: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: Spacing.one,
  },
  burgerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Spacing.three,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  burgerButtonOpen: {
    backgroundColor: 'rgba(255,106,44,0.18)',
  },
  burgerIcon: {
    fontSize: 20,
    lineHeight: 24,
  },
  dropdown: {
    position: 'absolute',
    top: Spacing.six + Spacing.two,
    right: 0,
    width: 240,
    padding: Spacing.two,
    gap: Spacing.one,
    borderRadius: Spacing.three,
    boxShadow: '0 8px 24px rgba(0,0,0,0.30)',
  },
  menuItem: {
    width: '100%',
  },
  menuItemInner: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: Spacing.one,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  logoutButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Spacing.two,
    backgroundColor: 'rgba(255,106,44,0.12)',
  },
  logoutText: {
    color: Brand.sunsetOrange,
  },
  error: {
    color: Brand.sunsetOrange,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.75,
  },
  disabled: {
    opacity: 0.6,
  },
});
