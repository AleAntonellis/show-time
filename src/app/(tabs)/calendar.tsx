import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
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
  getCalendarMonth,
  type CalendarEvent,
  type CalendarMonth,
} from '@/services/calendar';

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
const MAX_MONTHS_AHEAD = 12;

function dateString(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function currentDateString(): string {
  const now = new Date();
  return dateString(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

function monthLabel(year: number, month: number): string {
  const formatted = new Intl.DateTimeFormat('it-IT', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, month - 1, 1));
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function fullDateLabel(value: string): string {
  const [year, month, day] = value.split('-').map(Number);
  const formatted = new Intl.DateTimeFormat('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(year, month - 1, day));
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function openEvent(event: CalendarEvent) {
  router.push({
    pathname: '/title',
    params: {
      mediaType: 'tv',
      id: String(event.tmdbId),
      from: '/calendar',
    },
  });
}

export default function CalendarTabScreen() {
  const insets = useSafeAreaInsets();
  const { session, configured } = useAuth();
  const now = useMemo(() => new Date(), []);
  const initialMonth = useMemo(
    () => new Date(now.getFullYear(), now.getMonth(), 1),
    [now],
  );
  const [displayedMonth, setDisplayedMonth] = useState(initialMonth);
  const [selectedDate, setSelectedDate] = useState(currentDateString);
  const [calendar, setCalendar] = useState<CalendarMonth | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);
  const year = displayedMonth.getFullYear();
  const month = displayedMonth.getMonth() + 1;

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
        const result = await getCalendarMonth({
          year,
          month,
          forceRefresh,
        });
        if (requestId.current === currentRequest) {
          setCalendar(result);
        }
      } catch (err) {
        if (requestId.current === currentRequest) {
          setError(
            err instanceof Error ? err.message : 'Impossibile caricare il calendario',
          );
        }
      } finally {
        if (requestId.current === currentRequest) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [configured, month, session, year],
  );

  useFocusEffect(
    useCallback(() => {
      void load(false);
      return () => {
        requestId.current += 1;
      };
    }, [load]),
  );

  const monthPrefix = `${year}-${String(month).padStart(2, '0')}`;
  const today = currentDateString();
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstWeekday = (new Date(year, month - 1, 1).getDay() + 6) % 7;
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_value, index) => index + 1),
  ];
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }
  const eventCountByDate = new Map<string, number>();
  for (const event of calendar?.events ?? []) {
    eventCountByDate.set(event.date, (eventCountByDate.get(event.date) ?? 0) + 1);
  }
  const selectedEvents =
    calendar?.events.filter((event) => event.date === selectedDate) ?? [];
  const currentMonthIndex = now.getFullYear() * 12 + now.getMonth();
  const displayedMonthIndex = year * 12 + (month - 1);
  const canGoPrevious = displayedMonthIndex > currentMonthIndex;
  const canGoNext = displayedMonthIndex < currentMonthIndex + MAX_MONTHS_AHEAD;
  const topInset = Platform.OS === 'web' ? WebTabTopInset : insets.top + Spacing.three;
  const bottomInset = insets.bottom + BottomTabInset + Spacing.four;

  function changeMonth(offset: number) {
    const next = new Date(year, month - 1 + offset, 1);
    setDisplayedMonth(next);
    const isCurrent =
      next.getFullYear() === now.getFullYear() && next.getMonth() === now.getMonth();
    setSelectedDate(
      isCurrent
        ? today
        : dateString(next.getFullYear(), next.getMonth() + 1, 1),
    );
  }

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
              Prossime uscite
            </ThemedText>
            <ThemedText type="subtitle" style={styles.heroTitle}>
              Calendario
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Gli episodi futuri delle serie presenti nella tua libreria.
            </ThemedText>
          </View>
          <View style={styles.countBadge}>
            <ThemedText type="smallBold" style={styles.countValue}>
              {calendar?.events.length ?? 0}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              nel mese
            </ThemedText>
          </View>
        </ThemedView>

        <ThemedView type="backgroundElement" style={styles.calendarPanel}>
          <View style={styles.monthHeader}>
            <Pressable
              onPress={() => changeMonth(-1)}
              disabled={!canGoPrevious}
              hitSlop={8}
              style={[styles.monthButton, !canGoPrevious && styles.disabled]}>
              <ThemedText type="smallBold">‹</ThemedText>
            </Pressable>
            <ThemedText type="smallBold">{monthLabel(year, month)}</ThemedText>
            <Pressable
              onPress={() => changeMonth(1)}
              disabled={!canGoNext}
              hitSlop={8}
              style={[styles.monthButton, !canGoNext && styles.disabled]}>
              <ThemedText type="smallBold">›</ThemedText>
            </Pressable>
          </View>

          <View style={styles.weekRow}>
            {WEEKDAYS.map((weekday) => (
              <ThemedText
                key={weekday}
                type="small"
                themeColor="textSecondary"
                style={styles.weekday}>
                {weekday}
              </ThemedText>
            ))}
          </View>

          <View style={styles.grid}>
            {cells.map((day, index) => {
              if (day == null) {
                return <View key={`empty-${index}`} style={styles.dayCell} />;
              }
              const date = `${monthPrefix}-${String(day).padStart(2, '0')}`;
              const selected = selectedDate === date;
              const past = date < today;
              const eventCount = eventCountByDate.get(date) ?? 0;
              return (
                <Pressable
                  key={date}
                  onPress={() => setSelectedDate(date)}
                  disabled={past}
                  style={[
                    styles.dayCell,
                    selected && styles.dayCellSelected,
                    past && styles.dayCellPast,
                  ]}>
                  <ThemedText
                    type="small"
                    style={selected ? styles.dayTextSelected : undefined}>
                    {day}
                  </ThemedText>
                  {eventCount > 0 && (
                    <View style={styles.eventDot}>
                      {eventCount > 1 && (
                        <ThemedText type="small" style={styles.eventCount}>
                          {eventCount}
                        </ThemedText>
                      )}
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>

          <View style={styles.calendarFooter}>
            <ThemedText type="small" themeColor="textSecondary">
              {calendar
                ? `Aggiornato alle ${new Date(calendar.checkedAt).toLocaleTimeString('it-IT', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}`
                : 'Caricamento palinsesto TMDB'}
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
        </ThemedView>

        {!configured ? (
          <StateMessage
            title="Supabase non configurato"
            body="Configura la libreria per costruire il calendario delle tue serie."
          />
        ) : loading && !calendar ? (
          <View style={styles.center}>
            <ActivityIndicator color={Brand.glowBlue} />
          </View>
        ) : error ? (
          <StateMessage title="Ops" body={error} />
        ) : (
          <View style={styles.agenda}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              {fullDateLabel(selectedDate)} · {selectedEvents.length}
            </ThemedText>
            {selectedEvents.length === 0 ? (
              <ThemedView type="backgroundElement" style={styles.emptyAgenda}>
                <ThemedText type="small" themeColor="textSecondary">
                  Nessuna uscita prevista per questo giorno.
                </ThemedText>
              </ThemedView>
            ) : (
              selectedEvents.map((event) => (
                <Pressable
                  key={event.id}
                  onPress={() => openEvent(event)}
                  style={({ pressed }) => pressed && styles.pressed}>
                  <ThemedView type="backgroundElement" style={styles.eventCard}>
                    {event.posterUrl ? (
                      <Image
                        source={{ uri: event.posterUrl }}
                        contentFit="cover"
                        style={styles.poster}
                      />
                    ) : (
                      <ThemedView type="backgroundSelected" style={styles.poster} />
                    )}
                    <View style={styles.eventCopy}>
                      <ThemedText type="smallBold" numberOfLines={1}>
                        {event.title}
                      </ThemedText>
                      <ThemedText type="smallBold" style={styles.eventHeadline}>
                        {event.headline}
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {event.description}
                      </ThemedText>
                    </View>
                    <ThemedText type="small" themeColor="textSecondary">
                      ›
                    </ThemedText>
                  </ThemedView>
                </Pressable>
              ))
            )}
          </View>
        )}

        {calendar && calendar.failures.length > 0 && (
          <ThemedView type="backgroundElement" style={styles.failures}>
            <ThemedText type="smallBold" style={styles.warning}>
              Calendario parziale
            </ThemedText>
            {calendar.failures.slice(0, 4).map((failure) => (
              <ThemedText key={failure} type="small" themeColor="textSecondary">
                {failure}
              </ThemedText>
            ))}
          </ThemedView>
        )}

        <ThemedText type="small" themeColor="textSecondary" style={styles.disclaimer}>
          Sono mostrati solo episodi futuri con una data pubblicata da TMDB.
        </ThemedText>
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
    backgroundColor: 'rgba(47,107,255,0.14)',
  },
  countValue: {
    color: Brand.glowBlue,
    fontSize: 24,
    lineHeight: 28,
  },
  calendarPanel: {
    borderRadius: Spacing.four,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  monthButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Spacing.three,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  disabled: {
    opacity: 0.3,
  },
  weekRow: {
    flexDirection: 'row',
  },
  weekday: {
    width: `${100 / 7}%`,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.half,
    borderRadius: Spacing.two,
  },
  dayCellSelected: {
    backgroundColor: Brand.glowBlue,
  },
  dayCellPast: {
    opacity: 0.28,
  },
  dayTextSelected: {
    color: Brand.pureWhite,
  },
  eventDot: {
    minWidth: 6,
    height: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Spacing.one,
    backgroundColor: Brand.sunsetOrange,
  },
  eventCount: {
    color: Brand.pureWhite,
    fontSize: 9,
    lineHeight: 10,
  },
  calendarFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  refreshButton: {
    minWidth: 88,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    backgroundColor: 'rgba(47,107,255,0.16)',
  },
  refreshText: {
    color: Brand.glowBlue,
  },
  agenda: {
    gap: Spacing.two,
  },
  emptyAgenda: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
  },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderRadius: Spacing.three,
    padding: Spacing.two,
  },
  poster: {
    width: 52,
    height: 78,
    borderRadius: Spacing.two,
  },
  eventCopy: {
    flex: 1,
    gap: Spacing.half,
  },
  eventHeadline: {
    color: Brand.glowBlue,
  },
  failures: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  warning: {
    color: Brand.sunsetOrange,
  },
  disclaimer: {
    textAlign: 'center',
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
