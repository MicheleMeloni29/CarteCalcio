import { registerRootComponent } from 'expo';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider, useAuth } from './hooks/AuthProvider';
import AuthStackNavigator from './app/navigators/AuthStackNavigation';
import DrawerNavigator from './app/navigators/DrawerNavigator';

function AppNavigator() {
    const { user } = useAuth();

    return (
        <NavigationContainer>
            {user ? <DrawerNavigator /> : <AuthStackNavigator />}
        </NavigationContainer>
    );
}

function App() {
    return (
        <AuthProvider>
            <AppNavigator />
        </AuthProvider>
    );
}

registerRootComponent(App);
