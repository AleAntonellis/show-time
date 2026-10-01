import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  BottomTabInset,
  Brand,
  MaxContentWidth,
  Spacing,
  WebTabTopInset,
} from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';
import {
  getFollowConnections,
  getMyPublicAccount,
  removeFollow,
  requestFollow,
  respondFollow,
  searchPublicProfiles,
  type FollowConnection,
  type PublicAccount,
  type PublicProfileSearchResult,
} from '@/services/social';

function openProfile(username: string) {
  router.push({
    pathname: '/profile',
    params: { username, from: '/contacts' },
  });
}

export default function ContactsTabScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { session, configured } = useAuth();
  const [account, setAccount] = useState<PublicAccount | null>(null);
  const [connections, setConnections] = useState<FollowConnection[]>([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PublicProfileSearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!configured || !session) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [nextAccount, nextConnections] = await Promise.all([
        getMyPublicAccount(),
        getFollowConnections(),
      ]);
      setAccount(nextAccount);
      setConnections(nextConnections);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossibile caricare i contatti');
    } finally {
      setLoading(false);
    }
  }, [configured, session]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (configured && !session) {
    return null;
  }

  async function search() {
    setSearching(true);
    setError(null);
    try {
      setResults(await searchPublicProfiles(query));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ricerca non riuscita');
    } finally {
      setSearching(false);
    }
  }

  async function runAction(id: string, action: () => Promise<void>) {
    setBusyId(id);
    setError(null);
    try {
      await action();
      await load();
      if (query.trim().length >= 2) {
        setResults(await searchPublicProfiles(query));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operazione non riuscita');
    } finally {
      setBusyId(null);
    }
  }

  const incomingPending = connections.filter(
    (item) => item.direction === 'incoming' && item.status === 'pending',
  );
  const outgoingPending = connections.filter(
    (item) => item.direction === 'outgoing' && item.status === 'pending',
  );
  const shareContacts = connections.filter(
    (item) => item.direction === 'outgoing' && item.status === 'accepted',
  );
  const followers = connections.filter(
    (item) => item.direction === 'incoming' && item.status === 'accepted',
  );
  const viewableUserIds = new Set(shareContacts.map((item) => item.userId));
  const topInset = Platform.OS === 'web' ? WebTabTopInset : insets.top + Spacing.three;
  const bottomInset = insets.bottom + BottomTabInset + Spacing.four;

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.content,
          { paddingTop: topInset, paddingBottom: bottomInset },
        ]}>
        <ThemedView type="backgroundElement" style={styles.hero}>
          <View style={styles.heroCopy}>
            <ThemedText type="small" themeColor="textSecondary">
              Profilo pubblico
            </ThemedText>
            <ThemedText type="subtitle" style={styles.heroTitle}>
              Contatti
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              I follower accettati possono consultare Libreria e Diario.
            </ThemedText>
          </View>
          {account?.username && (
            <View style={styles.usernameBadge}>
              <ThemedText type="smallBold" style={styles.usernameText}>
                @{account.username}
              </ThemedText>
            </View>
          )}
        </ThemedView>

        {!configured ? (
          <StateMessage
            title="Supabase non configurato"
            body="Configura Supabase per usare contatti e condivisioni."
          />
        ) : loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={Brand.glowBlue} />
          </View>
        ) : (
          <>
            <ThemedView type="backgroundElement" style={styles.searchPanel}>
              <ThemedText type="smallBold">Cerca un utente</ThemedText>
              <View style={styles.searchRow}>
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="username"
                  placeholderTextColor={theme.textSecondary}
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={24}
                  returnKeyType="search"
                  onSubmitEditing={search}
                  style={[styles.input, { color: theme.text }]}
                />
                <Pressable
                  onPress={search}
                  disabled={searching}
                  style={({ pressed }) => [
                    styles.searchButton,
                    pressed && styles.pressed,
                  ]}>
                  {searching ? (
                    <ActivityIndicator color={Brand.pureWhite} size="small" />
                  ) : (
                    <ThemedText type="smallBold" style={styles.buttonText}>
                      Cerca
                    </ThemedText>
                  )}
                </Pressable>
              </View>
            </ThemedView>

            {error && (
              <ThemedText type="small" style={styles.error}>
                {error}
              </ThemedText>
            )}

            {results.length > 0 && (
              <ContactSection title={`Risultati · ${results.length}`}>
                {results.map((profile) => (
                  <ProfileResult
                    key={profile.id}
                    profile={profile}
                    busy={busyId === profile.id}
                    onRequest={() =>
                      runAction(profile.id, () => requestFollow(profile.id))
                    }
                    onOpenProfile={
                      profile.outgoingStatus === 'accepted'
                        ? () => openProfile(profile.username)
                        : undefined
                    }
                  />
                ))}
              </ContactSection>
            )}

            {incomingPending.length > 0 && (
              <ContactSection
                title={`Richieste ricevute · ${incomingPending.length}`}
                subtitle="Accettando, questo utente potrà vedere la tua Libreria e il tuo Diario.">
                {incomingPending.map((connection) => (
                  <ConnectionCard
                    key={connection.followId}
                    connection={connection}
                    busy={busyId === connection.followId}
                    primaryLabel="Accetta"
                    onPrimary={() =>
                      runAction(connection.followId, () =>
                        respondFollow(connection.followId, true),
                      )
                    }
                    secondaryLabel="Rifiuta"
                    onSecondary={() =>
                      runAction(connection.followId, () =>
                        respondFollow(connection.followId, false),
                      )
                    }
                  />
                ))}
              </ContactSection>
            )}

            <ContactSection title={`Puoi condividere con · ${shareContacts.length}`}>
              {shareContacts.length === 0 ? (
                <EmptyRow text="Nessun contatto ha ancora accettato una tua richiesta." />
              ) : (
                shareContacts.map((connection) => (
                  <ConnectionCard
                    key={connection.followId}
                    connection={connection}
                    busy={busyId === connection.followId}
                    secondaryLabel="Rimuovi"
                    onOpenProfile={() => openProfile(connection.username)}
                    onSecondary={() =>
                      runAction(connection.followId, () =>
                        removeFollow(connection.followId),
                      )
                    }
                  />
                ))
              )}
            </ContactSection>

            {outgoingPending.length > 0 && (
              <ContactSection title={`Richieste inviate · ${outgoingPending.length}`}>
                {outgoingPending.map((connection) => (
                  <ConnectionCard
                    key={connection.followId}
                    connection={connection}
                    busy={busyId === connection.followId}
                    secondaryLabel="Annulla"
                    onSecondary={() =>
                      runAction(connection.followId, () =>
                        removeFollow(connection.followId),
                      )
                    }
                  />
                ))}
              </ContactSection>
            )}

            {followers.length > 0 && (
              <ContactSection title={`Ti seguono · ${followers.length}`}>
                {followers.map((connection) => (
                  <ConnectionCard
                    key={connection.followId}
                    connection={connection}
                    busy={busyId === connection.followId}
                    secondaryLabel="Rimuovi"
                    onOpenProfile={
                      viewableUserIds.has(connection.userId)
                        ? () => openProfile(connection.username)
                        : undefined
                    }
                    onSecondary={() =>
                      runAction(connection.followId, () =>
                        removeFollow(connection.followId),
                      )
                    }
                  />
                ))}
              </ContactSection>
            )}
          </>
        )}
      </ScrollView>
    </ThemedView>
  );
}

