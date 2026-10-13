import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
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
import { ExpandableQuotedText } from '@/components/expandable-quoted-text';
import {
  MediaFilter,
  type MediaFilterValue,
} from '@/components/media-filter';
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
  getDiaryEntries,
  updateDiaryEntryNote,
  type DiaryEntry,
} from '@/services/statistics';

function formatDay(value: string): string {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const formatted = new Intl.DateTimeFormat('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function openEntry(entry: DiaryEntry) {
  router.push({
    pathname: '/title',
    params: {
      mediaType: entry.mediaType,
      id: String(entry.tmdbId),
      from: '/diary',
    },
  });
}

export default function DiaryTabScreen() {
  const insets = useSafeAreaInsets();
  const { session, configured } = useAuth();
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [filter, setFilter] = useState<MediaFilterValue>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingEntry, setEditingEntry] = useState<DiaryEntry | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!configured || !session) {
        setLoading(false);
        return;
      }
      let cancelled = false;
      setLoading(true);
      setError(null);

      getDiaryEntries()
        .then((nextEntries) => {
          if (!cancelled) {
            setEntries(nextEntries);
          }
        })
        .catch((err: unknown) => {
          if (!cancelled) {
            setError(err instanceof Error ? err.message : 'Impossibile caricare il Diario');
          }
        })
        .finally(() => {
          if (!cancelled) {
            setLoading(false);
          }
        });

      return () => {
        cancelled = true;
      };
    }, [configured, session]),
  );

  const filteredEntries = useMemo(
    () =>
      filter === 'all'
        ? entries
        : entries.filter((entry) => entry.mediaType === filter),
    [entries, filter],
  );
  const groups = useMemo(() => {
    const grouped = new Map<string, DiaryEntry[]>();
    for (const entry of filteredEntries) {
      const current = grouped.get(entry.watchedOn) ?? [];
      current.push(entry);
      grouped.set(entry.watchedOn, current);
    }
    return Array.from(grouped, ([date, dayEntries]) => ({ date, entries: dayEntries }));
  }, [filteredEntries]);
  const topInset = Platform.OS === 'web' ? WebTabTopInset : insets.top + Spacing.three;
  const bottomInset = insets.bottom + BottomTabInset + Spacing.four;

  async function saveNote(note: string) {
    if (!editingEntry) {
      return;
    }
    const updatedNote = await updateDiaryEntryNote(
      editingEntry.entryType,
      editingEntry.viewingId,
      note,
    );
    setEntries((current) =>
      current.map((entry) =>
        entry.id === editingEntry.id
          ? { ...entry, note: updatedNote }
          : entry,
      ),
    );
    setEditingEntry(null);
  }

  if (configured && !session) {
    return null;
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingTop: topInset, paddingBottom: bottomInset },
        ]}>
        <ThemedView type="backgroundElement" style={styles.hero}>
          <View style={styles.heroCopy}>
            <ThemedText type="small" themeColor="textSecondary">
              Ricordi di visione
            </ThemedText>
            <ThemedText type="subtitle" style={styles.heroTitle}>
              Diario
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Le visioni a cui hai assegnato un voto o lasciato un commento.
            </ThemedText>
          </View>
          <View style={styles.countBadge}>
            <ThemedText type="smallBold" style={styles.countValue}>
              {entries.length}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              ricordi
            </ThemedText>
          </View>
        </ThemedView>

        <MediaFilter value={filter} onChange={setFilter} />

        {!configured ? (
          <StateMessage
            title="Supabase non configurato"
            body="Configura la libreria per costruire il tuo Diario."
          />
        ) : loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={Brand.glowBlue} />
          </View>
        ) : error ? (
          <StateMessage title="Ops" body={error} />
        ) : groups.length === 0 ? (
          <ThemedView type="backgroundElement" style={styles.empty}>
            <ThemedText type="smallBold">Nessun ricordo da mostrare</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.centerText}>
              Aggiungi una nota o un voto a una visione per farla comparire qui.
            </ThemedText>
          </ThemedView>
        ) : (
          groups.map((group) => (
            <View key={group.date} style={styles.day}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                {formatDay(group.date)}
              </ThemedText>
              {group.entries.map((entry) => (
                <ThemedView
                  key={entry.id}
                  type="backgroundElement"
                  style={styles.entryCard}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Apri ${entry.title}`}
                    onPress={() => openEntry(entry)}
                    style={({ pressed }) => [
                      styles.entry,
                      pressed && styles.pressed,
                    ]}>
                    {entry.posterUrl ? (
                      <Image
                        source={{ uri: entry.posterUrl }}
                        contentFit="cover"
                        style={styles.poster}
                      />
                    ) : (
                      <ThemedView type="backgroundSelected" style={styles.poster} />
                    )}
                    <View style={styles.entryCopy}>
                      <View style={styles.entryHeading}>
                        <ThemedText type="smallBold" numberOfLines={1} style={styles.title}>
                          {entry.title}
                        </ThemedText>
                        {entry.rating != null && (
                          <ThemedText type="smallBold" style={styles.rating}>
                            ★ {entry.rating.toFixed(1)}
                          </ThemedText>
                        )}
                      </View>
                      <ThemedText type="small" themeColor="textSecondary">
                        {entry.detail}
                      </ThemedText>
                      {entry.note ? (
                        <ExpandableQuotedText text={entry.note} />
                      ) : (
                        <ThemedText type="small" themeColor="textSecondary">
                          Visione valutata senza commento.
                        </ThemedText>
                      )}
                    </View>
                    <ThemedText type="small" themeColor="textSecondary">
                      ›
                    </ThemedText>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${
                      entry.note ? 'Modifica' : 'Aggiungi'
                    } nota per ${entry.title}`}
                    onPress={() => setEditingEntry(entry)}
                    style={({ pressed }) => [
                      styles.editNoteButton,
                      pressed && styles.pressed,
                    ]}>
                    <ThemedText type="smallBold" style={styles.editNoteText}>
                      {entry.note ? 'Modifica nota' : 'Aggiungi nota'}
                    </ThemedText>
                  </Pressable>
                </ThemedView>
              ))}
            </View>
          ))
        )}
      </ScrollView>
      {editingEntry && (
        <DiaryNoteEditor
          entry={editingEntry}
          onClose={() => setEditingEntry(null)}
          onSave={saveNote}
        />
      )}
    </ThemedView>
  );
}

