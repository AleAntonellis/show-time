import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, MaxContentWidth, Spacing } from '@/constants/theme';
import {
  getMovieWatchSource,
  type LibraryItem,
  type MovieWatchSource,
} from '@/services/library';

export type MovieWatchChoiceMode = 'record' | 'reclassify';

export function MovieWatchChoiceModal({
  item,
  mode,
  onSelect,
  onClose,
}: {
  item: LibraryItem;
  mode: MovieWatchChoiceMode;
  onSelect: (source: MovieWatchSource) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const currentSource = mode === 'reclassify' ? getMovieWatchSource(item) : null;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <ThemedView
          type="backgroundElement"
          style={[
            styles.card,
            { marginBottom: insets.bottom + Spacing.three },
          ]}>
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <ThemedText type="smallBold" numberOfLines={2}>
                {mode === 'reclassify'
                  ? `Come vuoi classificare “${item.title}”?`
                  : `Quando hai visto “${item.title}”?`}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {mode === 'reclassify'
                  ? 'La visione resta una sola: cambia soltanto la sua origine.'
                  : 'La scelta determina se il film entra nella cronologia e nei trend.'}
              </ThemedText>
            </View>
            <Pressable onPress={onClose} hitSlop={8}>
              <ThemedText type="smallBold">Chiudi</ThemedText>
            </Pressable>
          </View>

          <Pressable onPress={() => onSelect('tracked')} style={styles.tracked}>
            <ThemedText type="smallBold" style={styles.trackedText}>
              Visto oggi
              {currentSource === 'tracked' ? ' · Attuale' : ''}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {mode === 'reclassify'
                ? 'Registra la data di oggi e include la visione nelle statistiche mensili.'
                : 'Apre data, nota e voto. Puoi anche registrare soltanto la visione.'}
            </ThemedText>
          </Pressable>

          <Pressable onPress={() => onSelect('imported')} style={styles.imported}>
            <ThemedText type="smallBold" style={styles.importedText}>
              Già visto prima di ShowTime
              {currentSource === 'imported' ? ' · Attuale' : ''}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {mode === 'reclassify'
                ? 'Rimuove la data dalla cronologia, ma conserva il conteggio e le ore.'
                : 'Conta nel catalogo e nelle ore totali, senza inventare una data.'}
            </ThemedText>
          </Pressable>
        </ThemedView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: Spacing.three,
    backgroundColor: 'rgba(4,2,18,0.72)',
  },
  card: {
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: Spacing.four,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  headerCopy: {
    flex: 1,
    gap: Spacing.half,
  },
  tracked: {
    gap: Spacing.one,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    backgroundColor: 'rgba(47,107,255,0.16)',
  },
  trackedText: {
    color: Brand.glowBlue,
  },
  imported: {
    gap: Spacing.one,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    backgroundColor: 'rgba(106,76,255,0.16)',
  },
  importedText: {
    color: Brand.softViolet,
  },
});