function ProfileResult({
  profile,
  busy,
  onRequest,
  onOpenProfile,
}: {
  profile: PublicProfileSearchResult;
  busy: boolean;
  onRequest: () => void;
  onOpenProfile?: () => void;
}) {
  const existing = profile.outgoingStatus;
  const label =
    existing === 'accepted'
      ? 'Contatto'
      : existing === 'pending'
        ? 'In attesa'
        : 'Segui';
  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <Pressable
        onPress={onOpenProfile}
        disabled={!onOpenProfile}
        style={({ pressed }) => [
          styles.profileTarget,
          pressed && styles.pressed,
        ]}>
        <Avatar username={profile.username} />
        <View style={styles.cardCopy}>
          <ThemedText type="smallBold">@{profile.username}</ThemedText>
          {profile.displayName && (
            <ThemedText type="small" themeColor="textSecondary">
              {profile.displayName}
            </ThemedText>
          )}
          {profile.incomingStatus === 'accepted' && (
            <ThemedText type="small" themeColor="textSecondary">
              Ti segue
            </ThemedText>
          )}
        </View>
        {onOpenProfile && (
          <ThemedText type="small" themeColor="textSecondary">
            ›
          </ThemedText>
        )}
      </Pressable>
      <Pressable
        onPress={onRequest}
        disabled={busy || existing === 'accepted' || existing === 'pending'}
        style={[
          styles.inlineButton,
          existing != null && existing !== 'rejected' && styles.inlineButtonMuted,
        ]}>
        {busy ? (
          <ActivityIndicator color={Brand.glowBlue} size="small" />
        ) : (
          <ThemedText type="smallBold" style={styles.inlineButtonText}>
            {label}
          </ThemedText>
        )}
      </Pressable>
    </ThemedView>
  );
}

