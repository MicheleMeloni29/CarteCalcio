import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

const STORAGE_KEY = 'achievement_stats_v1';

export type AchievementStats = {
  totalAnswers: number;
  correctAnswers: number;
  quizzesCompleted: number;
};

export type AchievementMetric = keyof AchievementStats;

type AchievementDefinition = {
  id: string;
  metric: AchievementMetric;
  title: string;
  description: string;
  target: number;
  rewardCredits: number;
};

export type AchievementProgress = AchievementDefinition & {
  progress: number;
  completed: boolean;
  percentage: number;
};

const DEFAULT_STATS: AchievementStats = {
  totalAnswers: 0,
  correctAnswers: 0,
  quizzesCompleted: 0,
};

const sanitizeValue = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.floor(value));
  }
  return 0;
};

const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  {
    id: 'answers-10',
    metric: 'totalAnswers',
    title: 'Street Player',
    description: 'Dai 10 risposte in totale.',
    target: 10,
    rewardCredits: 10,
  },
  {
    id: 'answers-50',
    metric: 'totalAnswers',
    title: 'Terza Categoria',
    description: 'Dai 50 risposte in totale.',
    target: 50,
    rewardCredits: 50,
  },
  {
    id: 'answers-100',
    metric: 'totalAnswers',
    title: 'Seconda Categoria',
    description: 'Raggiungi 100 risposte date in qualsiasi quiz.',
    target: 100,
    rewardCredits: 100,
  },
  {
    id: 'answers-200',
    metric: 'totalAnswers',
    title: 'Prima Categoria',
    description: 'Arriva a 200 risposte totali.',
    target: 200,
    rewardCredits: 200,
  },
  {
    id: 'answers-400',
    metric: 'totalAnswers',
    title: 'Promozione',
    description: 'Supera quota 400 risposte date.',
    target: 400,
    rewardCredits: 400,
  },
  {
    id: 'answers-800',
    metric: 'totalAnswers',
    title: 'Eccellenza',
    description: 'Supera quota 800 risposte date.',
    target: 800,
    rewardCredits: 800,
  },
  {
    id: 'answers-1600',
    metric: 'totalAnswers',
    title: 'Seire D',
    description: 'Supera quota 1600 risposte date.',
    target: 1600,
    rewardCredits: 1600,
  },
  {
    id: 'answers-3200',
    metric: 'totalAnswers',
    title: 'Seire C',
    description: 'Supera quota 3200 risposte date.',
    target: 3200,
    rewardCredits: 3200,
  },
  {
    id: 'answers-6400',
    metric: 'totalAnswers',
    title: 'Seire B',
    description: 'Supera quota 6400 risposte date.',
    target: 6400,
    rewardCredits: 6400,
  },
  {
    id: 'answers-12800',
    metric: 'totalAnswers',
    title: 'Seire A',
    description: 'Supera quota 12800 risposte date.',
    target: 12800,
    rewardCredits: 12800,
  },
  {
    id: 'answers-10',
    metric: 'correctAnswers',
    title: 'Street Player',
    description: 'Dai 10 risposte in totale.',
    target: 10,
    rewardCredits: 10,
  },
  {
    id: 'answers-50',
    metric: 'correctAnswers',
    title: 'Terza Categoria',
    description: 'Dai 50 risposte in totale.',
    target: 50,
    rewardCredits: 50,
  },
  {
    id: 'answers-100',
    metric: 'correctAnswers',
    title: 'Seconda Categoria',
    description: 'Raggiungi 100 risposte date in qualsiasi quiz.',
    target: 100,
    rewardCredits: 100,
  },
  {
    id: 'answers-200',
    metric: 'correctAnswers',
    title: 'Prima Categoria',
    description: 'Arriva a 200 risposte totali.',
    target: 200,
    rewardCredits: 200,
  },
  {
    id: 'answers-400',
    metric: 'correctAnswers',
    title: 'Promozione',
    description: 'Supera quota 400 risposte date.',
    target: 400,
    rewardCredits: 400,
  },
  {
    id: 'answers-800',
    metric: 'correctAnswers',
    title: 'Eccellenza',
    description: 'Supera quota 800 risposte date.',
    target: 800,
    rewardCredits: 800,
  },
  {
    id: 'answers-1600',
    metric: 'correctAnswers',
    title: 'Seire D',
    description: 'Supera quota 1600 risposte date.',
    target: 1600,
    rewardCredits: 1600,
  },
  {
    id: 'answers-3200',
    metric: 'correctAnswers',
    title: 'Seire C',
    description: 'Supera quota 3200 risposte date.',
    target: 3200,
    rewardCredits: 3200,
  },
  {
    id: 'answers-6400',
    metric: 'correctAnswers',
    title: 'Seire B',
    description: 'Supera quota 6400 risposte date.',
    target: 6400,
    rewardCredits: 6400,
  },
  {
    id: 'answers-12800',
    metric: 'correctAnswers',
    title: 'Seire A',
    description: 'Supera quota 12800 risposte date.',
    target: 12800,
    rewardCredits: 12800,
  },
  {
    id: 'quizzes-1',
    metric: 'quizzesCompleted',
    title: 'Prima vittoria',
    description: 'Completa il tuo primo quiz.',
    target: 1,
    rewardCredits: 80,
  },
  {
    id: 'quizzes-5',
    metric: 'quizzesCompleted',
    title: 'Serie positiva',
    description: 'Porta a termine 5 quiz completi.',
    target: 5,
    rewardCredits: 200,
  },
  {
    id: 'quizzes-15',
    metric: 'quizzesCompleted',
    title: 'Allenatore esperto',
    description: 'Completa 15 quiz.',
    target: 15,
    rewardCredits: 420,
  },
  {
    id: 'quizzes-30',
    metric: 'quizzesCompleted',
    title: 'Campione assoluto',
    description: 'Arriva a 30 quiz completati.',
    target: 30,
    rewardCredits: 800,
  },
];

