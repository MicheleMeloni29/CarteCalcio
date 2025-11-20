import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { API_BASE_URL } from '../constants/api';
import { useAuth } from './AuthProvider';

const STORAGE_KEY = 'achievement_stats_v1';
const CLAIMED_STORAGE_KEY = 'achievement_claims_v1';

type AchievementApiResponse = {
  stats?: Partial<AchievementStats>;
  claimedAchievementIds?: string[];
  userId?: number | null;
  username?: string | null;
};

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
  legacyIds?: string[];
};

export type AchievementProgress = AchievementDefinition & {
  progress: number;
  completed: boolean;
  percentage: number;
  claimed: boolean;
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

type AnswerAchievementTier = {
  key: string;
  title: string;
  totalDescription: string;
  correctDescription: string;
  target: number;
  rewardCredits: number;
  legacyId: string;
};

const ANSWER_ACHIEVEMENT_TIERS: AnswerAchievementTier[] = [
  {
    key: '10',
    title: 'Street Player',
    totalDescription: 'Dai 10 risposte in totale.',
    correctDescription: 'Fornisci 10 risposte corrette in totale.',
    target: 10,
    rewardCredits: 10,
    legacyId: 'answers-10',
  },
  {
    key: '50',
    title: 'Terza Categoria',
    totalDescription: 'Dai 50 risposte in totale.',
    correctDescription: 'Fornisci 50 risposte corrette complessive.',
    target: 50,
    rewardCredits: 50,
    legacyId: 'answers-50',
  },
  {
    key: '100',
    title: 'Seconda Categoria',
    totalDescription: 'Raggiungi 100 risposte date in qualsiasi quiz.',
    correctDescription: 'Raggiungi 100 risposte corrette complessive.',
    target: 100,
    rewardCredits: 100,
    legacyId: 'answers-100',
  },
  {
    key: '200',
    title: 'Prima Categoria',
    totalDescription: 'Arriva a 200 risposte totali.',
    correctDescription: 'Arriva a 200 risposte corrette totali.',
    target: 200,
    rewardCredits: 200,
    legacyId: 'answers-200',
  },
  {
    key: '400',
    title: 'Promozione',
    totalDescription: 'Supera quota 400 risposte date.',
    correctDescription: 'Supera quota 400 risposte corrette date.',
    target: 400,
    rewardCredits: 400,
    legacyId: 'answers-400',
  },
  {
    key: '800',
    title: 'Eccellenza',
    totalDescription: 'Supera quota 800 risposte date.',
    correctDescription: 'Supera quota 800 risposte corrette date.',
    target: 800,
    rewardCredits: 800,
    legacyId: 'answers-800',
  },
  {
    key: '1600',
    title: 'Seire D',
    totalDescription: 'Supera quota 1600 risposte date.',
    correctDescription: 'Supera quota 1600 risposte corrette date.',
    target: 1600,
    rewardCredits: 1600,
    legacyId: 'answers-1600',
  },
  {
    key: '3200',
    title: 'Seire C',
    totalDescription: 'Supera quota 3200 risposte date.',
    correctDescription: 'Supera quota 3200 risposte corrette date.',
    target: 3200,
    rewardCredits: 3200,
    legacyId: 'answers-3200',
  },
  {
    key: '6400',
    title: 'Seire B',
    totalDescription: 'Supera quota 6400 risposte date.',
    correctDescription: 'Supera quota 6400 risposte corrette date.',
    target: 6400,
    rewardCredits: 6400,
    legacyId: 'answers-6400',
  },
  {
    key: '12800',
    title: 'Seire A',
    totalDescription: 'Supera quota 12800 risposte date.',
    correctDescription: 'Supera quota 12800 risposte corrette date.',
    target: 12800,
    rewardCredits: 12800,
    legacyId: 'answers-12800',
  },
];

const createAnswerAchievements = (
  metric: Extract<AchievementMetric, 'totalAnswers' | 'correctAnswers'>,
  prefix: 'total-answers' | 'correct-answers',
  getDescription: (tier: AnswerAchievementTier) => string,
): AchievementDefinition[] =>
  ANSWER_ACHIEVEMENT_TIERS.map(tier => ({
    id: `${prefix}-${tier.key}`,
    legacyIds: [tier.legacyId],
    metric,
    title: tier.title,
    description: getDescription(tier),
    target: tier.target,
    rewardCredits: tier.rewardCredits,
  }));

const totalAnswerAchievements = createAnswerAchievements(
  'totalAnswers',
  'total-answers',
  tier => tier.totalDescription,
);

const correctAnswerAchievements = createAnswerAchievements(
  'correctAnswers',
  'correct-answers',
  tier => tier.correctDescription,
);

const quizAchievements: AchievementDefinition[] = [
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

const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  ...totalAnswerAchievements,
  ...correctAnswerAchievements,
  ...quizAchievements,
];

const LEGACY_CLAIM_MIGRATIONS = ACHIEVEMENT_DEFINITIONS.reduce<Record<string, string[]>>(
  (acc, definition) => {
    definition.legacyIds?.forEach(legacyId => {
      if (!acc[legacyId]) {
        acc[legacyId] = [];
      }
      acc[legacyId].push(definition.id);
    });
    return acc;
  },
  {},
);

const normalizeClaimsMap = (source?: Record<string, boolean> | null) => {
  if (!source) {
    return {};
  }
  const normalized: Record<string, boolean> = {};
  Object.entries(source).forEach(([id, value]) => {
    if (!value) {
      return;
    }
    const replacements = LEGACY_CLAIM_MIGRATIONS[id];
    if (replacements && replacements.length > 0) {
      replacements.forEach(replacement => {
        normalized[replacement] = true;
      });
    } else {
      normalized[id] = true;
    }
  });
  return normalized;
};

type AchievementContextValue = {
  stats: AchievementStats;
  loading: boolean;
  achievements: AchievementProgress[];
  recordAnswer: (isCorrect: boolean) => Promise<void>;
  recordQuizCompletion: () => Promise<void>;
  claimAchievement: (achievementId: string) => Promise<void>;
  resetAchievements?: () => Promise<void>;
};

const AchievementContext = createContext<AchievementContextValue | undefined>(undefined);

export const AchievementProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { accessToken, refreshAccessToken } = useAuth();
  const [stats, setStats] = useState<AchievementStats>(DEFAULT_STATS);
  const [loading, setLoading] = useState<boolean>(true);
  const [claimedAchievements, setClaimedAchievements] = useState<Record<string, boolean>>({});

  const hydrateFromStorage = useCallback(async () => {
    try {
      const [storedStats, storedClaims] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY),
        AsyncStorage.getItem(CLAIMED_STORAGE_KEY),
      ]);

      let nextStats: AchievementStats = { ...DEFAULT_STATS };
      if (storedStats) {
        const parsed = JSON.parse(storedStats) as Partial<AchievementStats> | null;
        if (parsed) {
          nextStats = {
            totalAnswers: sanitizeValue(parsed.totalAnswers),
            correctAnswers: sanitizeValue(parsed.correctAnswers),
            quizzesCompleted: sanitizeValue(parsed.quizzesCompleted),
          };
        }
      }

      let nextClaims: Record<string, boolean> = {};
      if (storedClaims) {
        try {
          const parsedClaims = JSON.parse(storedClaims) as Record<string, boolean>;
          if (parsedClaims && typeof parsedClaims === 'object') {
            nextClaims = parsedClaims;
          }
        } catch (error) {
          console.error('Unable to parse claimed achievements', error);
        }
      }

      const normalizedClaims = normalizeClaimsMap(nextClaims);
      setStats(nextStats);
      setClaimedAchievements(normalizedClaims);
    } catch (error) {
      console.error('Unable to load achievement stats', error);
      setStats({ ...DEFAULT_STATS });
      setClaimedAchievements({});
    }
  }, []);

  const persistStats = useCallback(async (next: AchievementStats) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (error) {
      console.error('Unable to persist achievement stats', error);
    }
  }, []);

  const persistClaims = useCallback(async (map: Record<string, boolean>) => {
    try {
      const normalized = normalizeClaimsMap(map);
      await AsyncStorage.setItem(CLAIMED_STORAGE_KEY, JSON.stringify(normalized));
    } catch (error) {
      console.error('Unable to persist claimed achievements', error);
    }
  }, []);

  const callWithAuth = useCallback(
    async (request: (token: string) => Promise<Response>) => {
      const attempt = async (token: string | null, allowRefresh: boolean): Promise<Response> => {
        if (!token) {
          if (!allowRefresh) {
            throw new Error('Missing access token');
          }
          const refreshed = await refreshAccessToken();
          if (!refreshed) {
            throw new Error('Missing access token');
          }
          return attempt(refreshed, false);
        }

        const response = await request(token);
        if (response.status === 401 && allowRefresh) {
          const refreshed = await refreshAccessToken();
          if (!refreshed) {
            throw new Error('Missing access token');
          }
          return attempt(refreshed, false);
        }

        return response;
      };

      return attempt(accessToken, true);
    },
    [accessToken, refreshAccessToken],
  );

  const syncAchievementsToApi = useCallback(
    async (statsSnapshot: AchievementStats, claimsMap: Record<string, boolean>) => {
      try {
        const normalizedClaims = normalizeClaimsMap(claimsMap);
        const claimedAchievementIds = Object.keys(normalizedClaims);
        await callWithAuth(token =>
          fetch(`${API_BASE_URL}/api/users/me/achievements/`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              stats: statsSnapshot,
              claimedAchievementIds,
            }),
          }),
        );
      } catch (error) {
        console.error('Unable to sync achievements with API', error);
      }
    },
    [callWithAuth],
  );

  useEffect(() => {
    let cancelled = false;

    const fetchProgress = async () => {
      setLoading(true);

      if (!accessToken) {
        await hydrateFromStorage();
        if (!cancelled) {
          setLoading(false);
        }
        return;
      }

      try {
        const response = await callWithAuth(token =>
          fetch(`${API_BASE_URL}/api/users/me/achievements/`, {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch achievements (${response.status})`);
        }

        const data = (await response.json()) as AchievementApiResponse;
        const statsPayload: Partial<AchievementStats> = data?.stats ?? {};
        const nextStats: AchievementStats = {
          totalAnswers: sanitizeValue(statsPayload.totalAnswers),
          correctAnswers: sanitizeValue(statsPayload.correctAnswers),
          quizzesCompleted: sanitizeValue(statsPayload.quizzesCompleted),
        };
        const claimedIds: string[] = Array.isArray(data?.claimedAchievementIds)
          ? data.claimedAchievementIds
          : [];
        const claimsMap: Record<string, boolean> = {};
        claimedIds.forEach(id => {
          if (typeof id === 'string' && id) {
            claimsMap[id] = true;
          }
        });

        const normalizedClaims = normalizeClaimsMap(claimsMap);
        if (!cancelled) {
          setStats(nextStats);
          setClaimedAchievements(normalizedClaims);
        }
        await persistStats(nextStats);
        await persistClaims(normalizedClaims);
      } catch (error) {
        console.error('Unable to fetch achievements from API', error);
        await hydrateFromStorage();
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchProgress();

    return () => {
      cancelled = true;
    };
  }, [accessToken, callWithAuth, hydrateFromStorage, persistClaims, persistStats]);

  const applyStatsUpdate = useCallback(
    async (updater: (prev: AchievementStats) => AchievementStats) => {
      let nextState: AchievementStats | null = null;
      setStats(prev => {
        nextState = updater(prev);
        return nextState;
      });
      if (nextState) {
        await persistStats(nextState);
        await syncAchievementsToApi(nextState, claimedAchievements);
      }
    },
    [claimedAchievements, persistStats, syncAchievementsToApi],
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

  const claimAchievement = useCallback(
    async (achievementId: string) => {
      let nextClaims: Record<string, boolean> | null = null;
      setClaimedAchievements(prev => {
        if (prev[achievementId]) {
          return prev;
        }
        nextClaims = {
          ...prev,
          [achievementId]: true,
        };
        return nextClaims;
      });
      if (nextClaims) {
        await persistClaims(nextClaims);
        await syncAchievementsToApi(stats, nextClaims);
      }
    },
    [persistClaims, stats, syncAchievementsToApi],
  );

  const resetAchievements = useCallback(async () => {
    setStats(DEFAULT_STATS);
    setClaimedAchievements({});
    await persistStats(DEFAULT_STATS);
    await persistClaims({});
    try {
      await AsyncStorage.removeItem(CLAIMED_STORAGE_KEY);
    } catch (error) {
      console.error('Unable to reset claimed achievements', error);
    }
    await syncAchievementsToApi(DEFAULT_STATS, {});
  }, [persistStats, persistClaims, syncAchievementsToApi]);

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
          claimed: Boolean(claimedAchievements[def.id]),
        };
      }),
    [claimedAchievements, stats],
  );

  const value = useMemo(
    () => ({
      stats,
      loading,
      achievements,
      recordAnswer,
      recordQuizCompletion,
      claimAchievement,
      resetAchievements,
    }),
    [
      achievements,
      claimAchievement,
      loading,
      recordAnswer,
      recordQuizCompletion,
      resetAchievements,
      stats,
    ],
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
