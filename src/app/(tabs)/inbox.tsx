import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type GestureResponderEvent,
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
import {
  getFollowConnections,
  getInternalTitleShares,
  markInternalShareRead,
  subscribeToInternalShares,
  unsubscribeFromInternalShares,
  type InternalTitleShare,
  type ShareBox,
} from '@/services/social';

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('it-IT', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export default function InboxTabScreen() {
  const insets = useSafeAreaInsets();
  const { session, configured } = useAuth();
  const [box, setBox] = useState<ShareBox>('received');
  const [shares, setShares] = useState<InternalTitleShare[]>([]);
  const [viewableProfileIds, setViewableProfileIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [loading, setLoading] = useState(true);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [profileWarning, setProfileWarning] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!configured || !session) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    setProfileWarning(null);
    try {
      const [sharesResult, connectionsResult] = await Promise.allSettled([
        getInternalTitleShares(box),
        getFollowConnections(),
      ]);
      if (sharesResult.status === 'rejected') {
        throw sharesResult.reason;
      }
      setShares(sharesResult.value);
      if (connectionsResult.status === 'fulfilled') {
        setViewableProfileIds(
          new Set(
            connectionsResult.value
              .filter(
                (connection) =>
                  connection.direction === 'outgoing' &&
                  connection.status === 'accepted',
              )
              .map((connection) => connection.userId),
          ),
        );
      } else {
        setViewableProfileIds(new Set());
        setProfileWarning(
          connectionsResult.reason instanceof Error
            ? `Profili non disponibili: ${connectionsResult.reason.message}`
            : 'Profili dei contatti non disponibili',
        );
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Impossibile caricare le condivisioni',
      );
    } finally {
      setLoading(false);
    }
  }, [box, configured, session]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  useEffect(() => {
    if (!configured || !session) {
      return;
    }
    let active = true;
    let subscribedChannel: Awaited<
      ReturnType<typeof subscribeToInternalShares>
    > | null = null;

    subscribeToInternalShares(() => {
      if (active) {
        void load();
      }
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
          setError(
            err instanceof Error ? err.message : 'Realtime non disponibile',
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
  }, [configured, load, session]);

  if (configured && !session) {
    return null;
  }

  async function openShare(share: InternalTitleShare) {
    setOpeningId(share.id);
    setError(null);
    try {
      if (box === 'received' && !share.readAt) {
        await markInternalShareRead(share.id);
        setShares((previous) =>
          previous.map((item) =>
            item.id === share.id ? { ...item, readAt: new Date().toISOString() } : item,
          ),
        );
      }
      router.push({
        pathname: '/title',
        params: {
          mediaType: share.mediaType,
          id: String(share.tmdbId),
          from: '/inbox',
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossibile aprire il titolo');
    } finally {
      setOpeningId(null);
    }
  }

  function openProfile(
    event: GestureResponderEvent,
    share: InternalTitleShare,
  ) {
    event.stopPropagation();
    router.push({
      pathname: '/profile',
      params: {
        username: share.counterpartyUsername,
        from: '/inbox',
      },
    });
  }

  const unreadCount = shares.filter((share) => !share.readAt).length;
  const topInset = Platform.OS === 'web' ? WebTabTopInset : insets.top + Spacing.three;
  const bottomInset = insets.bottom + BottomTabInset + Spacing.four;

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingTop: topInset, paddingBottom: bottomInset },
        ]}>
        <ThemedView type="backgroundElement" style={styles.hero}>
          <View style={styles.heroCopy}>
            <ThemedText type="small" themeColor="textSecondary">
              Condivisioni interne
            </ThemedText>
            <ThemedText type="subtitle" style={styles.heroTitle}>
              Inbox
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Titoli consigliati dai tuoi contatti ShowTime.
            </ThemedText>
          </View>
          {box === 'received' && unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <ThemedText type="smallBold" style={styles.unreadBadgeText}>
                {unreadCount}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                non letti
              </ThemedText>
            </View>
          )}
        </ThemedView>

        <View style={styles.tabs}>
          <Pressable
            onPress={() => setBox('received')}
            style={[styles.tab, box === 'received' && styles.tabActive]}>
            <ThemedText
              type="smallBold"
              style={box === 'received' ? styles.tabTextActive : undefined}>
              Ricevuti
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={() => setBox('sent')}
            style={[styles.tab, box === 'sent' && styles.tabActive]}>
            <ThemedText
              type="smallBold"
              style={box === 'sent' ? styles.tabTextActive : undefined}>
              Inviati
            </ThemedText>
          </Pressable>
        </View>

        {profileWarning && (
          <ThemedText type="small" style={styles.warning}>
            {profileWarning}
          </ThemedText>
        )}

        {!configured ? (
          <StateMessage
            title="Supabase non configurato"
            body="Configura Supabase per usare l’Inbox."
          />
        ) : loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={Brand.glowBlue} />
          </View>
        ) : error ? (
          <StateMessage title="Ops" body={error} />
        ) : shares.length === 0 ? (
          <ThemedView type="backgroundElement" style={styles.empty}>
            <ThemedText type="smallBold">
              {box === 'received'
                ? 'Nessun titolo ricevuto'
                : 'Nessun titolo inviato'}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.centerText}>
              {box === 'received'
                ? 'Le condivisioni dei tuoi contatti compariranno qui.'
                : 'Apri una scheda titolo e scegli “Invia su ShowTime”.'}
            </ThemedText>
          </ThemedView>
        ) : (
          <View style={styles.list}>
            {shares.map((share) => {
              const unread = box === 'received' && !share.readAt;
              return (
                <Pressable
                  key={share.id}
                  onPress={() => openShare(share)}
                  disabled={openingId === share.id}
                  style={({ pressed }) => pressed && styles.pressed}>
                  <ThemedView
                    type={unread ? 'backgroundSelected' : 'backgroundElement'}
                    style={styles.card}>
                    {share.posterUrl ? (
                      <Image
                        source={{ uri: share.posterUrl }}
                        contentFit="cover"
                        style={styles.poster}
                      />
                    ) : (
                      <ThemedView type="backgroundSelected" style={styles.poster} />
                    )}
                    <View style={styles.cardCopy}>
                      <View style={styles.cardHeading}>
                        <ThemedText type="smallBold" numberOfLines={1} style={styles.title}>
                          {share.title}
                        </ThemedText>
                        {unread && <View style={styles.unreadDot} />}
                      </View>
                      <View style={styles.counterparty}>
                        <ThemedText type="small" themeColor="textSecondary">
                          {box === 'received' ? 'Da' : 'A'}
                        </ThemedText>
                        {viewableProfileIds.has(share.counterpartyId) ? (
                          <Pressable
                            onPress={(event) => openProfile(event, share)}
                            hitSlop={6}>
                            <ThemedText type="smallBold" style={styles.profileLink}>
                              @{share.counterpartyUsername}
                            </ThemedText>
                          </Pressable>
                        ) : (
                          <ThemedText type="small" themeColor="textSecondary">
                            @{share.counterpartyUsername}
                          </ThemedText>
                        )}
                        {share.year && (
                          <ThemedText type="small" themeColor="textSecondary">
                            · {share.year}
                          </ThemedText>
                        )}
                      </View>
                      {share.message && (
                        <ThemedText type="small" numberOfLines={3} style={styles.message}>
                          “{share.message}”
                        </ThemedText>
                      )}
                      <ThemedText type="small" themeColor="textSecondary">
                        {formatDate(share.createdAt)}
                        {box === 'sent'
                          ? share.readAt
                            ? ' · Letto'
                            : ' · Consegnato'
                          : ''}
                      </ThemedText>
                    </View>
                    {openingId === share.id ? (
                      <ActivityIndicator color={Brand.glowBlue} size="small" />
                    ) : (
                      <ThemedText type="small" themeColor="textSecondary">
                        ›
                      </ThemedText>
                    )}
                  </ThemedView>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
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
  unreadBadge: {
    minWidth: 82,
    alignItems: 'center',
    gap: Spacing.half,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    backgroundColor: 'rgba(255,106,44,0.16)',
  },
  unreadBadgeText: {
    color: Brand.sunsetOrange,
    fontSize: 22,
    lineHeight: 26,
  },
  tabs: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  tab: {
    flex: 1,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Spacing.three,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  tabActive: {
    backgroundColor: Brand.glowBlue,
  },
  tabTextActive: {
    color: Brand.pureWhite,
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
  empty: {
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.five,
    borderRadius: Spacing.four,
  },
  list: {
    gap: Spacing.two,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.two,
    borderRadius: Spacing.three,
  },
  poster: {
    width: 58,
    height: 87,
    borderRadius: Spacing.two,
  },
  cardCopy: {
    flex: 1,
    gap: Spacing.half,
  },
  cardHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  counterparty: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.half,
  },
  profileLink: {
    color: Brand.softViolet,
  },
  title: {
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: Spacing.one,
    backgroundColor: Brand.sunsetOrange,
  },
  warning: {
    color: Brand.sunsetOrange,
    textAlign: 'center',
  },
  message: {
    fontStyle: 'italic',
  },
  pressed: {
    opacity: 0.8,
  },
});
