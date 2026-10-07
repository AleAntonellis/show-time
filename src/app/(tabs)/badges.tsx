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

import { ArchivistBadgePatch } from '@/components/archivist-badge-patch';
import { CinephileBadgePatch } from '@/components/cinephile-badge-patch';
import { GenreExplorerBadgePatch } from '@/components/genre-explorer-badge-patch';
import { IntroductoryBadgePatch } from '@/components/introductory-badge-patch';
import { MarathonBadgePatch } from '@/components/marathon-badge-patch';
import { NostalgicBadgePatch } from '@/components/nostalgic-badge-patch';
import { OneMoreEpisodeBadgePatch } from '@/components/one-more-episode-badge-patch';
import { SerialistBadgePatch } from '@/components/serialist-badge-patch';
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
  BADGE_IDS,
  INTRODUCTORY_BADGE_IDS,
  evaluateBadgesAndNotify,
  getMyBadgeCatalog,
  isIntroductoryBadgeId,
  markMyBadgesSeen,
  type BadgeFamilyState,
  type BadgeLevelState,
  type IntroductoryBadgeId,
} from '@/services/badges';

const dateFormatter = new Intl.DateTimeFormat('it-IT', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});
const INTRODUCTORY_GROUP_ID = 'introductory';
const PROGRESSIVE_BADGE_ORDER = [
  BADGE_IDS.cinephile,
  BADGE_IDS.serialist,
  BADGE_IDS.archivist,
  BADGE_IDS.nostalgic,
  BADGE_IDS.genreExplorer,
  BADGE_IDS.oneMoreEpisode,
  BADGE_IDS.marathon,
] as const;