function ConnectionCard({
  connection,
  busy,
  primaryLabel,
  secondaryLabel,
  onPrimary,
  onSecondary,
  onOpenProfile,
}: {
  connection: FollowConnection;
  busy: boolean;
  primaryLabel?: string;
  secondaryLabel?: string;
  onPrimary?: () => void;
  onSecondary?: () => void;
  onOpenProfile?: () => void;
}) {
  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <Pressable
        onPress={onOpenProfile}
        disabled={!onOpenProfile}
        style={({ pressed }) => [
          styles.profileTarget,
          pressed && styles.pressed,
        ]}>
        <Avatar username={connection.username} />
        <View style={styles.cardCopy}>
          <ThemedText type="smallBold">@{connection.username}</ThemedText>
          {connection.displayName && (
            <ThemedText type="small" themeColor="textSecondary">
              {connection.displayName}
            </ThemedText>
          )}
        </View>
        {onOpenProfile && (
          <ThemedText type="small" themeColor="textSecondary">
            ›
          </ThemedText>
        )}
      </Pressable>
      {busy ? (
        <ActivityIndicator color={Brand.glowBlue} size="small" />
      ) : (
        <View style={styles.cardActions}>
          {onPrimary && primaryLabel && (
            <Pressable onPress={onPrimary} style={styles.inlineButton}>
              <ThemedText type="smallBold" style={styles.inlineButtonText}>
                {primaryLabel}
              </ThemedText>
            </Pressable>
          )}
          {onSecondary && secondaryLabel && (
            <Pressable onPress={onSecondary} hitSlop={6}>
              <ThemedText type="small" style={styles.secondaryText}>
                {secondaryLabel}
              </ThemedText>
            </Pressable>
          )}
        </View>
      )}
    </ThemedView>
  );
}

function Avatar({ username }: { username: string }) {
  return (
    <View style={styles.avatar}>
      <ThemedText type="smallBold" style={styles.avatarText}>
        {username.charAt(0).toUpperCase()}
      </ThemedText>
    </View>
  );
}

function ContactSection({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeading}>
        <ThemedText type="smallBold" themeColor="textSecondary">
          {title}
        </ThemedText>
        {subtitle && (
          <ThemedText type="small" themeColor="textSecondary">
            {subtitle}
          </ThemedText>
        )}
      </View>
      {children}
    </View>
  );
}

function EmptyRow({ text }: { text: string }) {
  return (
    <ThemedView type="backgroundElement" style={styles.emptyRow}>
      <ThemedText type="small" themeColor="textSecondary">
        {text}
      </ThemedText>
    </ThemedView>
  );
}

function StateMessage({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.center}>
      <ThemedText type="smallBold">{title}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.centerText}>
        {body}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: Spacing.four,
  },
  heroCopy: {
    flex: 1,
    gap: Spacing.one,
  },
  heroTitle: {
    fontSize: 30,
    lineHeight: 36,
  },
  usernameBadge: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
    backgroundColor: 'rgba(106,76,255,0.18)',
  },
  usernameText: {
    color: Brand.softViolet,
  },
  searchPanel: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  searchRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  input: {
    minHeight: 44,
    flex: 1,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  searchButton: {
    minWidth: 88,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
    backgroundColor: Brand.glowBlue,
  },
  buttonText: {
    color: Brand.pureWhite,
  },
  error: {
    color: Brand.sunsetOrange,
  },
  section: {
    gap: Spacing.two,
  },
  sectionHeading: {
    gap: Spacing.half,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  profileTarget: {
    minWidth: 0,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  avatar: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
    backgroundColor: Brand.softViolet,
  },
  avatarText: {
    color: Brand.pureWhite,
  },
  cardCopy: {
    flex: 1,
    gap: Spacing.half,
  },
  cardActions: {
    alignItems: 'flex-end',
    gap: Spacing.two,
  },
  inlineButton: {
    minWidth: 76,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.three,
    backgroundColor: 'rgba(47,107,255,0.16)',
  },
  inlineButtonMuted: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  inlineButtonText: {
    color: Brand.glowBlue,
  },
  secondaryText: {
    color: Brand.sunsetOrange,
  },
  emptyRow: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.six,
  },
  centerText: {
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.8,
  },
});