type AchievementContextValue = {
  stats: AchievementStats;
  loading: boolean;
  achievements: AchievementProgress[];
  recordAnswer: (isCorrect: boolean) => Promise<void>;
  recordQuizCompletion: () => Promise<void>;
  resetAchievements?: () => Promise<void>;
};

const AchievementContext = createContext<AchievementContextValue | undefined>(undefined);

export const AchievementProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [stats, setStats] = useState<AchievementStats>(DEFAULT_STATS);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (!stored) {
          return;
        }
        const parsed = JSON.parse(stored) as Partial<AchievementStats> | null;
        if (parsed) {
          setStats({
            totalAnswers: sanitizeValue(parsed.totalAnswers),
            correctAnswers: sanitizeValue(parsed.correctAnswers),
            quizzesCompleted: sanitizeValue(parsed.quizzesCompleted),
          });
        }
      } catch (error) {
        console.error('Unable to load achievement stats', error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  const persistStats = useCallback(async (next: AchievementStats) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (error) {
      console.error('Unable to persist achievement stats', error);
    }
  }, []);

  const applyStatsUpdate = useCallback(
    async (updater: (prev: AchievementStats) => AchievementStats) => {
      let nextState: AchievementStats | null = null;
      setStats(prev => {
        nextState = updater(prev);
        return nextState;
      });
      if (nextState) {
        await persistStats(nextState);
      }
    },
    [persistStats],
  );

  const recordAnswer = useCallback(
    (isCorrect: boolean) =>
      applyStatsUpdate(prev => ({
        ...prev,
        totalAnswers: prev.totalAnswers + 1,
        correctAnswers: prev.correctAnswers + (isCorrect ? 1 : 0),
      })),
    [applyStatsUpdate],
  );

  const recordQuizCompletion = useCallback(
    () =>
      applyStatsUpdate(prev => ({
        ...prev,
        quizzesCompleted: prev.quizzesCompleted + 1,
      })),
    [applyStatsUpdate],
  );

  const resetAchievements = useCallback(async () => {
    setStats(DEFAULT_STATS);
    await persistStats(DEFAULT_STATS);
  }, [persistStats]);

  const achievements = useMemo<AchievementProgress[]>(
    () =>
      ACHIEVEMENT_DEFINITIONS.map(def => {
        const progress = stats[def.metric];
        const percentage = def.target > 0 ? Math.min(1, progress / def.target) : 1;
        return {
          ...def,
          progress,
          completed: progress >= def.target,
          percentage,
        };
      }),
    [stats],
  );

  const value = useMemo(
    () => ({
      stats,
      loading,
      achievements,
      recordAnswer,
      recordQuizCompletion,
      resetAchievements,
    }),
    [achievements, loading, recordAnswer, recordQuizCompletion, resetAchievements, stats],
  );

  return <AchievementContext.Provider value={value}>{children}</AchievementContext.Provider>;
};

export const useAchievements = () => {
  const context = useContext(AchievementContext);
  if (!context) {
    throw new Error('useAchievements must be used within an AchievementProvider');
  }
  return context;
};