function DiaryNoteEditor({
  entry,
  onClose,
  onSave,
}: {
  entry: DiaryEntry;
  onClose: () => void;
  onSave: (note: string) => Promise<void>;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [note, setNote] = useState(entry.note ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const trimmedNote = note.trim();
  const unchanged = trimmedNote === (entry.note?.trim() ?? '');

  async function save() {
    if (!trimmedNote || unchanged || saving) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(trimmedNote);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Impossibile aggiornare la nota',
      );
      setSaving(false);
    }
  }

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={saving ? undefined : onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.editorBackdrop}>
        <ThemedView
          type="backgroundElement"
          style={[
            styles.editorCard,
            { marginBottom: insets.bottom + Spacing.three },
          ]}>
          <View style={styles.editorHeader}>
            <View style={styles.editorHeading}>
              <ThemedText type="smallBold" numberOfLines={2}>
                {entry.note ? 'Modifica nota' : 'Aggiungi nota'}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {entry.title} · {entry.detail}
              </ThemedText>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={onClose}
              disabled={saving}
              hitSlop={8}
              style={saving && styles.disabled}>
              <ThemedText type="smallBold">Chiudi</ThemedText>
            </Pressable>
          </View>

          <TextInput
            autoFocus
            value={note}
            onChangeText={setNote}
            placeholder="Com’è stata questa visione?"
            placeholderTextColor={theme.textSecondary}
            multiline
            maxLength={1000}
            textAlignVertical="top"
            style={[
              styles.noteInput,
              {
                color: theme.text,
                borderColor: theme.backgroundSelected,
              },
            ]}
          />
          <ThemedText
            type="small"
            themeColor="textSecondary"
            style={styles.characterCount}>
            {note.length}/1000
          </ThemedText>

          {error && (
            <ThemedText type="small" style={styles.error}>
              {error}
            </ThemedText>
          )}

          <View style={styles.editorActions}>
            <Pressable
              accessibilityRole="button"
              onPress={onClose}
              disabled={saving}
              style={({ pressed }) => [
                styles.cancelButton,
                pressed && styles.pressed,
                saving && styles.disabled,
              ]}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                Annulla
              </ThemedText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => void save()}
              disabled={!trimmedNote || unchanged || saving}
              style={({ pressed }) => [
                styles.saveButton,
                pressed && styles.pressed,
                (!trimmedNote || unchanged || saving) && styles.disabled,
              ]}>
              {saving ? (
                <ActivityIndicator color={Brand.pureWhite} size="small" />
              ) : (
                <ThemedText type="smallBold" style={styles.saveButtonText}>
                  Salva nota
                </ThemedText>
              )}
            </Pressable>
          </View>
        </ThemedView>
      </KeyboardAvoidingView>
    </Modal>
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
  scroll: {
    width: '100%',
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
    backgroundColor: 'rgba(106,76,255,0.16)',
  },
  countValue: {
    color: Brand.softViolet,
    fontSize: 24,
    lineHeight: 28,
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
  day: {
    gap: Spacing.two,
  },
  entryCard: {
    borderRadius: Spacing.three,
    overflow: 'hidden',
  },
  entry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.two,
  },
  poster: {
    width: 52,
    height: 78,
    borderRadius: Spacing.two,
  },
  entryCopy: {
    flex: 1,
    minWidth: 0,
    gap: Spacing.half,
  },
  entryHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  title: {
    flex: 1,
  },
  rating: {
    color: Brand.sunsetOrange,
  },
  editNoteButton: {
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.10)',
    paddingHorizontal: Spacing.three,
  },
  editNoteText: {
    color: Brand.glowBlue,
  },
  editorBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: Spacing.three,
    backgroundColor: 'rgba(4,2,18,0.72)',
  },
  editorCard: {
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.two,
    padding: Spacing.four,
    borderRadius: Spacing.four,
  },
  editorHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  editorHeading: {
    flex: 1,
    gap: Spacing.half,
  },
  noteInput: {
    minHeight: 140,
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  characterCount: {
    textAlign: 'right',
  },
  editorActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  cancelButton: {
    minHeight: 44,
    flexBasis: 120,
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Spacing.two,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  saveButton: {
    minHeight: 44,
    flexBasis: 140,
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Spacing.two,
    backgroundColor: Brand.glowBlue,
  },
  saveButtonText: {
    color: Brand.pureWhite,
  },
  disabled: {
    opacity: 0.6,
  },
  error: {
    color: Brand.sunsetOrange,
  },
  pressed: {
    opacity: 0.8,
  },
});
