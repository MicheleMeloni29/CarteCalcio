import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import HomeScreen from '../screens/HomeScreen';
import CollectionScreen from '../screens/CollectionScreen';
import ShopScreen from '../screens/ShopScreen';
import EarnScreen from '../screens/EarnScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ExchangeScreen from '../screens/ExchangeScreen';
import AchievementScreen from '../screens/AchievementScreen';
import QuizPlayScreen from '../screens/QuizPlayScreen';
import PackOpenScreen from '../screens/PackOpenScreen';

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

export type MainStackParamList = {
    Home: undefined;
    Collection: undefined;
    Shop: undefined;
    Earn: { progressUpdate?: QuizProgressUpdate } | undefined;
    Exchange: undefined;
    Achievement: undefined;
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

const Stack = createStackNavigator<MainStackParamList>();

const MainStackNavigator: React.FC = () => (
    <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
            headerShown: false,
            gestureEnabled: true,
        }}
    >
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Collection" component={CollectionScreen} />
        <Stack.Screen name="Shop" component={ShopScreen} />
        <Stack.Screen name="Earn" component={EarnScreen} />
        <Stack.Screen name="Exchange" component={ExchangeScreen} />
        <Stack.Screen name="Achievement" component={AchievementScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="QuizPlay" component={QuizPlayScreen} />
        <Stack.Screen name="PackOpen" component={PackOpenScreen} />
    </Stack.Navigator>
);

export default MainStackNavigator;
