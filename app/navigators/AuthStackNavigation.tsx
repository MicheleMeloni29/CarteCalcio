import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import DrawerNavigator from './DrawerNavigator';
import { RootStackParamList } from './MainTabNavigator'; // Importa RootStackParamList
import HomeScreen from '../screens/HomeScreen';

export type AuthStackParamList = {
    Login: undefined;
    Register: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

const AuthStackNavigator: React.FC = () => {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="Main" component={DrawerNavigator} />
        </Stack.Navigator>
    );
}

export default AuthStackNavigator;

