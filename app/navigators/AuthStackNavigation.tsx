import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';

export type AuthStackParamList = {
    Login: undefined;
    Register: undefined;
};

const Stack = createStackNavigator<AuthStackParamList>();

const AuthStackNavigator: React.FC = () => (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
);

export default AuthStackNavigator;
