import { router, usePathname } from 'expo-router';
import {
  Tabs,
  TabList,
  TabSlot,
  TabTrigger,
  type TabTriggerSlotProps,
} from 'expo-router/ui';
import { SymbolView } from 'expo-symbols';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type GestureResponderEvent,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TitleSearchResults } from '@/components/title-search-results';
import { Brand, MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';
import { getReminderCenter } from '@/services/reminders';
import {
  getUnreadShareCount,
  subscribeToInternalShares,
  unsubscribeFromInternalShares,
} from '@/services/social';
import type { Title } from '@/services/tmdb';

type SuspendedSearch = {
  pathname: string;
  query: string;
  scrollOffset: number;
};

let suspendedSearch: SuspendedSearch | null = null;

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
        <TabTrigger name="contacts" href="/contacts" />
        <TabTrigger name="inbox" href="/inbox" />
        <TabTrigger name="settings" href="/settings" />
      </TabList>
      <BurgerNavigation />
    </Tabs>
  );
}

function BurgerNavigation() {
  const { signOut, session, configured } = useAuth();
  const pathname = usePathname();
  const restoredSearch =
    suspendedSearch && suspendedSearch.pathname === pathname
      ? suspendedSearch
      : null;
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(() => restoredSearch != null);
  const [searchQuery, setSearchQuery] = useState(
    () => restoredSearch?.query ?? '',
  );
  const [searchRestoreOffset, setSearchRestoreOffset] = useState(
    () => restoredSearch?.scrollOffset ?? 0,
  );
  const searchScrollOffsetRef = useRef(restoredSearch?.scrollOffset ?? 0);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reminderCount, setReminderCount] = useState(0);
  const [reminderError, setReminderError] = useState<string | null>(null);
  const [shareUnreadCount, setShareUnreadCount] = useState(0);
  const [shareError, setShareError] = useState<string | null>(null);

  useEffect(() => {
    if (restoredSearch) {
      suspendedSearch = null;
    }
  }, [restoredSearch]);

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

  useEffect(() => {
    if (!configured || !session) {
      return;
    }
    let active = true;
    let subscribedChannel: Awaited<
      ReturnType<typeof subscribeToInternalShares>
    > | null = null;

    const refreshCount = () =>
      getUnreadShareCount()
        .then((count) => {
          if (active) {
            setShareUnreadCount(count);
            setShareError(null);
          }
        })
        .catch((err: unknown) => {
          if (active) {
            setShareError(
              err instanceof Error ? err.message : 'Inbox non disponibile',
            );
          }
        });

    void refreshCount();
    subscribeToInternalShares(() => {
      void refreshCount();
    })
      .then((channel) => {
        if (active) {
          subscribedChannel = channel;
        } else {
          void unsubscribeFromInternalShares(channel).catch((err: unknown) =>
            console.error('Errore chiusura Realtime:', err),
          );
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setShareError(
            err instanceof Error ? err.message : 'Realtime Inbox non disponibile',
          );
        }
      });

    return () => {
      active = false;
      if (subscribedChannel) {
        void unsubscribeFromInternalShares(subscribedChannel).catch((err: unknown) =>
          console.error('Errore chiusura Realtime:', err),
        );
      }
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
      setSearchOpen(false);
      setSearchQuery('');
      setSearchRestoreOffset(0);
      searchScrollOffsetRef.current = 0;
      suspendedSearch = null;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossibile uscire');
    } finally {
      setSigningOut(false);
    }
  }

  function closeSearch() {
    setSearchOpen(false);
    setSearchQuery('');
    setSearchRestoreOffset(0);
    searchScrollOffsetRef.current = 0;
    suspendedSearch = null;
  }

  function openSearchResult(title: Title) {
    suspendedSearch = {
      pathname,
      query: searchQuery,
      scrollOffset: searchScrollOffsetRef.current,
    };
    router.push({
      pathname: '/title',
      params: {
        mediaType: title.mediaType,
        id: String(title.id),
        from: pathname,
      },
    });
  }

  return (
    <View style={styles.menuRoot}>
      {(open || searchOpen) && (
        <Pressable
          accessibilityLabel={searchOpen ? 'Chiudi ricerca' : 'Chiudi menu'}
          onPress={() => {
            setOpen(false);
            closeSearch();
          }}
          style={styles.backdrop}
        />
      )}

      <View style={styles.menuFrame}>
        {searchOpen ? (
          <ThemedView
            type="backgroundElement"
            style={[styles.topBar, styles.searchTopBar]}>
            <SymbolView
              name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }}
              tintColor={Brand.glowBlue}
              size={20}
            />
            <TextInput
              autoFocus
              value={searchQuery}
              onChangeText={(value) => {
                setSearchQuery(value);
                setSearchRestoreOffset(0);
                searchScrollOffsetRef.current = 0;
              }}
              placeholder="Titolo, attore, attrice o regista…"
              placeholderTextColor="rgba(167,173,196,0.78)"
              autoCorrect={false}
              returnKeyType="search"
              onKeyPress={(event) => {
                if (event.nativeEvent.key === 'Escape') {
                  closeSearch();
                }
              }}
              style={styles.searchInput}
            />
            {searchQuery.length > 0 && (
              <Pressable
                accessibilityLabel="Cancella ricerca"
                onPress={() => {
                  setSearchQuery('');
                  setSearchRestoreOffset(0);
                  searchScrollOffsetRef.current = 0;
                }}
                hitSlop={8}
                style={({ pressed }) => [
                  styles.clearSearchButton,
                  pressed && styles.pressed,
                ]}>
                <ThemedText type="smallBold" themeColor="textSecondary">
                  ✕
                </ThemedText>
              </Pressable>
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Chiudi ricerca"
              onPress={closeSearch}
              hitSlop={8}
              style={({ pressed }) => [
                styles.closeSearchButton,
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold" style={styles.closeSearchText}>
                Chiudi
              </ThemedText>
            </Pressable>
          </ThemedView>
        ) : (
          <ThemedView type="backgroundElement" style={styles.topBar}>
            <View style={styles.topBarPrimaryActions}>
              <TabTrigger name="home" asChild>
                <HomeTabButton onSelected={() => setOpen(false)} />
              </TabTrigger>
              <SearchActionButton
                onPress={() => {
                  suspendedSearch = null;
                  setOpen(false);
                  setSearchQuery('');
                  setSearchRestoreOffset(0);
                  searchScrollOffsetRef.current = 0;
                  setSearchOpen(true);
                }}
              />
            </View>
            <View style={styles.topBarActions}>
              <TabTrigger name="inbox" asChild>
                <InboxButton
                  count={shareUnreadCount}
                  hasError={shareError != null}
                  onSelected={() => setOpen(false)}
                />
              </TabTrigger>
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
        )}

        {searchOpen && (
          <ThemedView type="backgroundElement" style={styles.searchPanel}>
            <TitleSearchResults
              query={searchQuery}
              onOpenTitle={openSearchResult}
              initialScrollOffset={searchRestoreOffset}
              onScrollOffsetChange={(offset) => {
                searchScrollOffsetRef.current = offset;
              }}
              contentContainerStyle={styles.searchResultsContent}
            />
          </ThemedView>
        )}

        {open && !searchOpen && (
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
            <TabTrigger name="contacts" asChild>
              <MenuTabButton onSelected={() => setOpen(false)}>Contatti</MenuTabButton>
            </TabTrigger>
            <TabTrigger name="settings" asChild>
              <MenuTabButton onSelected={() => setOpen(false)}>
                Impostazioni
              </MenuTabButton>
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
            {shareError && (
              <ThemedText type="small" style={styles.error}>
                Inbox: {shareError}
              </ThemedText>
            )}
          </ThemedView>
        )}
      </View>
    </View>
  );
}

function InboxButton({
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
    ? Brand.softViolet
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
          ? 'Inbox non disponibile'
          : count > 0
            ? `Inbox, ${count} condivisioni non lette`
            : 'Inbox, nessuna condivisione non letta'
      }
      onPress={handlePress}
      hitSlop={8}
      style={({ pressed }) => [
        styles.bellButton,
        isFocused && styles.inboxButtonFocused,
        highlighted && styles.inboxButtonActive,
        pressed && styles.pressed,
      ]}>
      <SymbolView
        name={{ ios: 'tray.fill', android: 'inbox', web: 'inbox' }}
        tintColor={tint}
        size={20}
      />
      {(count > 0 || hasError) && (
        <View style={[styles.badge, styles.inboxBadge, hasError && styles.badgeError]}>
          <ThemedText type="smallBold" style={styles.badgeText}>
            {hasError ? '!' : count > 99 ? '99+' : count}
          </ThemedText>
        </View>
      )}
    </Pressable>
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

function SearchActionButton({ onPress }: { onPress: () => void }) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityLabel="Cerca film e serie TV"
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [
        styles.searchActionButton,
        pressed && styles.pressed,
      ]}>
      <SymbolView
        name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }}
        tintColor={theme.textSecondary}
        size={19}
      />
      <ThemedText type="smallBold" themeColor="textSecondary">
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
    flex: 1,
    minHeight: 0,
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingTop: Spacing.three,
    pointerEvents: 'box-none',
  },
  topBar: {
    flexShrink: 0,
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
  searchTopBar: {
    gap: Spacing.two,
    paddingLeft: Spacing.three,
  },
  searchInput: {
    minWidth: 0,
    flex: 1,
    color: Brand.pureWhite,
    fontSize: 16,
    paddingVertical: Spacing.two,
  },
  clearSearchButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Spacing.two,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  closeSearchButton: {
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.three,
    backgroundColor: 'rgba(47,107,255,0.16)',
  },
  closeSearchText: {
    color: Brand.glowBlue,
  },
  searchPanel: {
    flex: 1,
    minHeight: 0,
    marginTop: Spacing.two,
    marginBottom: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.four,
    overflow: 'hidden',
    boxShadow: '0 12px 32px rgba(0,0,0,0.38)',
  },
  searchResultsContent: {
    paddingBottom: Spacing.four,
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
  inboxButtonFocused: {
    backgroundColor: 'rgba(47,107,255,0.14)',
  },
  inboxButtonActive: {
    backgroundColor: 'rgba(106,76,255,0.16)',
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
  inboxBadge: {
    backgroundColor: Brand.softViolet,
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
