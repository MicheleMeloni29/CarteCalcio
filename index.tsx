import { registerRootComponent } from 'expo';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './hooks/AuthProvider';
import { CreditProvider } from './hooks/CreditProvider';
import AuthStackNavigator from './app/navigators/AuthStackNavigation';
import MainStackNavigator from './app/navigators/MainStackNavigator';

function AppNavigator() {
    const { accessToken } = useAuth();

    return (
        <NavigationContainer>
            {accessToken ? <MainStackNavigator /> : <AuthStackNavigator />}
        </NavigationContainer>
    );
}

function App() {
    return (
        <AuthProvider>
            <SafeAreaProvider>
                <CreditProvider>
                    <AppNavigator />
                </CreditProvider>
            </SafeAreaProvider>
        </AuthProvider>
    );
}

registerRootComponent(App);
