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
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

import TopStatusBar from '../../components/ui/TopStatusBar';
import { API_BASE_URL } from '../../constants/api';
import { useCredits } from '../../hooks/CreditProvider';
import type { MainStackParamList } from '../navigators/MainStackNavigator';

type QuizAnswer = {
  id: number;
  text: string;
  is_correct: boolean;
};

type QuizQuestion = {
  id: number;
  text: string;
  explanation: string;
  answers: QuizAnswer[];
};

type RewardConfig = {
  correct: number;
  wrong: number;
  completion: number;
};

const shuffleArray = <T,>(input: T[]): T[] => {
  const result = [...input];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = result[i];
    result[i] = result[j];
    result[j] = temp;
  }
  return result;
};

const DEFAULT_REWARD_CONFIG: RewardConfig = {
  correct: 10,
  wrong: 5,
  completion: 10,
};

const normalizeThemeSlug = (slug: string | undefined) =>
  slug?.toLowerCase().replace(/[/_]/g, '-') ?? '';

const REWARD_CONFIG_MAP: Record<string, RewardConfig> = {
  stadiums: { correct: 10, wrong: 0, completion: 10 },
  champions: { correct: 10, wrong: 5, completion: 10 },
  'top-scorer': { correct: 15, wrong: 5, completion: 15 },
  'top_scorer': { correct: 15, wrong: 5, completion: 15 },
  records: { correct: 20, wrong: 5, completion: 20 },
  'season24-25': { correct: 30, wrong: 15, completion: 30 },
};

