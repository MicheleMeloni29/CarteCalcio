import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import type {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView as ScrollViewInstance,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

import TopStatusBar from '../../components/ui/TopStatusBar';
import {
  useAchievements,
  type AchievementMetric,
  type AchievementProgress,
} from '../../hooks/AchievementProvider';
import { useCredits } from '../../hooks/CreditProvider';
import type { MainStackParamList } from '../navigators/MainStackNavigator';

const coinSource = require('../../assets/images/Coin.png');

const SECTION_CONFIG: Array<{
  metric: AchievementMetric;
  title: string;
}> = [
  {
    metric: 'totalAnswers',
    title: 'Risposte date',
  },
  {
    metric: 'correctAnswers',
    title: 'Risposte corrette',
  },
  {
    metric: 'quizzesCompleted',
    title: 'Quiz completati',
  },
];

type SectionRow = {
  item: AchievementProgress;
  isLocked: boolean;
  isActive: boolean;
};

const AchievementScreen: React.FC = () => {
  const navigation =
    useNavigation<StackNavigationProp<MainStackParamList, 'Achievement'>>();
  const { achievements, loading, claimAchievement } = useAchievements();
  const { adjustCredits } = useCredits();
  const [expandedSections, setExpandedSections] = useState<Record<AchievementMetric, boolean>>({
    totalAnswers: false,
    correctAnswers: false,
    quizzesCompleted: false,
  });
  const [activeSectionIndex, setActiveSectionIndex] = useState<number>(0);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const carouselRef = useRef<ScrollViewInstance | null>(null);
  const { width: windowWidth } = useWindowDimensions();

  const groupedAchievements = useMemo(() => {
    const groups: Record<AchievementMetric, AchievementProgress[]> = {
      totalAnswers: [],
      correctAnswers: [],
      quizzesCompleted: [],
    };
    achievements.forEach(achievement => {
      groups[achievement.metric].push(achievement);
    });
    (Object.keys(groups) as AchievementMetric[]).forEach(metric => {
      groups[metric].sort((a, b) => a.target - b.target);
    });
    return groups;
  }, [achievements]);

  const toggleLockedVisibility = useCallback((metric: AchievementMetric) => {
    setExpandedSections(prev => ({
      ...prev,
      [metric]: !prev[metric],
    }));
  }, []);

  const handleMomentumScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, layoutMeasurement } = event.nativeEvent;
      const width = layoutMeasurement?.width ?? windowWidth;
      if (!width || width <= 0) {
        return;
      }
      const index = Math.round(contentOffset.x / width);
      setActiveSectionIndex(prev => {
        if (index < 0) {
          return 0;
        }
        if (index >= SECTION_CONFIG.length) {
          return SECTION_CONFIG.length - 1;
        }
        return index;
      });
    },
    [windowWidth],
  );

  const goToSection = useCallback(
    (index: number) => {
      if (index < 0 || index >= SECTION_CONFIG.length) {
        return;
      }
      setActiveSectionIndex(index);
      carouselRef.current?.scrollTo({
        x: index * windowWidth,
        animated: true,
      });
    },
    [windowWidth],
  );

  const handleClaimReward = useCallback(
    async (achievement: AchievementProgress) => {
      if (!achievement.completed || achievement.claimed) {
        return;
      }
      setClaimingId(achievement.id);
      try {
        await adjustCredits(achievement.rewardCredits);
        await claimAchievement(achievement.id);
        Alert.alert(
          'Crediti riscattati',
          `Hai ottenuto ${achievement.rewardCredits} crediti da questa missione.`,
        );
      } catch (error) {
        console.error('Unable to claim achievement reward', error);
        Alert.alert(
          'Errore',
          'Non e stato possibile erogare i crediti. Controlla la connessione e riprova.',
        );
      } finally {
        setClaimingId(null);
      }
    },
    [adjustCredits, claimAchievement],
  );

  useEffect(() => {
    carouselRef.current?.scrollTo({
      x: activeSectionIndex * windowWidth,
      animated: false,
    });
  }, [activeSectionIndex, windowWidth]);

  const handleGoBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Home');
    }
  }, [navigation]);

  return (
    <View style={styles.container}>
      <TopStatusBar />
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleGoBack}
          activeOpacity={0.85}
        >
          <Ionicons name="arrow-back" size={22} color="#00a028ff" />
        </TouchableOpacity>
        <View style={styles.balanceCard}>
          <Text style={styles.subtitle}>
            Redeem completed objectives and plan next ones
          </Text>
        </View>
      </View>
      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#22c55e" />
        </View>
      ) : (
        <View style={styles.carouselWrapper}>
          <ScrollView
            ref={carouselRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            onMomentumScrollEnd={handleMomentumScrollEnd}
            snapToAlignment="center"
            contentContainerStyle={{}}
          >
              {SECTION_CONFIG.map((section, sectionIndex) => {
                const items = groupedAchievements[section.metric];
                const nextIncompleteIndex = items.findIndex(item => !item.completed);
                const showLocked = expandedSections[section.metric];
                const rowsForSection: SectionRow[] = [];
                let lockedCount = 0;

                items.forEach((item, index) => {
                  const isLocked =
                    nextIncompleteIndex !== -1 && !item.completed && index > nextIncompleteIndex;
                  const isActive = !item.completed && index === nextIncompleteIndex;

                  if (isLocked) {
                    lockedCount += 1;
                  }

                  rowsForSection.push({
                    item,
                    isLocked,
                    isActive,
                  });
                });

                let visibleRows: SectionRow[];
                if (showLocked || lockedCount === 0) {
                  visibleRows = rowsForSection;
                } else {
                  const MAX_PREVIEW_ITEMS = 2;
                  const activeRow = rowsForSection.find(row => row.isActive);
                  const nextLockedRow = rowsForSection.find(row => row.isLocked);
                  let previewRows: SectionRow[] = [];

                  if (activeRow) {
                    previewRows.push(activeRow);
                  }
                  if (nextLockedRow && nextLockedRow !== activeRow) {
                    previewRows.push(nextLockedRow);
                  }

                  if (previewRows.length === 0) {
                    previewRows = rowsForSection.slice(-MAX_PREVIEW_ITEMS);
                  }

                  visibleRows = previewRows.slice(0, MAX_PREVIEW_ITEMS);
                }

                return (
                  <View
                    key={section.metric}
                    style={[styles.sectionSlide, { width: windowWidth }]}
                  >
                    <ScrollView
                      contentContainerStyle={styles.sectionScrollContent}
                      showsVerticalScrollIndicator={false}
                    >
                      <View style={styles.section}>
                      <Text style={styles.sectionTitle}>{section.title}</Text>
                      {items.length === 0 ? (
                        <Text style={styles.emptyText}>
                          Nessun obiettivo configurato per questa sezione.
                        </Text>
                      ) : (
                        <>
                          {visibleRows.map(row => (
                            <AchievementRow
                              key={row.item.id}
                              item={row.item}
                              isLocked={row.isLocked}
                              isActive={row.isActive}
                              onClaim={handleClaimReward}
                              isClaiming={claimingId === row.item.id}
                              disableClaiming={claimingId !== null}
                            />
                          ))}
                          {lockedCount > 0 && (
                            <TouchableOpacity
                              style={styles.toggleLockedButton}
                              onPress={() => toggleLockedVisibility(section.metric)}
                              activeOpacity={0.8}
                            >
                              <Ionicons
                                name={showLocked ? 'chevron-up' : 'chevron-down'}
                                size={18}
                                color="#cbd5f5"
                              />
                              <Text style={styles.toggleLockedLabel}>
                                {showLocked
                                  ? 'Nascondi traguardi futuri'
                                  : 'Mostra traguardi futuri'}
                              </Text>
                            </TouchableOpacity>
                          )}
                        </>
                      )}
                      </View>
                    </ScrollView>
                  </View>
                );
              })}
          </ScrollView>
        </View>
      )}
      {!loading && (
        <View style={styles.carouselIndicatorsBar}>
          {SECTION_CONFIG.map((section, index) => (
            <TouchableOpacity
              key={section.metric}
              style={styles.carouselIndicator}
              onPress={() => goToSection(index)}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.carouselDot,
                  index === activeSectionIndex && styles.carouselDotActive,
                ]}
              />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

const AchievementRow: React.FC<{
  item: AchievementProgress;
  isLocked: boolean;
  isActive: boolean;
  onClaim: (achievement: AchievementProgress) => void;
  isClaiming: boolean;
  disableClaiming: boolean;
}> = ({ item, isLocked, isActive, onClaim, isClaiming, disableClaiming }) => {
  const canClaim = item.completed && !item.claimed && !isLocked;
  const shouldDisableClaim = !canClaim || isClaiming || disableClaiming;
  const claimLabel = item.claimed
    ? 'Crediti riscattati'
    : isClaiming
      ? 'Assegno...'
      : 'Riscatta crediti';

  return (
  <View
    style={[
      styles.achievementCard,
      item.completed && styles.achievementCardCompleted,
      isLocked && styles.achievementCardLocked,
    ]}
  >
    <View style={styles.achievementHeader}>
      <Text style={styles.achievementName}>{item.title}</Text>
      <Text style={styles.achievementProgressText}>
        {Math.min(item.progress, item.target)} / {item.target}
      </Text>
    </View>
    <Text style={styles.achievementDescription}>
      {isLocked
        ? 'Completa il traguardo precedente per sbloccare questa missione.'
        : item.description}
    </Text>
    {!isLocked && (
      <>
        <View style={styles.progressRow}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.min(1, item.percentage) * 100}%` },
              ]}
            />
          </View>
          <View style={styles.rewardPill}>
            <Image source={coinSource} style={styles.rewardCoin} />
            <Text style={styles.rewardValue}>{item.rewardCredits}</Text>
          </View>
        </View>
        <Text
          style={[
            styles.achievementStatus,
            item.completed
              ? styles.statusCompleted
              : isActive
                ? styles.statusActive
                : styles.statusInProgress,
          ]}
        >
          {item.completed
            ? item.claimed
              ? 'Crediti gia riscattati'
              : 'Completato'
            : isActive
              ? 'Missione in corso'
              : 'Progresso accumulato'}
        </Text>
        {item.completed && !isLocked && (
          <TouchableOpacity
            style={[
              styles.claimButton,
              (item.claimed || shouldDisableClaim) && styles.claimButtonDisabled,
            ]}
            onPress={() => onClaim(item)}
            disabled={item.claimed || shouldDisableClaim}
            activeOpacity={0.85}
          >
            <Text
              style={[
                styles.claimButtonLabel,
                (item.claimed || shouldDisableClaim) && styles.claimButtonLabelDisabled,
              ]}
            >
              {claimLabel}
            </Text>
          </TouchableOpacity>
        )}
      </>
    )}
    {isLocked && (
      <Text style={[styles.achievementStatus, styles.statusLocked]}>Bloccata</Text>
    )}
  </View>
  );
};

export default AchievementScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    backgroundColor: '#0e0c0f',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 12,
    marginTop: 12,
    marginBottom: 12,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 15, 19, 0.65)',
    borderColor: 'rgba(0, 160, 40, 1)',
    borderWidth: 2,
    borderRadius: 14,
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 20,
  },
  balanceCard: {
    flex: 1,
    backgroundColor: 'rgba(15, 42, 24, 0.66)',
    borderColor: '#00a028ff',
    borderWidth: 2,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 15,
    color: '#e2e8f0',
    textAlign: 'left',
  },
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  carouselWrapper: {
    flex: 1,
    marginHorizontal: -24,
    paddingBottom: 96,
  },
  sectionSlide: {
    paddingHorizontal: 24,
    flex: 1,
  },
  sectionScrollContent: {
    paddingBottom: 24,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#00a028ff',
    paddingBottom: 18,
    textAlign: 'center',
  },
  carouselIndicatorsBar: {
    position: 'absolute',
    bottom: 32,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    columnGap: 12,
  },
  carouselIndicator: {
    padding: 6,
  },
  carouselDot: {
    width: 14,
    height: 14,
    borderRadius: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  carouselDotActive: {
    backgroundColor: '#00a028ff',
  },
  achievementCard: {
    backgroundColor: 'rgba(15, 15, 19, 0.85)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 160, 40, 0.4)',
    padding: 16,
    marginBottom: 12,
  },
  achievementCardCompleted: {
    borderColor: '#22c55e',
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
  },
  achievementCardLocked: {
    borderColor: 'rgba(148, 163, 184, 0.35)',
    backgroundColor: 'rgba(15, 15, 19, 0.5)',
  },
  achievementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  achievementName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f8fafc',
    flex: 1,
    marginRight: 12,
  },
  achievementProgressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f8fafc',
  },
  achievementDescription: {
    fontSize: 13,
    color: '#cbd5f5',
    marginBottom: 6,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 12,
  },
  progressBar: {
    height: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    overflow: 'hidden',
    flex: 1,
  },
  rewardPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(14, 12, 15, 0.45)',
    borderWidth: 1,
    borderColor: 'rgba(250, 204, 21, 0.45)',
  },
  rewardCoin: {
    width: 18,
    height: 18,
    marginRight: 4,
  },
  rewardValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#facc15',
  },
  claimButton: {
    marginTop: 12,
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#22c55e',
  },
  claimButtonDisabled: {
    backgroundColor: 'rgba(34, 197, 94, 0.35)',
  },
  claimButtonLabel: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: '#0e0c0f',
  },
  claimButtonLabelDisabled: {
    color: '#1f2937',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#22c55e',
  },
  achievementStatus: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusCompleted: {
    color: '#22c55e',
  },
  statusActive: {
    color: '#facc15',
  },
  statusInProgress: {
    color: '#60a5fa',
  },
  statusLocked: {
    color: '#a1a1aa',
  },
  toggleLockedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.35)',
    backgroundColor: 'rgba(15, 15, 19, 0.5)',
  },
  toggleLockedLabel: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: '600',
    color: '#cbd5f5',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyText: {
    fontSize: 14,
    color: '#cbd5f5',
    fontStyle: 'italic',
  },
});
