import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
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
import {
  getReminderCenter,
  type ReminderCenter,
  type UpcomingReminder,
} from '@/services/reminders';

const WINDOW_DAYS = 10;

function formatDate(value: string): string {
  const [year, month, day] = value.split('-');
  return day && month && year ? `${day}/${month}/${year}` : value;
}

function relativeDate(daysUntil: number): string {
  if (daysUntil === 0) {
    return 'Oggi';
  }
  if (daysUntil === 1) {
    return 'Domani';
  }
  return `Tra ${daysUntil} giorni`;
}

function openReminder(reminder: UpcomingReminder) {
  router.push({
    pathname: '/title',
    params: {
      mediaType: reminder.mediaType,
      id: String(reminder.tmdbId),
      from: '/reminders',
    },
  });
}

export default function RemindersTabScreen() {
  const insets = useSafeAreaInsets();
  const { session, configured } = useAuth();
  const requestId = useRef(0);
  const [center, setCenter] = useState<ReminderCenter | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (forceRefresh: boolean) => {
      if (!configured || !session) {
        setLoading(false);
        return;
      }
      const currentRequest = requestId.current + 1;
      requestId.current = currentRequest;
      if (forceRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      try {
        const result = await getReminderCenter({
          windowDays: WINDOW_DAYS,
          forceRefresh,
        });
        if (requestId.current === currentRequest) {
          setCenter(result);
        }
      } catch (err) {
        if (requestId.current === currentRequest) {
          setError(
            err instanceof Error ? err.message : 'Impossibile controllare le uscite',
          );
        }
      } finally {
        if (requestId.current === currentRequest) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [configured, session],
  );

  useFocusEffect(
    useCallback(() => {
      void load(false);
      return () => {
        requestId.current += 1;
      };
    }, [load]),
  );

  if (configured && !session) {
    return null;
  }

  const today = center?.reminders.filter((reminder) => reminder.daysUntil === 0) ?? [];
  const verySoon =
    center?.reminders.filter(
      (reminder) => reminder.daysUntil > 0 && reminder.daysUntil <= 3,
    ) ?? [];
  const later =
    center?.reminders.filter((reminder) => reminder.daysUntil > 3) ?? [];
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
              Prossimi {WINDOW_DAYS} giorni
            </ThemedText>
            <ThemedText type="subtitle" style={styles.heroTitle}>
              Reminder
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Film, nuove stagioni ed episodi dei titoli presenti in libreria.
            </ThemedText>
          </View>
          <View style={styles.countBadge}>
            <ThemedText type="smallBold" style={styles.countValue}>
              {center?.reminders.length ?? 0}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              in arrivo
            </ThemedText>
          </View>
        </ThemedView>

        <View style={styles.actions}>
          <ThemedText type="small" themeColor="textSecondary">
            {center
              ? `Aggiornato alle ${new Date(center.checkedAt).toLocaleTimeString('it-IT', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}`
              : 'Controllo delle date TMDB'}
          </ThemedText>
          <Pressable
            onPress={() => load(true)}
            disabled={refreshing}
            style={({ pressed }) => [styles.refreshButton, pressed && styles.pressed]}>
            {refreshing ? (
              <ActivityIndicator color={Brand.glowBlue} size="small" />
            ) : (
              <ThemedText type="smallBold" style={styles.refreshText}>
                Aggiorna
              </ThemedText>
            )}
          </Pressable>
        </View>

        {!configured ? (
          <StateMessage
            title="Supabase non configurato"
            body="Configura la libreria per ricevere reminder sui titoli salvati."
          />
        ) : loading && !center ? (
          <View style={styles.center}>
            <ActivityIndicator color={Brand.glowBlue} />
          </View>
        ) : error ? (
          <StateMessage title="Ops" body={error} />
        ) : center && center.reminders.length === 0 ? (
          <ThemedView type="backgroundElement" style={styles.empty}>
            <ThemedText type="smallBold">Nessuna uscita imminente</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.centerText}>
              Nei prossimi {WINDOW_DAYS} giorni non risultano film, nuove stagioni o
              episodi per i titoli della tua libreria.
            </ThemedText>
          </ThemedView>
        ) : (
          <>
            <ReminderSection title="Oggi" reminders={today} />
            <ReminderSection title="Molto presto" reminders={verySoon} />
            <ReminderSection title={`Entro ${WINDOW_DAYS} giorni`} reminders={later} />
          </>
        )}

        {center && center.failures.length > 0 && (
          <ThemedView type="backgroundElement" style={styles.failures}>
            <ThemedText type="smallBold" style={styles.warning}>
              Alcuni titoli non sono stati controllati
            </ThemedText>
            {center.failures.slice(0, 4).map((failure) => (
              <ThemedText key={failure} type="small" themeColor="textSecondary">
                {failure}
              </ThemedText>
            ))}
          </ThemedView>
        )}

        <ThemedText type="small" themeColor="textSecondary" style={styles.disclaimer}>
          Le date provengono da TMDB e possono essere modificate dai distributori.
        </ThemedText>
      </ScrollView>
    </ThemedView>
  );
}

