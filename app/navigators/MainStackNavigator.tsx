import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import HomeTabNavigator from './HomeTabNavigator';
import type { MainStackParamList } from './types';
import AchievementScreen from '../screens/AchievementScreen';
import SettingsScreen from '../screens/SettingsScreen';
import QuizPlayScreen from '../screens/QuizPlayScreen';
import PackOpenScreen from '../screens/PackOpenScreen';

const Stack = createStackNavigator<MainStackParamList>();

const MainStackNavigator: React.FC = () => (
    <Stack.Navigator
        id={undefined}
        initialRouteName="Tabs"
        screenOptions={{
            headerShown: false,
            gestureEnabled: true,
        }}
    >
        <Stack.Screen name="Tabs" component={HomeTabNavigator} />
        <Stack.Screen name="Achievement" component={AchievementScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="QuizPlay" component={QuizPlayScreen} />
        <Stack.Screen name="PackOpen" component={PackOpenScreen} />
    </Stack.Navigator>
);

export default MainStackNavigator;