const QuizPlayScreen: React.FC = () => {
  const route = useRoute<RouteProp<MainStackParamList, 'QuizPlay'>>();
  const navigation = useNavigation<StackNavigationProp<MainStackParamList, 'QuizPlay'>>();
  const { themeSlug, themeName, initialAnswered = 0, initialCorrect = 0 } = route.params;
  const { adjustCredits } = useCredits();

  const normalizedThemeSlug = useMemo(
    () => themeSlug?.toLowerCase().replace(/[/_]/g, '-') ?? themeSlug,
    [themeSlug],
  );

  const rewardConfig = useMemo(
    () => REWARD_CONFIG_MAP[normalizedThemeSlug ?? themeSlug] ?? DEFAULT_REWARD_CONFIG,
    [normalizedThemeSlug, themeSlug],
  );

  const [correctCount, setCorrectCount] = useState<number>(initialCorrect);
  const initialCorrectRef = useRef<number>(initialCorrect);

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [selectedAnswerId, setSelectedAnswerId] = useState<number | null>(null);
  const [answeredCount, setAnsweredCount] = useState<number>(0);
  const initialAnsweredRef = useRef<number>(initialAnswered);
  const [isAwarding, setIsAwarding] = useState<boolean>(false);

  useEffect(() => {
    initialAnsweredRef.current = initialAnswered;
    initialCorrectRef.current = initialCorrect;
    setCorrectCount(initialCorrect);
  }, [initialAnswered, initialCorrect]);

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/quiz/themes/${themeSlug}/`);
      if (!response.ok) {
        throw new Error(`Failed to fetch questions (${response.status})`);
      }
      const data = await response.json();
      const loadedQuestions: QuizQuestion[] = Array.isArray(data?.questions)
        ? data.questions.map(question => ({
            ...question,
            answers: Array.isArray(question.answers) ? question.answers : [],
          }))
        : [];
      const previouslyAnswered = initialAnsweredRef.current ?? 0;
      const normalizedQuestions =
        previouslyAnswered > 0 ? loadedQuestions : shuffleArray(loadedQuestions);
      setQuestions(normalizedQuestions);
      const total = normalizedQuestions.length;
      const boundedInitial = Math.max(
        0,
        Math.min(initialAnsweredRef.current ?? 0, total),
      );
      const startIndex = total > 0 ? Math.min(boundedInitial, total - 1) : 0;
      setCurrentIndex(startIndex);
      setSelectedAnswerId(null);
      setAnsweredCount(boundedInitial);
      const boundedCorrect = Math.max(
        0,
        Math.min(initialCorrectRef.current ?? 0, total),
      );
      setCorrectCount(boundedCorrect);
      initialCorrectRef.current = boundedCorrect;
      initialAnsweredRef.current = boundedInitial;
    } catch (err) {
      console.error('Unable to load quiz questions', err);
      setError('Impossibile caricare le domande. Controlla la connessione e riprova.');
    } finally {
      setLoading(false);
    }
  }, [themeSlug]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  const currentQuestion: QuizQuestion | undefined = questions[currentIndex];

  const finishQuiz = useCallback(
    (finalAnswered: number, finalCorrect: number) => {
      if (questions.length === 0) {
        navigation.goBack();
        return;
      }

      const normalizedAnswered = Math.min(finalAnswered, questions.length);
      const normalizedCorrect = Math.min(finalCorrect, questions.length);
      navigation.navigate('Earn', {
        progressUpdate: {
          slug: themeSlug,
          answered: normalizedAnswered,
          total: questions.length,
          correct: normalizedCorrect,
        },
      });
    },
    [navigation, questions.length, themeSlug],
  );

  const handleExit = useCallback(() => {
    if (isAwarding) {
      return;
    }
    finishQuiz(answeredCount, initialCorrectRef.current ?? correctCount);
  }, [answeredCount, correctCount, finishQuiz, isAwarding]);

  const handleAnswerPress = useCallback(
    async (answer: QuizAnswer) => {
      if (!currentQuestion || selectedAnswerId !== null || isAwarding) {
        return;
      }

      const previousAnswered = answeredCount;
      const previousCorrect = correctCount;
      const nextAnswered = Math.min(answeredCount + 1, questions.length);
      const nextCorrect = answer.is_correct
        ? Math.min(previousCorrect + 1, questions.length)
        : previousCorrect;

      setSelectedAnswerId(answer.id);
      setAnsweredCount(nextAnswered);
      setCorrectCount(nextCorrect);
      setIsAwarding(true);

      try {
        const delta = answer.is_correct
          ? rewardConfig.correct
          : -rewardConfig.wrong;
        await adjustCredits(delta);
        initialAnsweredRef.current = nextAnswered;
        initialCorrectRef.current = nextCorrect;
      } catch (err) {
        console.error('Unable to adjust credits from quiz answer', err);
        const errorMessage =
          err instanceof Error && err.message === 'Missing access token'
            ? 'Devi effettuare l\'accesso per ottenere crediti dalle risposte.'
            : 'Non e stato possibile aggiornare i crediti. Controlla la connessione e riprova.';
        Alert.alert('Errore crediti', errorMessage);
        setSelectedAnswerId(null);
        setAnsweredCount(previousAnswered);
        setCorrectCount(previousCorrect);
        initialAnsweredRef.current = previousAnswered;
        initialCorrectRef.current = previousCorrect;
      } finally {
        setIsAwarding(false);
      }
    },
    [
      adjustCredits,
      answeredCount,
      correctCount,
      currentQuestion,
      isAwarding,
      questions.length,
      rewardConfig,
      selectedAnswerId,
    ],
  );

  const goToNext = useCallback(() => {
    if (!currentQuestion || selectedAnswerId === null || isAwarding) {
      return;
    }

    const isLastQuestion = currentIndex >= questions.length - 1;
    if (isLastQuestion) {
      finishQuiz(answeredCount, initialCorrectRef.current ?? correctCount);
      return;
    }

    setCurrentIndex(prev => prev + 1);
    setSelectedAnswerId(null);
  }, [
    answeredCount,
    correctCount,
    currentIndex,
    currentQuestion,
    finishQuiz,
    isAwarding,
    questions.length,
    selectedAnswerId,
  ]);

  const questionCounterText = useMemo(() => {
    if (questions.length === 0) {
      return '';
    }
    return `${currentIndex + 1} / ${questions.length}`;
  }, [currentIndex, questions.length]);

  const selectedAnswer = useMemo(() => {
    if (!currentQuestion || selectedAnswerId === null) {
      return null;
    }
    return currentQuestion.answers.find(answer => answer.id === selectedAnswerId) ?? null;
  }, [currentQuestion, selectedAnswerId]);

  const selectedIsCorrect = selectedAnswer?.is_correct ?? false;

  return (
    <View style={styles.container}>
      <TopStatusBar />
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleExit}
          activeOpacity={0.85}
        >
          <Ionicons name="arrow-back" size={22} color="#00a028ff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.heading}>{themeName}</Text>
          <Text style={styles.counter}>{questionCounterText}</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#22c55e" />
        </View>
      ) : error ? (
        <View style={styles.loaderContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchQuestions}>
            <Text style={styles.retryLabel}>Riprova</Text>
          </TouchableOpacity>
        </View>
      ) : !currentQuestion ? (
        <View style={styles.loaderContainer}>
          <Text style={styles.emptyText}>Nessuna domanda disponibile.</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchQuestions}>
            <Text style={styles.retryLabel}>Aggiorna</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.quizContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.questionCard}>
            <Text style={styles.questionText}>{currentQuestion.text}</Text>
            {selectedAnswerId !== null && currentQuestion.explanation ? (
              <Text style={styles.explanationText}>{currentQuestion.explanation}</Text>
            ) : null}
          </View>

          <View style={styles.answersWrapper}>
            {currentQuestion.answers.map(answer => {
              const isSelected = selectedAnswerId === answer.id;
              const buttonStyles = [
                styles.answerButton,
                selectedAnswerId !== null && answer.is_correct ? styles.answerCorrect : null,
                selectedAnswerId !== null && isSelected && !answer.is_correct ? styles.answerWrong : null,
                selectedAnswerId === null && isSelected ? styles.answerActive : null,
              ];

              return (
                <TouchableOpacity
                  key={answer.id}
                  style={buttonStyles}
                  activeOpacity={0.85}
                  onPress={() => handleAnswerPress(answer)}
                  disabled={selectedAnswerId !== null || isAwarding}
                >
                  <Text style={styles.answerText}>{answer.text}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={[
              styles.primaryButton,
              (selectedAnswerId === null || isAwarding) && styles.primaryButtonDisabled,
            ]}
            onPress={goToNext}
            disabled={selectedAnswerId === null || isAwarding}
          >
            <Text style={styles.primaryLabel}>
              {currentIndex >= questions.length - 1 ? 'Completa' : 'Prossima domanda'}
            </Text>
          </TouchableOpacity>

          {selectedAnswerId !== null ? (
            <Text style={selectedIsCorrect ? styles.feedbackPositive : styles.feedbackNegative}>
              {selectedIsCorrect ? 'Risposta corretta!' : 'Risposta errata.'}
            </Text>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
};

export default QuizPlayScreen;

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
    marginBottom: 32,
    marginTop: 20,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  heading: {
    fontSize: 28,
    fontWeight: '700',
    color: '#00a028ff',
  },
  counter: {
    fontSize: 14,
    color: '#f8fafc',
    marginTop: 6,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 15, 19, 0.65)',
    borderColor: 'rgba(0, 160, 40, 1)',
    borderWidth: 2,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  errorText: {
    textAlign: 'center',
    color: '#f87171',
    marginBottom: 16,
  },
  emptyText: {
    textAlign: 'center',
    color: '#cbd5f5',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#22c55e',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  retryLabel: {
    color: '#0e0c0f',
    fontWeight: '600',
    fontSize: 15,
  },
  quizContent: {
    paddingBottom: 40,
  },
  questionCard: {
    backgroundColor: 'rgba(15, 15, 19, 0.9)',
    borderRadius: 16,
    padding: 18,
    marginBottom: 18,
    borderWidth: 2,
    borderColor: '#00a028ff',
  },
  questionText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 10,
  },
  explanationText: {
    fontSize: 14,
    color: '#cbd5f5',
  },
  answersWrapper: {
    gap: 12,
    marginBottom: 20,
  },
  answerButton: {
    backgroundColor: 'rgba(32, 32, 36, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.35)',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  answerActive: {
    borderColor: '#38bdf8',
  },
  answerCorrect: {
    borderColor: 'rgba(52, 211, 153, 0.65)',
    backgroundColor: 'rgba(52, 211, 153, 0.18)',
  },
  answerWrong: {
    borderColor: 'rgba(248, 113, 113, 0.65)',
    backgroundColor: 'rgba(248, 113, 113, 0.18)',
  },
  answerText: {
    fontSize: 16,
    color: '#f8fafc',
  },
  primaryButton: {
    backgroundColor: '#22c55e',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonDisabled: {
    backgroundColor: 'rgba(34, 197, 94, 0.35)',
  },
  primaryLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0e0c0f',
  },
  feedbackPositive: {
    marginTop: 16,
    textAlign: 'center',
    color: '#34d399',
    fontWeight: '600',
  },
  feedbackNegative: {
    marginTop: 16,
    textAlign: 'center',
    color: '#f87171',
    fontWeight: '600',
  },
});

