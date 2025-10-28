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

const SECTION_COMPLETION_BONUS = 200;

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
  const [claimedThemes, setClaimedThemes] = useState<Record<string, boolean>>({});
  const [redeemingTheme, setRedeemingTheme] = useState<string | null>(null);
  const lastProgressKeyRef = useRef<string | null>(null);

  const orderedThemes = useMemo(
    () => [...themes].sort((a, b) => a.name.localeCompare(b.name)),
    [themes],
  );

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
    },
    [],
  );

  useEffect(() => {
    const update = route.params?.progressUpdate;
    if (!update) {
      return;
    }
    const updateKey = `${update.slug}:${update.answered}:${update.total}`;
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
      });
    },
    [navigation, progress],
  );

  const handleExit = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
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

      setRedeemingTheme(theme.slug);

      try {
        await adjustCredits(SECTION_COMPLETION_BONUS);
        setClaimedThemes(prev => ({ ...prev, [theme.slug]: true }));
        Alert.alert(
          'Bonus riscattato',
          `Hai ottenuto ${SECTION_COMPLETION_BONUS} crediti extra per aver completato ${theme.name}.`,
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
    [adjustCredits, claimedThemes, redeemingTheme],
  );

  const renderTheme = ({ item }: { item: QuizTheme }) => {
    const answered = progress[item.slug] ?? 0;
    const total = item.question_count;
    const isCompleted = total > 0 && answered >= total;
    const isClaimed = claimedThemes[item.slug];
    const isRedeeming = redeemingTheme === item.slug;

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
          <Text style={[styles.missionDescription, styles.scorePositive]}>
            +10 right answers
          </Text>
          <Text style={[styles.missionDescription, styles.scoreNegative]}>
            -10 wrong answers
          </Text>
        </View>
        <Text style={styles.progressText}>
          {answered} completed questions / {total} questions
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
