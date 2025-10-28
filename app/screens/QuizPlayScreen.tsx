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
import {
  RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

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

const QuizPlayScreen: React.FC = () => {
  const route = useRoute<RouteProp<MainStackParamList, 'QuizPlay'>>();
  const navigation = useNavigation<StackNavigationProp<MainStackParamList, 'QuizPlay'>>();
  const { themeSlug, themeName, initialAnswered = 0 } = route.params;
  const { adjustCredits } = useCredits();

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [selectedAnswerId, setSelectedAnswerId] = useState<number | null>(null);
  const [answeredCount, setAnsweredCount] = useState<number>(0);
  const initialAnsweredRef = useRef<number>(initialAnswered);
  const [isAwarding, setIsAwarding] = useState<boolean>(false);

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
      setQuestions(loadedQuestions);
      const total = loadedQuestions.length;
      const boundedInitial = Math.max(
        0,
        Math.min(initialAnsweredRef.current ?? 0, total),
      );
      const startIndex = total > 0 ? Math.min(boundedInitial, total - 1) : 0;
      setCurrentIndex(startIndex);
      setSelectedAnswerId(null);
      setAnsweredCount(boundedInitial);
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
    (finalAnswered: number) => {
      if (questions.length === 0) {
        navigation.goBack();
        return;
      }

      const normalizedAnswered = Math.min(finalAnswered, questions.length);
      navigation.navigate('Earn', {
        progressUpdate: {
          slug: themeSlug,
          answered: normalizedAnswered,
          total: questions.length,
        },
      });
    },
    [navigation, questions.length, themeSlug],
  );

  const handleExit = useCallback(() => {
    if (isAwarding) {
      return;
    }
    finishQuiz(answeredCount);
  }, [answeredCount, finishQuiz, isAwarding]);

  const handleAnswerPress = useCallback(
    async (answer: QuizAnswer) => {
      if (!currentQuestion || selectedAnswerId !== null || isAwarding) {
        return;
      }

      const previousAnswered = answeredCount;
      const nextAnswered = Math.min(answeredCount + 1, questions.length);

      setSelectedAnswerId(answer.id);
      setAnsweredCount(nextAnswered);
      setIsAwarding(true);

      try {
        await adjustCredits(answer.is_correct ? 10 : -10);
        initialAnsweredRef.current = nextAnswered;
      } catch (err) {
        console.error('Unable to adjust credits from quiz answer', err);
        const errorMessage =
          err instanceof Error && err.message === 'Missing access token'
            ? 'Devi effettuare l\'accesso per ottenere crediti dalle risposte.'
            : 'Non e stato possibile aggiornare i crediti. Controlla la connessione e riprova.';
        Alert.alert('Errore crediti', errorMessage);
        setSelectedAnswerId(null);
        setAnsweredCount(previousAnswered);
        initialAnsweredRef.current = previousAnswered;
      } finally {
        setIsAwarding(false);
      }
    },
    [
      adjustCredits,
      answeredCount,
      currentQuestion,
      isAwarding,
      questions.length,
      selectedAnswerId,
    ],
  );

  const goToNext = useCallback(() => {
    if (!currentQuestion || selectedAnswerId === null || isAwarding) {
      return;
    }

    const isLastQuestion = currentIndex >= questions.length - 1;
    if (isLastQuestion) {
      finishQuiz(answeredCount);
      return;
    }

    setCurrentIndex(prev => prev + 1);
    setSelectedAnswerId(null);
  }, [
    answeredCount,
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
      <View style={styles.header}>
        <TouchableOpacity style={styles.exitButton} onPress={handleExit}>
          <Text style={styles.exitLabel}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.heading}>{themeName}</Text>
        <Text style={styles.counter}>{questionCounterText}</Text>
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
  header: {
    marginBottom: 12,
  },
  heading: {
    fontSize: 28,
    fontWeight: '700',
    color: '#22c55e',
    textAlign: 'center',
  },
  counter: {
    fontSize: 14,
    color: '#f8fafc',
    textAlign: 'center',
    marginTop: 6,
  },
  exitButton: {
    alignSelf: 'flex-end',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(248, 250, 252, 0.08)',
    borderRadius: 10,
    marginBottom: 8,
  },
  exitLabel: {
    color: '#f8fafc',
    fontSize: 14,
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
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.35)',
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
