import { useEffect, useState } from 'react';
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
import { Brand, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Viewing } from '@/services/library';

export type ViewingDraft = {
  watchedOn: string;
  note: string | null;
  rating: number | null;
};

type Props = {
  title: string;
  description: string;
  loadViewings: () => Promise<Viewing[]>;
  createViewing: (draft: ViewingDraft) => Promise<Viewing>;
  deleteViewing: (viewingId: string) => Promise<void>;
  onClose?: (changed: boolean) => void;
  onChanged?: () => void;
  embedded?: boolean;
};

function today(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isValidDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return false;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
  );
}

function formatDate(value: string): string {
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}

export function ViewingHistory({
  title,
  description,
  loadViewings,
  createViewing,
  deleteViewing,
  onClose,
  onChanged,
  embedded = false,
}: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [viewings, setViewings] = useState<Viewing[]>([]);
  const [watchedOn, setWatchedOn] = useState(today);
  const [rating, setRating] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    let cancelled = false;

    loadViewings()
      .then((rows) => {
        if (!cancelled) {
          setViewings(rows);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Impossibile caricare le visioni');
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
  }, [loadViewings]);

  function validateRating(): number | null {
    const normalized = rating.trim().replace(',', '.');
    if (!normalized) {
      return null;
    }
    const value = Number(normalized);
    if (!Number.isFinite(value) || value < 0 || value > 10) {
      throw new Error('Il voto deve essere un numero da 0 a 10.');
    }
    return Math.round(value * 10) / 10;
  }

  async function save() {
    if (saving) {
      return;
    }
    if (!isValidDate(watchedOn)) {
      setError('Inserisci una data valida nel formato AAAA-MM-GG.');
      return;
    }

    let parsedRating: number | null;
    try {
      parsedRating = validateRating();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Voto non valido');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const viewing = await createViewing({
        watchedOn,
        note: note.trim() || null,
        rating: parsedRating,
      });
      setViewings((previous) =>
        [...previous, viewing].sort(
          (a, b) =>
            b.watchedOn.localeCompare(a.watchedOn) || b.createdAt.localeCompare(a.createdAt),
        ),
      );
      setWatchedOn(today());
      setRating('');
      setNote('');
      setDirty(true);
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossibile salvare la visione');
    } finally {
      setSaving(false);
    }
  }

  async function remove(viewingId: string) {
    if (removingId) {
      return;
    }
    setRemovingId(viewingId);
    setError(null);
    try {
      await deleteViewing(viewingId);
      setViewings((previous) => previous.filter((viewing) => viewing.id !== viewingId));
      setDirty(true);
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossibile eliminare la visione');
    } finally {
      setRemovingId(null);
    }
  }

  function close() {
    onClose?.(dirty);
  }

  const historyContent = (
    <>
      <ThemedView
        type={embedded ? 'backgroundSelected' : 'backgroundElement'}
        style={styles.form}>
        <ThemedText type="smallBold">Registra una visione</ThemedText>
        <View style={styles.fieldsRow}>
          <View style={styles.dateField}>
            <ThemedText type="small" themeColor="textSecondary">
              Data
            </ThemedText>
            <TextInput
              value={watchedOn}
              onChangeText={setWatchedOn}
              placeholder="AAAA-MM-GG"
              placeholderTextColor={theme.textSecondary}
              inputMode="numeric"
              maxLength={10}
              style={[
                styles.input,
                { color: theme.text, borderColor: theme.backgroundSelected },
              ]}
            />
          </View>
          <View style={styles.ratingField}>
            <ThemedText type="small" themeColor="textSecondary">
              Voto /10
            </ThemedText>
            <TextInput
              value={rating}
              onChangeText={setRating}
              placeholder="8,5"
              placeholderTextColor={theme.textSecondary}
              inputMode="decimal"
              maxLength={4}
              style={[
                styles.input,
                { color: theme.text, borderColor: theme.backgroundSelected },
              ]}
            />
          </View>
        </View>
        <ThemedText type="small" themeColor="textSecondary">
          Nota
        </ThemedText>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Com'è stata questa visione?"
          placeholderTextColor={theme.textSecondary}
          multiline
          maxLength={1000}
          textAlignVertical="top"
          style={[
            styles.input,
            styles.noteInput,
            { color: theme.text, borderColor: theme.backgroundSelected },
          ]}
        />
        <Pressable
          onPress={save}
          disabled={saving}
          style={({ pressed }) => [
            styles.saveButton,
            pressed && styles.pressed,
            saving && styles.disabled,
          ]}>
          {saving ? (
            <ActivityIndicator color={Brand.pureWhite} size="small" />
          ) : (
            <ThemedText type="smallBold" style={styles.buttonText}>
              Salva visione
            </ThemedText>
          )}
        </Pressable>
      </ThemedView>

      {error && (
        <ThemedText type="small" style={styles.error}>
          {error}
        </ThemedText>
      )}

      <ThemedText type="smallBold" themeColor="textSecondary">
        Storico · {viewings.length}
      </ThemedText>
      {loading ? (
        <ActivityIndicator color={Brand.glowBlue} style={styles.loader} />
      ) : viewings.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
          Nessuna visione registrata.
        </ThemedText>
      ) : (
        viewings.map((viewing) => (
          <ThemedView
            key={viewing.id}
            type={embedded ? 'backgroundSelected' : 'backgroundElement'}
            style={styles.viewing}>
            <View style={styles.viewingHeader}>
              <ThemedText type="smallBold">{formatDate(viewing.watchedOn)}</ThemedText>
              <View style={styles.viewingActions}>
                {viewing.rating != null && (
                  <ThemedText type="small" style={styles.rating}>
                    ★ {viewing.rating.toFixed(1)}
                  </ThemedText>
                )}
                <Pressable
                  onPress={() => remove(viewing.id)}
                  disabled={removingId != null}
                  hitSlop={8}>
                  {removingId === viewing.id ? (
                    <ActivityIndicator color={theme.textSecondary} size="small" />
                  ) : (
                    <ThemedText type="small" themeColor="textSecondary">
                      Elimina
                    </ThemedText>
                  )}
                </Pressable>
              </View>
            </View>
            {viewing.note ? <ThemedText type="small">{viewing.note}</ThemedText> : null}
          </ThemedView>
        ))
      )}
    </>
  );

  if (embedded) {
    return <View style={styles.embedded}>{historyContent}</View>;
  }

  return (
    <Modal visible animationType="slide" onRequestClose={close}>
      <ThemedView style={styles.container}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.inner, { paddingTop: insets.top + Spacing.three }]}>
            <View style={styles.header}>
              <View style={styles.headerText}>
                <ThemedText type="smallBold" numberOfLines={2}>
                  {title}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {description}
                </ThemedText>
              </View>
              <Pressable onPress={close} hitSlop={8} style={styles.close}>
                <ThemedText type="smallBold">Chiudi</ThemedText>
              </Pressable>
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[
                styles.content,
                { paddingBottom: insets.bottom + Spacing.five },
              ]}>
              {historyContent}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inner: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  headerText: {
    flex: 1,
    gap: Spacing.half,
  },
  close: {
    paddingVertical: Spacing.one,
  },
  content: {
    gap: Spacing.three,
  },
  embedded: {
    gap: Spacing.two,
    paddingTop: Spacing.two,
  },
  form: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  fieldsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  dateField: {
    flex: 2,
    gap: Spacing.one,
  },
  ratingField: {
    flex: 1,
    gap: Spacing.one,
  },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  noteInput: {
    minHeight: 96,
  },
  saveButton: {
    minHeight: 44,
    borderRadius: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Brand.glowBlue,
  },
  buttonText: {
    color: Brand.pureWhite,
  },
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.6,
  },
  error: {
    color: Brand.sunsetOrange,
  },
  loader: {
    paddingVertical: Spacing.five,
  },
  empty: {
    textAlign: 'center',
    paddingVertical: Spacing.four,
  },
  viewing: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  viewingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  viewingActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  rating: {
    color: Brand.sunsetOrange,
  },
});
