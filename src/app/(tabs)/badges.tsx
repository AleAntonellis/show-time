import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CinephileBadgePatch } from '@/components/cinephile-badge-patch';
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
  getMyBadgeCatalog,
  evaluateBadgesAndNotify,
  markMyBadgesSeen,
  type BadgeFamilyState,
  type BadgeLevelState,
} from '@/services/badges';

export default function BadgesTabScreen() {
  const insets = useSafeAreaInsets();
  const { configured, session } = useAuth();
  const [family, setFamily] = useState<BadgeFamilyState | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const load = useCallback(
    async (forceRefresh: boolean) => {
      if (!configured || !session) {
        setLoading(false);
        return;
      }
      if (forceRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      setWarning(null);

      try {
        const initialCatalog = await getMyBadgeCatalog();
        const initialFamily = initialCatalog.find(
          (item) => item.id === 'cinephile' && item.isActive,
        );
        if (!initialFamily) {
          throw new Error('Definizione Cinefilo non disponibile');
        }

        await evaluateBadgesAndNotify({
          badgeIds: ['cinephile'],
          backfill: initialFamily.evaluatedAt == null,
        });
        const nextCatalog = await getMyBadgeCatalog();
        const nextFamily = nextCatalog.find(
          (item) => item.id === 'cinephile' && item.isActive,
        );
        if (!nextFamily) {
          throw new Error('Stato Cinefilo non disponibile dopo la valutazione');
        }
        setFamily(nextFamily);

        try {
          await markMyBadgesSeen();
        } catch (markError) {
          setWarning(
            markError instanceof Error
              ? `Badge caricati, ma non segnati come letti: ${markError.message}`
              : 'Badge caricati, ma non segnati come letti',
          );
        }
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Impossibile caricare la Sala trofei',
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [configured, session],
  );

  useFocusEffect(
    useCallback(() => {
      void load(false);
    }, [load]),
  );

  if (configured && !session) {
    return null;
  }

  const topInset =
    Platform.OS === 'web' ? WebTabTopInset : insets.top + Spacing.three;
  const bottomInset = insets.bottom + BottomTabInset + Spacing.four;
  const unlockedLevels =
    family?.levels.filter((level) => level.unlockedAt != null) ?? [];
  const nextLevel =
    family?.levels.find((level) => level.unlockedAt == null) ?? null;
  const progress = family?.maxProgress ?? 0;
  const progressTarget = nextLevel?.threshold ?? progress;
  const progressRatio =
    progressTarget > 0 ? Math.min(progress / progressTarget, 1) : 1;

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
              Il tuo percorso ShowTime
            </ThemedText>
            <ThemedText type="subtitle">Sala trofei</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Ogni patch racconta un pezzo della tua storia davanti allo
              schermo.
            </ThemedText>
          </View>
          <View style={styles.heroCount}>
            <ThemedText type="subtitle" style={styles.heroCountValue}>
              {unlockedLevels.length}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              su {family?.levels.length ?? 4}
            </ThemedText>
          </View>
        </ThemedView>

        {!configured ? (
          <StateMessage
            title="Supabase non configurato"
            body="Configura Supabase per sincronizzare badge e progressi."
          />
        ) : loading && !family ? (
          <View style={styles.center}>
            <ActivityIndicator color={Brand.glowBlue} />
          </View>
        ) : error && !family ? (
          <StateMessage title="Sala trofei non disponibile" body={error}>
            <Pressable onPress={() => load(true)} hitSlop={8}>
              <ThemedText type="smallBold" style={styles.retryText}>
                Riprova
              </ThemedText>
            </Pressable>
          </StateMessage>
        ) : family ? (
          <>
            {error && (
              <ThemedText type="small" style={styles.errorText}>
                Aggiornamento non riuscito: {error}
              </ThemedText>
            )}
            {warning && (
              <ThemedText type="small" style={styles.warningText}>
                {warning}
              </ThemedText>
            )}

            <ThemedView type="backgroundElement" style={styles.familyCard}>
              <View style={styles.familyHeading}>
                <View style={styles.familyCopy}>
                  <ThemedText type="subtitle">{family.name}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {family.description}
                  </ThemedText>
                </View>
                <Pressable
                  onPress={() => load(true)}
                  disabled={refreshing}
                  hitSlop={8}
                  style={({ pressed }) => [
                    styles.refreshButton,
                    pressed && styles.pressed,
                  ]}>
                  {refreshing ? (
                    <ActivityIndicator color={Brand.glowBlue} size="small" />
                  ) : (
                    <ThemedText type="smallBold" style={styles.refreshText}>
                      Aggiorna
                    </ThemedText>
                  )}
                </Pressable>
              </View>

              <View style={styles.progressHeading}>
                <ThemedText type="smallBold">
                  {nextLevel
                    ? `Prossimo: ${nextLevel.name}`
                    : 'Massimo livello raggiunto'}
                </ThemedText>
                <ThemedText type="smallBold" style={styles.progressValue}>
                  {nextLevel
                    ? `${progress} / ${nextLevel.threshold}`
                    : String(progress)}
                </ThemedText>
              </View>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${progressRatio * 100}%` },
                  ]}
                />
              </View>

              <View style={styles.levelGrid}>
                {family.levels.map((level) => (
                  <LevelCard
                    key={`${family.id}-${level.level}`}
                    level={level}
                    isNext={level.level === nextLevel?.level}
                    progress={progress}
                  />
                ))}
              </View>
            </ThemedView>
          </>
        ) : null}
      </ScrollView>
    </ThemedView>
  );
}

function LevelCard({
  level,
  isNext,
  progress,
}: {
  level: BadgeLevelState;
  isNext: boolean;
  progress: number;
}) {
  const unlocked = level.unlockedAt != null;
  const state = unlocked ? 'unlocked' : isNext ? 'next' : 'locked';

  return (
    <View style={[styles.levelCard, isNext && styles.levelCardNext]}>
      <CinephileBadgePatch
        levelKey={level.key}
        levelName={level.name}
        state={state}
      />
      <View style={styles.levelCopy}>
        <ThemedText type="smallBold">{level.name}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {level.description}
        </ThemedText>
        <ThemedText
          type="smallBold"
          style={unlocked ? styles.unlockedText : styles.lockedText}>
          {unlocked
            ? 'Sbloccato'
            : isNext
              ? `${Math.min(progress, level.threshold)} / ${level.threshold}`
              : 'Bloccato'}
        </ThemedText>
      </View>
    </View>
  );
}

function StateMessage({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children?: React.ReactNode;
}) {
  return (
    <View style={styles.center}>
      <ThemedText type="smallBold">{title}</ThemedText>
      <ThemedText
        type="small"
        themeColor="textSecondary"
        style={styles.centerText}>
        {body}
      </ThemedText>
      {children}
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
    minWidth: 0,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
  hero: {
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: Spacing.four,
  },
  heroCopy: {
    flex: 1,
    minWidth: 0,
    gap: Spacing.one,
  },
  heroCount: {
    minWidth: 76,
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: Spacing.three,
    backgroundColor: 'rgba(106,76,255,0.16)',
  },
  heroCountValue: {
    color: Brand.softViolet,
  },
  familyCard: {
    minWidth: 0,
    padding: Spacing.four,
    gap: Spacing.three,
    borderRadius: Spacing.four,
  },
  familyHeading: {
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  familyCopy: {
    flex: 1,
    minWidth: 0,
    gap: Spacing.one,
  },
  refreshButton: {
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
    backgroundColor: 'rgba(47,107,255,0.14)',
  },
  refreshText: {
    color: Brand.glowBlue,
  },
  progressHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  progressValue: {
    color: Brand.sunsetOrange,
  },
  progressTrack: {
    height: 8,
    overflow: 'hidden',
    borderRadius: Spacing.two,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  progressFill: {
    height: '100%',
    borderRadius: Spacing.two,
    backgroundColor: Brand.softViolet,
  },
  levelGrid: {
    width: '100%',
    minWidth: 0,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  levelCard: {
    width: '48%',
    minWidth: 0,
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: Spacing.three,
    backgroundColor: 'rgba(255,255,255,0.025)',
  },
  levelCardNext: {
    borderColor: 'rgba(106,76,255,0.42)',
    backgroundColor: 'rgba(106,76,255,0.08)',
  },
  levelCopy: {
    width: '100%',
    minWidth: 0,
    alignItems: 'center',
    gap: Spacing.half,
  },
  unlockedText: {
    color: Brand.softViolet,
  },
  lockedText: {
    color: 'rgba(255,255,255,0.48)',
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
  retryText: {
    color: Brand.glowBlue,
  },
  errorText: {
    color: '#FF6578',
    textAlign: 'center',
  },
  warningText: {
    color: Brand.sunsetOrange,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.8,
  },
});
