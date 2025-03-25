import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AllCardsScreen from '../screens/AllCards';
import HomeScreen from '../screens/HomeScreen';

export type MainTabParamList = {
    Home: undefined;
    AllCards: undefined;
};

export type RootStackParamList = {
    Login: undefined;
    Register: undefined;
    Main: undefined;
    Home: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainTabNavigator() {
    return (
        <Tab.Navigator
            initialRouteName="Home"
            screenOptions={({ route }) => ({
                tabBarIcon: ({ focused }) => {
                    let iconName: string | undefined;
                    let iconColor = focused ? 'green' : 'green';

                    switch (route.name) {
                        case 'Home':
                            iconName = focused ? 'home-sharp' : 'home-outline'; // Icona per Home
                            break;
                        case 'AllCards':
                            iconName = focused ? 'albums-sharp' : 'albums-outline'; // Icona per AllCards
                            break;
                    }

                    return <Ionicons name={iconName as keyof typeof Ionicons.glyphMap} size={28} color={iconColor} />;
                },
                tabBarShowLabel: false,
                tabBarStyle: { height: 50, paddingBottom: 5, backgroundColor: '#0e0c0f' }, // Stile per personalizzare la barra
            })}
        >
            <Tab.Screen name="Home" component={HomeScreen} />
            <Tab.Screen name="AllCards" component={AllCardsScreen} />
        </Tab.Navigator>
    );
}
