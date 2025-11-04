import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

import { API_BASE_URL } from '../../constants/api';
import { useCredits } from '../../hooks/CreditProvider';
import TopStatusBar from '../../components/ui/TopStatusBar';
import type {
  MainStackParamList,
  QuizProgressUpdate,
} from '../navigators/MainStackNavigator';


type QuizTheme = {
  id: number;
  name: string;
  slug: string;
  question_count: number;
};

type ThemeDetail = {
  positiveReward: number;
  negativePenalty: number;
  completionMultiplier: number;
};

const DEFAULT_THEME_DETAIL: ThemeDetail = {
  positiveReward: 10,
  negativePenalty: 5,
  completionMultiplier: 10,
};

const normalizeThemeSlug = (slug?: string) => {
  if (!slug) {
    return '';
  }
  const sanitized = slug
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  const seasonMatch = sanitized.match(/^(season)-?(\d{2})-?(\d{2})$/);
  if (seasonMatch) {
    return `${seasonMatch[1]}${seasonMatch[2]}-${seasonMatch[3]}`;
  }
  return sanitized;
};

const THEME_DETAILS: Record<string, ThemeDetail> = {
  stadiums: {
    positiveReward: 10,
    negativePenalty: 0,
    completionMultiplier: 10,
  },
  champions: {
    positiveReward: 10,
    negativePenalty: 5,
    completionMultiplier: 10,
  },
  'top-scorer': {
    positiveReward: 15,
    negativePenalty: 5,
    completionMultiplier: 15,
  },
  records: {
    positiveReward: 20,
    negativePenalty: 5,
    completionMultiplier: 20,
  },
  'season24-25': {
    positiveReward: 30,
    negativePenalty: 15,
    completionMultiplier: 30,
  },
};

const resolveThemeDetail = (slug?: string): ThemeDetail =>
  THEME_DETAILS[normalizeThemeSlug(slug)] ?? THEME_DETAILS[slug ?? ''] ?? DEFAULT_THEME_DETAIL;

