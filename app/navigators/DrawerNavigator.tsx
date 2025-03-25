import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import AllCardsScreen from '../screens/AllCards';
import MainTabNavigator from '../navigators/MainTabNavigator';

const Drawer = createDrawerNavigator();

export default function DrawerNavigator() {
    return (
        <Drawer.Navigator initialRouteName="MainTab" screenOptions={{ drawerPosition: 'right', headerShown: false }}>
            <Drawer.Screen name="MainTab" component={MainTabNavigator} />
            <Drawer.Screen name="AllCardsScreen" component={AllCardsScreen} />
        </Drawer.Navigator>
    );
}