function ReminderSection({
  title,
  reminders,
}: {
  title: string;
  reminders: UpcomingReminder[];
}) {
  if (reminders.length === 0) {
    return null;
  }
  return (
    <View style={styles.section}>
      <ThemedText type="smallBold" themeColor="textSecondary">
        {title} · {reminders.length}
      </ThemedText>
      {reminders.map((reminder) => (
        <Pressable
          key={reminder.id}
          onPress={() => openReminder(reminder)}
          style={({ pressed }) => pressed && styles.pressed}>
          <ThemedView type="backgroundElement" style={styles.card}>
            {reminder.posterUrl ? (
              <Image
                source={{ uri: reminder.posterUrl }}
                contentFit="cover"
                style={styles.poster}
              />
            ) : (
              <ThemedView type="backgroundSelected" style={styles.poster} />
            )}
            <View style={styles.cardCopy}>
              <View style={styles.cardHeading}>
                <ThemedText type="smallBold" numberOfLines={1} style={styles.cardTitle}>
                  {reminder.title}
                </ThemedText>
                <ThemedText type="small" style={styles.relativeDate}>
                  {relativeDate(reminder.daysUntil)}
                </ThemedText>
              </View>
              <ThemedText type="smallBold" style={styles.headline}>
                {reminder.headline}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
                {reminder.description}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {formatDate(reminder.date)}
              </ThemedText>
            </View>
            <ThemedText type="small" themeColor="textSecondary">
              ›
            </ThemedText>
          </ThemedView>
        </Pressable>
      ))}
    </View>
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
    borderRadius: Spacing.four,
    padding: Spacing.four,
  },
  heroCopy: {
    flex: 1,
    gap: Spacing.one,
  },
  heroTitle: {
    fontSize: 30,
    lineHeight: 36,
  },
  countBadge: {
    minWidth: 88,
    alignItems: 'center',
    gap: Spacing.half,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    backgroundColor: 'rgba(255,106,44,0.14)',
  },
  countValue: {
    color: Brand.sunsetOrange,
    fontSize: 24,
    lineHeight: 28,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  refreshButton: {
    minWidth: 88,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Spacing.three,
    backgroundColor: 'rgba(47,107,255,0.16)',
    paddingHorizontal: Spacing.three,
  },
  refreshText: {
    color: Brand.glowBlue,
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
    borderRadius: Spacing.four,
    padding: Spacing.five,
  },
  section: {
    gap: Spacing.two,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderRadius: Spacing.three,
    padding: Spacing.two,
  },
  poster: {
    width: 56,
    height: 84,
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
  cardTitle: {
    flex: 1,
  },
  relativeDate: {
    color: Brand.sunsetOrange,
  },
  headline: {
    color: Brand.glowBlue,
  },
  failures: {
    gap: Spacing.one,
    borderRadius: Spacing.three,
    padding: Spacing.three,
  },
  warning: {
    color: Brand.sunsetOrange,
  },
  disclaimer: {
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.8,
  },
});
