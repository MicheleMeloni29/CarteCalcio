import type {
  CompositeNavigationProp,
  NavigatorScreenParams,
} from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { StackNavigationProp } from '@react-navigation/stack';

export type QuizProgressUpdate = {
  slug: string;
  answered: number;
  total: number;
  correct: number;
};

export type OpenedPackCard = {
  id: number | null;
  type: string;
  rarity: string | null;
  name: string;
  season?: string | null;
  image_url?: string | null;
  team?: string | null;
  attack?: number | null;
  defense?: number | null;
  save?: number | null;
  abilities?: string | null;
  attack_bonus?: number | null;
  defense_bonus?: number | null;
  effect?: string | null;
  duration?: number | null;
};

export type HomeTabParamList = {
  Home: undefined;
  Collection: undefined;
  Earn: { progressUpdate?: QuizProgressUpdate } | undefined;
  Shop: undefined;
  Exchange: undefined;
};

export type MainStackParamList = {
  Tabs: NavigatorScreenParams<HomeTabParamList>;
  Achievement: { focusAchievementId?: string } | undefined;
  Settings: undefined;
  QuizPlay: {
    themeSlug: string;
    themeName: string;
    totalQuestions: number;
    initialAnswered?: number;
    initialCorrect?: number;
  };
  PackOpen: {
    packSlug: string;
    packName: string;
    cards: OpenedPackCard[];
    credits: number | null;
  };
};

export type AppNavigationProp<RouteName extends keyof HomeTabParamList> =
  CompositeNavigationProp<
    BottomTabNavigationProp<HomeTabParamList, RouteName>,
    StackNavigationProp<MainStackParamList>
  >;