const EarnScreen: React.FC = () => {
  const { adjustCredits } = useCredits();
  const navigation = useNavigation<
    StackNavigationProp<MainStackParamList, 'Earn'>
  >();
  const route = useRoute<RouteProp<MainStackParamList, 'Earn'>>();
  const [themes, setThemes] = useState<QuizTheme[]>([]);
  const [loadingThemes, setLoadingThemes] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [correctCounts, setCorrectCounts] = useState<Record<string, number>>({});
  const [claimedThemes, setClaimedThemes] = useState<Record<string, boolean>>({});
  const [redeemingTheme, setRedeemingTheme] = useState<string | null>(null);
  const lastProgressKeyRef = useRef<string | null>(null);

  const orderedThemes = useMemo(() => {
    const isSeasonSlug = (slug: string | undefined) =>
      normalizeThemeSlug(slug).startsWith('season24');

    return [...themes].sort((a, b) => {
      if (a.slug === 'stadiums' && b.slug !== 'stadiums') {
        return -1;
      }
      if (b.slug === 'stadiums' && a.slug !== 'stadiums') {
        return 1;
      }
      const aIsSeason = isSeasonSlug(a.slug);
      const bIsSeason = isSeasonSlug(b.slug);
      if (aIsSeason && !bIsSeason) {
        return 1;
      }
      if (bIsSeason && !aIsSeason) {
        return -1;
      }
      if (a.slug === 'records' && b.slug !== 'records') {
        return 1;
      }
      if (b.slug === 'records' && a.slug !== 'records') {
        return -1;
      }
      return a.name.localeCompare(b.name);
    });
  }, [themes]);

  const ensureProgressShape = useCallback((loadedThemes: QuizTheme[]) => {
    setProgress(prev => {
      const next = { ...prev };
      loadedThemes.forEach(theme => {
        if (next[theme.slug] === undefined) {
          next[theme.slug] = 0;
        }
      });
      return next;
    });
    setCorrectCounts(prev => {
      const next = { ...prev };
      loadedThemes.forEach(theme => {
        if (next[theme.slug] === undefined) {
          next[theme.slug] = 0;
        }
      });
      return next;
    });
    setClaimedThemes(prev => {
      const next = { ...prev };
      loadedThemes.forEach(theme => {
        if (next[theme.slug] === undefined) {
          next[theme.slug] = false;
        }
      });
      return next;
    });
  }, []);

  const fetchThemes = useCallback(async () => {
    setLoadingThemes(true);
    setFetchError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/quiz/themes/`);
      if (!response.ok) {
        throw new Error(`Failed to fetch quiz themes (${response.status})`);
      }
      const data = await response.json();
      const loadedThemes: QuizTheme[] = Array.isArray(data?.themes) ? data.themes : [];
      setThemes(loadedThemes);
      ensureProgressShape(loadedThemes);
    } catch (error) {
      console.error('Unable to load quiz themes', error);
      setFetchError('Impossibile caricare i quiz. Riprova piu tardi.');
      setThemes([]);
    } finally {
      setLoadingThemes(false);
    }
  }, [ensureProgressShape]);

  useEffect(() => {
    fetchThemes();
  }, [fetchThemes]);

  const applyProgressUpdate = useCallback(
    (update: QuizProgressUpdate) => {
      setProgress(prev => ({
        ...prev,
        [update.slug]: Math.min(update.total, update.answered),
      }));
      setCorrectCounts(prev => ({
        ...prev,
        [update.slug]: Math.min(update.total, update.correct ?? 0),
      }));
    },
    [],
  );

  useEffect(() => {
    const update = route.params?.progressUpdate;
    if (!update) {
      return;
    }
    const updateKey = `${update.slug}:${update.answered}:${update.total}:${update.correct ?? 0}`;
    if (lastProgressKeyRef.current === updateKey) {
      return;
    }
    lastProgressKeyRef.current = updateKey;
    applyProgressUpdate(update);
  }, [applyProgressUpdate, route.params?.progressUpdate]);

  const handleStartTheme = useCallback(
    (theme: QuizTheme) => {
      navigation.navigate('QuizPlay', {
        themeSlug: theme.slug,
        themeName: theme.name,
        totalQuestions: theme.question_count,
        initialAnswered: progress[theme.slug] ?? 0,
        initialCorrect: correctCounts[theme.slug] ?? 0,
      });
    },
    [navigation, progress, correctCounts],
  );

  const handleExit = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.navigate('Home');
    } else {
      navigation.navigate('Home');
    }
  }, [navigation]);

  const handleRedeemTheme = useCallback(
    async (theme: QuizTheme) => {
      const alreadyClaimed = claimedThemes[theme.slug];
      if (alreadyClaimed || redeemingTheme) {
        return;
      }

      const detail = resolveThemeDetail(theme.slug);
      const correctAnswers = correctCounts[theme.slug] ?? 0;
      const completionBonus = detail.completionMultiplier * correctAnswers;

      if (completionBonus <= 0) {
        Alert.alert(
          'Nessun bonus disponibile',
          'Completa almeno una risposta corretta per ottenere il bonus finale.',
        );
        return;
      }

      setRedeemingTheme(theme.slug);

      try {
        await adjustCredits(completionBonus);
        setClaimedThemes(prev => ({ ...prev, [theme.slug]: true }));
        Alert.alert(
          'Bonus riscattato',
          `Hai ottenuto ${completionBonus} crediti extra per aver completato ${theme.name}.`,
        );
      } catch (error) {
        Alert.alert(
          'Errore',
          'Non e stato possibile erogare il bonus. Controlla la connessione e riprova.',
        );
      } finally {
        setRedeemingTheme(null);
      }
    },
    [adjustCredits, claimedThemes, correctCounts, redeemingTheme, resolveThemeDetail],
  );

  const renderTheme = ({ item }: { item: QuizTheme }) => {
    const answered = progress[item.slug] ?? 0;
    const total = item.question_count;
    const isCompleted = total > 0 && answered >= total;
    const isClaimed = claimedThemes[item.slug];
    const isRedeeming = redeemingTheme === item.slug;
    const details = resolveThemeDetail(item.slug);
    const correct = correctCounts[item.slug] ?? 0;
    const positiveText = `+${details.positiveReward} crediti per ogni risposta corretta`;
    const negativeText = `-${details.negativePenalty} crediti per ogni risposta errata`;
    const completionText = `Bonus finale: ${details.completionMultiplier} crediti per ogni risposta corretta`;

    let buttonLabel = 'START';
    if (isCompleted) {
      buttonLabel = isClaimed ? 'RISCATTATO' : isRedeeming ? 'ASSEGNO...' : 'RISCATTA';
    }

    return (
      <View style={styles.missionCard}>

        <View style={styles.missionHeader}>

          <Text style={styles.missionTitle}>{item.name}</Text>
        </View>
        <View style={styles.scoreBlock}>
          <Text style={styles.missionSubtitle}>{completionText}</Text>
          <Text style={[styles.missionDescription, styles.scorePositive]}>
            {positiveText}
          </Text>
          <Text style={[styles.missionDescription, styles.scoreNegative]}>
            {negativeText}
          </Text>
        </View>
        <Text style={styles.progressText}>
          {answered} domande completate su {total} • Risposte corrette: {correct}
        </Text>

        <TouchableOpacity
          style={[
            styles.claimButton,
            isCompleted && isClaimed && styles.claimButtonDisabled,
          ]}
          onPress={() =>
            isCompleted ? handleRedeemTheme(item) : handleStartTheme(item)
          }
          disabled={isClaimed || isRedeeming}
        >
          <Text style={styles.claimLabel}>{buttonLabel}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <TopStatusBar />
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleExit}
          activeOpacity={0.85}
        >
          <Ionicons
            name="arrow-back"
            size={22}
            color="#00a028ff"
          />
        </TouchableOpacity>
        <View style={styles.balanceCard}>
          <Text style={styles.subtitle}>
            Complete quiz to earn more credits
          </Text>
        </View>
      </View>

      {loadingThemes && orderedThemes.length === 0 ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#22c55e" />
        </View>
      ) : (
        <FlatList
          data={orderedThemes}
          keyExtractor={item => item.slug}
          renderItem={renderTheme}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={loadingThemes}
              onRefresh={fetchThemes}
              tintColor="#22c55e"
            />
          }
          ListEmptyComponent={
            fetchError ? (
              <Text style={styles.emptyMessage}>{fetchError}</Text>
            ) : (
              <Text style={styles.emptyMessage}>
                Nessun quiz disponibile al momento.
              </Text>
            )
          }
        />
      )}
    </View>
  );
};

export default EarnScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
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
  subtitle: {
    fontSize: 15,
    color: '#e2e8f0',
    textAlign: 'left',
  },
  balanceCard: {
    backgroundColor: 'rgba(15, 42, 24, 0.66)',
    borderColor: '#00a028ff',
    borderWidth: 2,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
    marginBottom: 20,
    flex: 1,
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
  listContent: {
    paddingBottom: 40,
  },
  missionCard: {
    backgroundColor: 'rgba(15, 15, 19, 0.85)',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#00a028ff',
  },
  missionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  missionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#f8fafc',
    textAlign: 'center',
  },
  missionSubtitle: {
    fontSize: 14,
    color: '#cbd5f5',
    marginBottom: 6,
  },
  missionDescription: {
    fontSize: 14,
    color: '#cbd5f5',
    marginBottom: 8,
  },
  scoreBlock: {
    marginBottom: 12,
  },
  scorePositive: {
    color: '#34d399',
  },
  scoreNegative: {
    color: '#f87171',
  },
  progressText: {
    fontSize: 14,
    color: '#e2e8f0',
    marginBottom: 18,
  },
  claimButton: {
    backgroundColor: '#22c55e',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  claimButtonDisabled: {
    backgroundColor: 'rgba(34, 197, 94, 0.35)',
  },
  claimLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0e0c0f',
  },
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyMessage: {
    textAlign: 'center',
    color: '#cbd5f5',
    fontSize: 15,
    paddingVertical: 40,
  },
});