export default function BadgesTabScreen() {
  const insets = useSafeAreaInsets();
  const { configured, session } = useAuth();
  const [families, setFamilies] = useState<BadgeFamilyState[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<ReadonlySet<string>>(
    () => new Set(),
  );

  const openUnseenGroups = useCallback((catalog: BadgeFamilyState[]) => {
    const unseenGroupIds = catalog.flatMap((family) =>
      family.levels.some(
        (level) => level.unlockedAt != null && level.seenAt == null,
      )
        ? [
            isIntroductoryBadgeId(family.id)
              ? INTRODUCTORY_GROUP_ID
              : family.id,
          ]
        : [],
    );
    if (unseenGroupIds.length === 0) {
      return;
    }
    setExpandedGroups((current) => {
      const next = new Set(current);
      for (const groupId of unseenGroupIds) {
        next.add(groupId);
      }
      return next;
    });
  }, []);

  const toggleGroup = useCallback((groupId: string) => {
    setExpandedGroups((current) => {
      const next = new Set(current);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  }, []);

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
        const initialCatalog = (await getMyBadgeCatalog()).filter(
          (family) => family.isActive,
        );
        if (initialCatalog.length === 0) {
          throw new Error('Catalogo badge non disponibile');
        }
        setFamilies(initialCatalog);
        openUnseenGroups(initialCatalog);

        await evaluateBadgesAndNotify({
          badgeIds: initialCatalog.map((family) => family.id),
          backfill: initialCatalog.some(
            (family) => family.evaluatedAt == null,
          ),
        });
        const nextCatalog = (await getMyBadgeCatalog()).filter(
          (family) => family.isActive,
        );
        if (nextCatalog.length === 0) {
          throw new Error(
            'Catalogo badge non disponibile dopo la valutazione',
          );
        }
        setFamilies(nextCatalog);
        openUnseenGroups(nextCatalog);

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
    [configured, openUnseenGroups, session],
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
  const introductoryFamilies = INTRODUCTORY_BADGE_IDS.flatMap(
    (badgeId) => {
      const family = families.find((item) => item.id === badgeId);
      return family ? [{ badgeId, family }] : [];
    },
  );
  const progressiveFamilies = families.filter(
    (family) => !isIntroductoryBadgeId(family.id),
  ).sort((first, second) => {
    const firstIndex = PROGRESSIVE_BADGE_ORDER.indexOf(
      first.id as (typeof PROGRESSIVE_BADGE_ORDER)[number],
    );
    const secondIndex = PROGRESSIVE_BADGE_ORDER.indexOf(
      second.id as (typeof PROGRESSIVE_BADGE_ORDER)[number],
    );
    return (
      (firstIndex < 0 ? Number.MAX_SAFE_INTEGER : firstIndex) -
        (secondIndex < 0 ? Number.MAX_SAFE_INTEGER : secondIndex) ||
      first.name.localeCompare(second.name, 'it')
    );
  });
  const introductoryUnlockedCount = introductoryFamilies.filter(
    ({ family }) =>
      family.levels.some((level) => level.unlockedAt != null),
  ).length;
  const unlockedCount = families.reduce(
    (total, family) =>
      total +
      family.levels.filter((level) => level.unlockedAt != null).length,
    0,
  );
  const totalCount = families.reduce(
    (total, family) => total + family.levels.length,
    0,
  );

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
          <View style={styles.heroMeta}>
            <View style={styles.heroCount}>
              <ThemedText type="subtitle" style={styles.heroCountValue}>
                {totalCount > 0 ? unlockedCount : '—'}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                su {totalCount > 0 ? totalCount : '—'}
              </ThemedText>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Aggiorna i badge"
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
        </ThemedView>

        {!configured ? (
          <StateMessage
            title="Supabase non configurato"
            body="Configura Supabase per sincronizzare badge e progressi."
          />
        ) : loading && families.length === 0 ? (
          <View style={styles.center}>
            <ActivityIndicator color={Brand.glowBlue} />
          </View>
        ) : error && families.length === 0 ? (
          <StateMessage title="Sala trofei non disponibile" body={error}>
            <Pressable onPress={() => load(true)} hitSlop={8}>
              <ThemedText type="smallBold" style={styles.retryText}>
                Riprova
              </ThemedText>
            </Pressable>
          </StateMessage>
        ) : families.length > 0 ? (
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

            {introductoryFamilies.length > 0 && (
              <ThemedView
                type="backgroundElement"
                style={styles.introSection}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Prime tappe, ${introductoryUnlockedCount} su ${introductoryFamilies.length} sbloccati`}
                  accessibilityState={{
                    expanded: expandedGroups.has(
                      INTRODUCTORY_GROUP_ID,
                    ),
                  }}
                  aria-expanded={expandedGroups.has(
                    INTRODUCTORY_GROUP_ID,
                  )}
                  onPress={() => toggleGroup(INTRODUCTORY_GROUP_ID)}
                  style={({ pressed }) => [
                    styles.groupHeader,
                    pressed && styles.pressed,
                  ]}>
                  <View style={styles.sectionCopy}>
                    <ThemedText
                      type="subtitle"
                      style={styles.badgeGroupTitle}>
                      Prime tappe
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      I primi momenti che danno inizio alla tua storia.
                    </ThemedText>
                  </View>
                  <GroupSummary
                    unlocked={introductoryUnlockedCount}
                    total={introductoryFamilies.length}
                    expanded={expandedGroups.has(
                      INTRODUCTORY_GROUP_ID,
                    )}
                  />
                </Pressable>
                {expandedGroups.has(INTRODUCTORY_GROUP_ID) && (
                  <View style={styles.introGrid}>
                    {introductoryFamilies.map(({ badgeId, family }) => (
                      <IntroductoryBadgeCard
                        key={badgeId}
                        badgeId={badgeId}
                        family={family}
                      />
                    ))}
                  </View>
                )}
              </ThemedView>
            )}

            {progressiveFamilies.map((family) => (
              <ProgressiveFamilyCard
                key={family.id}
                family={family}
                expanded={expandedGroups.has(family.id)}
                onToggle={() => toggleGroup(family.id)}
              />
            ))}
          </>
        ) : null}
      </ScrollView>
    </ThemedView>
  );
}

function IntroductoryBadgeCard({
  badgeId,
  family,
}: {
  badgeId: IntroductoryBadgeId;
  family: BadgeFamilyState;
}) {
  const level = family.levels[0];
  const unlocked = level?.unlockedAt != null;

  return (
    <View
      style={[
        styles.introCard,
        unlocked && styles.introCardUnlocked,
      ]}>
      <IntroductoryBadgePatch
        badgeId={badgeId}
        badgeName={family.name}
        state={unlocked ? 'unlocked' : 'locked'}
      />
      <View style={styles.introCopy}>
        <ThemedText type="smallBold" style={styles.centerText}>
          {family.name}
        </ThemedText>
        <ThemedText
          type="small"
          themeColor="textSecondary"
          style={styles.centerText}>
          {family.description}
        </ThemedText>
        <ThemedText
          type="smallBold"
          style={unlocked ? styles.unlockedText : styles.lockedText}>
          {unlocked && level?.unlockedAt
            ? `Sbloccato il ${dateFormatter.format(
                new Date(level.unlockedAt),
              )}`
            : 'Da sbloccare'}
        </ThemedText>
      </View>
    </View>
  );
}

function ProgressiveFamilyCard({
  family,
  expanded,
  onToggle,
}: {
  family: BadgeFamilyState;
  expanded: boolean;
  onToggle: () => void;
}) {
  const unlockedLevels = family.levels.filter(
    (level) => level.unlockedAt != null,
  );
  const nextLevel =
    family.levels.find((level) => level.unlockedAt == null) ?? null;
  const progress = family.maxProgress;
  const progressTarget = nextLevel?.threshold ?? progress;
  const progressRatio =
    progressTarget > 0 ? Math.min(progress / progressTarget, 1) : 1;

  return (
    <ThemedView type="backgroundElement" style={styles.familyCard}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${family.name}, ${unlockedLevels.length} su ${family.levels.length} sbloccati`}
        accessibilityState={{ expanded }}
        aria-expanded={expanded}
        onPress={onToggle}
        style={({ pressed }) => [
          styles.groupHeader,
          pressed && styles.pressed,
        ]}>
        <View style={styles.familyCopy}>
          <ThemedText
            type="subtitle"
            style={styles.badgeGroupTitle}>
            {family.name}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {family.description}
          </ThemedText>
        </View>
        <GroupSummary
          unlocked={unlockedLevels.length}
          total={family.levels.length}
          expanded={expanded}
        />
      </Pressable>

      {expanded && (
        <>
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
                familyId={family.id}
                level={level}
                isNext={level.level === nextLevel?.level}
                progress={progress}
              />
            ))}
          </View>
        </>
      )}
    </ThemedView>
  );
}

function GroupSummary({
  unlocked,
  total,
  expanded,
}: {
  unlocked: number;
  total: number;
  expanded: boolean;
}) {
  return (
    <View style={styles.groupSummary}>
      <View style={styles.groupCount}>
        <ThemedText type="smallBold" style={styles.groupCountText}>
          {unlocked}/{total}
        </ThemedText>
      </View>
      <ThemedText type="subtitle" style={styles.groupChevron}>
        {expanded ? '▾' : '▸'}
      </ThemedText>
    </View>
  );
}

function LevelCard({
  familyId,
  level,
  isNext,
  progress,
}: {
  familyId: string;
  level: BadgeLevelState;
  isNext: boolean;
  progress: number;
}) {
  const unlocked = level.unlockedAt != null;
  const state = unlocked ? 'unlocked' : isNext ? 'next' : 'locked';

  return (
    <View style={[styles.levelCard, isNext && styles.levelCardNext]}>
      {familyId === BADGE_IDS.cinephile && (
        <CinephileBadgePatch
          levelKey={level.key}
          levelName={level.name}
          state={state}
        />
      )}
      {familyId === BADGE_IDS.archivist && (
        <ArchivistBadgePatch
          levelKey={level.key}
          levelName={level.name}
          state={state}
        />
      )}
      {familyId === BADGE_IDS.nostalgic && (
        <NostalgicBadgePatch
          levelKey={level.key}
          levelName={level.name}
          state={state}
        />
      )}
      {familyId === BADGE_IDS.serialist && (
        <SerialistBadgePatch
          levelKey={level.key}
          levelName={level.name}
          state={state}
        />
      )}
      {familyId === BADGE_IDS.genreExplorer && (
        <GenreExplorerBadgePatch
          levelKey={level.key}
          levelName={level.name}
          state={state}
        />
      )}
      {familyId === BADGE_IDS.oneMoreEpisode && (
        <OneMoreEpisodeBadgePatch
          levelKey={level.key}
          levelName={level.name}
          state={state}
        />
      )}
      {familyId === BADGE_IDS.marathon && (
        <MarathonBadgePatch
          levelKey={level.key}
          levelName={level.name}
          state={state}
        />
      )}
      <View style={styles.levelCopy}>
        <ThemedText type="smallBold">{level.name}</ThemedText>
        <ThemedText
          type="small"
          themeColor="textSecondary"
          style={styles.centerText}>
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
  heroMeta: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  heroCount: {
    minWidth: 82,
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: Spacing.three,
    backgroundColor: 'rgba(106,76,255,0.16)',
  },
  heroCountValue: {
    color: Brand.softViolet,
  },
  refreshButton: {
    minWidth: 82,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.three,
    backgroundColor: 'rgba(47,107,255,0.14)',
  },
  refreshText: {
    color: Brand.glowBlue,
  },
  introSection: {
    minWidth: 0,
    padding: Spacing.four,
    gap: Spacing.three,
    borderRadius: Spacing.four,
  },
  sectionCopy: {
    flex: 1,
    minWidth: 0,
    gap: Spacing.one,
  },
  groupHeader: {
    width: '100%',
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  groupSummary: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  groupCount: {
    minWidth: 52,
    alignItems: 'center',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.three,
    backgroundColor: 'rgba(106,76,255,0.16)',
  },
  groupCountText: {
    color: Brand.softViolet,
  },
  groupChevron: {
    minWidth: 16,
    color: Brand.pureWhite,
    textAlign: 'center',
  },
  introGrid: {
    width: '100%',
    minWidth: 0,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  introCard: {
    width: '48%',
    minWidth: 0,
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: Spacing.three,
    backgroundColor: 'rgba(255,255,255,0.025)',
  },
  introCardUnlocked: {
    borderColor: 'rgba(106,76,255,0.38)',
    backgroundColor: 'rgba(106,76,255,0.07)',
  },
  introCopy: {
    width: '100%',
    minWidth: 0,
    alignItems: 'center',
    gap: Spacing.one,
  },
  familyCard: {
    minWidth: 0,
    padding: Spacing.four,
    gap: Spacing.three,
    borderRadius: Spacing.four,
  },
  familyCopy: {
    flex: 1,
    minWidth: 0,
    gap: Spacing.one,
  },
  badgeGroupTitle: {
    fontSize: 28,
    lineHeight: 36,
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
    textAlign: 'center',
  },
  lockedText: {
    color: 'rgba(255,255,255,0.48)',
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
