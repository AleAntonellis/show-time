import { usePathname } from 'expo-router';
import {
  Tabs,
  TabList,
  TabSlot,
  TabTrigger,
  type TabTriggerSlotProps,
} from 'expo-router/ui';
import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
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
import { useTheme } from '@/hooks/use-theme';
import { getReminderCenter } from '@/services/reminders';

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
        <TabTrigger name="diary" href="/diary" />
        <TabTrigger name="calendar" href="/calendar" />
      </TabList>
      <BurgerNavigation />
    </Tabs>
  );
}

function BurgerNavigation() {
  const { signOut, session, configured } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reminderCount, setReminderCount] = useState(0);
  const [reminderError, setReminderError] = useState<string | null>(null);

  useEffect(() => {
    if (!configured || !session) {
      return;
    }
    let cancelled = false;
    getReminderCenter()
      .then((center) => {
        if (!cancelled) {
          setReminderCount(center.reminders.length);
          setReminderError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setReminderError(
            err instanceof Error ? err.message : 'Reminder non disponibili',
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [configured, pathname, session]);

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
          <View style={styles.topBarPrimaryActions}>
            <TabTrigger name="home" asChild>
              <HomeTabButton onSelected={() => setOpen(false)} />
            </TabTrigger>
            <TabTrigger name="search" asChild>
              <SearchTabButton onSelected={() => setOpen(false)} />
            </TabTrigger>
          </View>
          <View style={styles.topBarActions}>
            <TabTrigger name="reminders" asChild>
              <ReminderBellButton
                count={reminderCount}
                hasError={reminderError != null}
                onSelected={() => setOpen(false)}
              />
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
          </View>
        </ThemedView>

        {open && (
          <ThemedView type="backgroundElement" style={styles.dropdown}>
            <TabTrigger name="library" asChild>
              <MenuTabButton onSelected={() => setOpen(false)}>Libreria</MenuTabButton>
            </TabTrigger>
            <TabTrigger name="stats" asChild>
              <MenuTabButton onSelected={() => setOpen(false)}>Statistiche</MenuTabButton>
            </TabTrigger>
            <TabTrigger name="diary" asChild>
              <MenuTabButton onSelected={() => setOpen(false)}>Diario</MenuTabButton>
            </TabTrigger>
            <TabTrigger name="calendar" asChild>
              <MenuTabButton onSelected={() => setOpen(false)}>Calendario</MenuTabButton>
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
            {reminderError && (
              <ThemedText type="small" style={styles.error}>
                Reminder: {reminderError}
              </ThemedText>
            )}
          </ThemedView>
        )}
      </View>
    </View>
  );
}

function ReminderBellButton({
  count,
  hasError,
  isFocused,
  onSelected,
  onPress,
  ...props
}: TabTriggerSlotProps & {
  count: number;
  hasError: boolean;
  onSelected: () => void;
}) {
  const theme = useTheme();
  const highlighted = count > 0;
  const tint = highlighted
    ? Brand.sunsetOrange
    : isFocused
      ? Brand.glowBlue
      : theme.textSecondary;

  function handlePress(event: GestureResponderEvent) {
    onPress?.(event);
    onSelected();
  }

  return (
    <Pressable
      {...props}
      accessibilityLabel={
        hasError
          ? 'Reminder non disponibili'
          : count > 0
            ? `Reminder, ${count} in arrivo`
            : 'Reminder, nessuna uscita imminente'
      }
      onPress={handlePress}
      hitSlop={8}
      style={({ pressed }) => [
        styles.bellButton,
        isFocused && styles.bellButtonFocused,
        highlighted && styles.bellButtonActive,
        pressed && styles.pressed,
      ]}>
      <View style={styles.bellIcon}>
        <View style={[styles.bellDome, { borderColor: tint }]} />
        <View style={[styles.bellClapper, { backgroundColor: tint }]} />
      </View>
      {(count > 0 || hasError) && (
        <View style={[styles.badge, hasError && styles.badgeError]}>
          <ThemedText type="smallBold" style={styles.badgeText}>
            {hasError ? '!' : count > 99 ? '99+' : count}
          </ThemedText>
        </View>
      )}
    </Pressable>
  );
}

function HomeTabButton({
  isFocused,
  onSelected,
  onPress,
  ...props
}: TabTriggerSlotProps & { onSelected: () => void }) {
  const theme = useTheme();

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
      style={({ pressed }) => [
        styles.primaryActionButton,
        isFocused && styles.primaryActionButtonFocused,
        pressed && styles.pressed,
      ]}>
      <SymbolView
        name={{ ios: 'house.fill', android: 'home', web: 'home' }}
        tintColor={isFocused ? Brand.glowBlue : theme.textSecondary}
        size={20}
      />
    </Pressable>
  );
}

function SearchTabButton({
  isFocused,
  onSelected,
  onPress,
  ...props
}: TabTriggerSlotProps & { onSelected: () => void }) {
  const theme = useTheme();

  function handlePress(event: GestureResponderEvent) {
    onPress?.(event);
    onSelected();
  }

  return (
    <Pressable
      {...props}
      accessibilityLabel="Cerca film e serie TV"
      onPress={handlePress}
      hitSlop={8}
      style={({ pressed }) => [
        styles.searchActionButton,
        isFocused && styles.primaryActionButtonFocused,
        pressed && styles.pressed,
      ]}>
      <SymbolView
        name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }}
        tintColor={isFocused ? Brand.glowBlue : theme.textSecondary}
        size={19}
      />
      <ThemedText
        type="smallBold"
        style={isFocused ? styles.primaryActionTextFocused : undefined}
        themeColor={isFocused ? 'text' : 'textSecondary'}>
        Cerca
      </ThemedText>
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
  topBarPrimaryActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  primaryActionButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Spacing.three,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  searchActionButton: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  primaryActionButtonFocused: {
    backgroundColor: 'rgba(47,107,255,0.14)',
  },
  primaryActionTextFocused: {
    color: Brand.glowBlue,
  },
  topBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  bellButton: {
    position: 'relative',
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Spacing.three,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  bellButtonFocused: {
    backgroundColor: 'rgba(47,107,255,0.14)',
  },
  bellButtonActive: {
    backgroundColor: 'rgba(255,106,44,0.16)',
  },
  bellIcon: {
    width: 20,
    height: 22,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  bellDome: {
    width: 16,
    height: 16,
    borderWidth: 2,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
  },
  bellClapper: {
    width: 5,
    height: 3,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
    paddingHorizontal: 3,
    backgroundColor: Brand.sunsetOrange,
  },
  badgeError: {
    backgroundColor: '#D9364F',
  },
  badgeText: {
    color: Brand.pureWhite,
    fontSize: 10,
    lineHeight: 12,
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
