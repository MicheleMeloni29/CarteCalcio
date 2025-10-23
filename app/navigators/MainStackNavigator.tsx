import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import HomeScreen from '../screens/HomeScreen';
import AllCardsScreen from '../screens/AllCards';
import ShopScreen from '../screens/ShopScreen';
import EarnScreen from '../screens/EarnScreen';
import SettingsScreen from '../screens/SettingsScreen';

export type MainStackParamList = {
    Home: undefined;
    AllCards: undefined;
    Shop: undefined;
    Earn: undefined;
    Settings: undefined;
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
        <Stack.Screen name="AllCards" component={AllCardsScreen} />
        <Stack.Screen name="Shop" component={ShopScreen} />
        <Stack.Screen name="Earn" component={EarnScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
);

export default MainStackNavigator;
