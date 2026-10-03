import { useMemo, useState } from 'react';
import {
  Platform,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TitleSearchResults } from '@/components/title-search-results';
import {
  BottomTabInset,
  MaxContentWidth,
  Spacing,
  WebTabTopInset,
} from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { isTmdbConfigured, type Title } from '@/services/tmdb';

export default function SearchTabScreen() {
  const theme = useTheme();
  const safeAreaInsets = useSafeAreaInsets();
  const configured = useMemo(() => isTmdbConfigured(), []);
  const [query, setQuery] = useState('');

  const topInset =
    Platform.OS === 'web' ? WebTabTopInset : safeAreaInsets.top + Spacing.three;
  const bottomInset = safeAreaInsets.bottom + BottomTabInset + Spacing.four;

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.content, { paddingTop: topInset }]}>
        <ThemedText type="subtitle" style={styles.heading}>
          Cerca
        </ThemedText>

        <ThemedView type="backgroundElement" style={styles.searchBar}>
          <ThemedText type="small" themeColor="textSecondary">
            🔎
          </ThemedText>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Cerca film o serie TV…"
            placeholderTextColor={theme.textSecondary}
            style={[styles.input, { color: theme.text }]}
            autoCorrect={false}
            returnKeyType="search"
            editable={configured}
          />
        </ThemedView>

        <TitleSearchResults
          query={query}
          contentContainerStyle={{ paddingBottom: bottomInset }}
          onOpenTitle={(title: Title) =>
            router.push({
              pathname: '/title',
              params: {
                mediaType: title.mediaType,
                id: String(title.id),
                from: '/search',
              },
            })
          }
        />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  content: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
  heading: {
    textAlign: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Spacing.four,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: Spacing.one,
  },
});
