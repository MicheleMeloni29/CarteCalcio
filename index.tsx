import { registerRootComponent } from 'expo';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './hooks/AuthProvider';
import { CreditProvider } from './hooks/CreditProvider';
import { AchievementProvider } from './hooks/AchievementProvider';
import AuthStackNavigator from './app/navigators/AuthStackNavigation';
import MainStackNavigator from './app/navigators/MainStackNavigator';
import { rootNavigationRef } from './app/navigators/navigationRef';

function AppNavigator() {
    const { accessToken } = useAuth();

    return (
        <NavigationContainer ref={rootNavigationRef}>
            {accessToken ? <MainStackNavigator /> : <AuthStackNavigator />}
        </NavigationContainer>
    );
}

function App() {
    return (
        <AuthProvider>
            <SafeAreaProvider>
                <CreditProvider>
                    <AchievementProvider>
                        <AppNavigator />
                    </AchievementProvider>
                </CreditProvider>
            </SafeAreaProvider>
        </AuthProvider>
    );
}

registerRootComponent(App);
