import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { HomeTabParamList } from './types';
import HomeScreen from '../screens/HomeScreen';
import CollectionScreen from '../screens/CollectionScreen';
import EarnScreen from '../screens/EarnScreen';
import ShopScreen from '../screens/ShopScreen';
import ExchangeScreen from '../screens/ExchangeScreen';

const Tab = createBottomTabNavigator<HomeTabParamList>();

const iconMap: Record<keyof HomeTabParamList, keyof typeof Feather.glyphMap> = {
  Home: 'home',
  Collection: 'layers',
  Earn: 'book-open',
  Shop: 'shopping-bag',
  Exchange: 'refresh-ccw',
};

const labelMap: Record<keyof HomeTabParamList, string> = {
  Home: 'Home',
  Collection: 'Collection',
  Earn: 'Earn',
  Shop: 'Shop',
  Exchange: 'Exchange',
};

const HomeTabNavigator: React.FC = () => (
  <Tab.Navigator
    id={undefined}
    initialRouteName="Home"
    screenOptions={{ headerShown: false }}
    tabBar={props => <FloatingTabBar {...props} />}
  >
    <Tab.Screen name="Collection" component={CollectionScreen} />
    <Tab.Screen name="Earn" component={EarnScreen} />
    <Tab.Screen name="Home" component={HomeScreen} />
    <Tab.Screen name="Shop" component={ShopScreen} />
    <Tab.Screen name="Exchange" component={ExchangeScreen} />
  </Tab.Navigator>
);

export default HomeTabNavigator;

const TAB_HORIZONTAL_PADDING = 20;

const FloatingTabBar: React.FC<BottomTabBarProps> = ({
  state,
  descriptors,
  navigation,
}) => {
  const insets = useSafeAreaInsets();
  const [rowWidth, setRowWidth] = useState(0);
  const indicatorX = useRef(new Animated.Value(0)).current;
  const INDICATOR_INSET = -1;

  const contentWidth = useMemo(
    () => Math.max(0, rowWidth - TAB_HORIZONTAL_PADDING * 2),
    [rowWidth],
  );

  const tabWidth = useMemo(
    () =>
      state.routes.length > 0 && contentWidth > 0
        ? contentWidth / state.routes.length
        : 0,
    [contentWidth, state.routes.length],
  );

  useEffect(() => {
    if (!tabWidth) {
      return;
    }
    const indicatorWidth = Math.max(0, tabWidth - INDICATOR_INSET * 2);
    const offset = (tabWidth - indicatorWidth) / 2;
    Animated.spring(indicatorX, {
      toValue: TAB_HORIZONTAL_PADDING + state.index * tabWidth + offset,
      damping: 18,
      stiffness: 180,
      useNativeDriver: true,
    }).start();
  }, [state.index, indicatorX, tabWidth, contentWidth]);

  const handleLayout = (event: LayoutChangeEvent) => {
    setRowWidth(event.nativeEvent.layout.width);
  };

  return (
    <View pointerEvents="box-none" style={[styles.wrapper, { paddingBottom: insets.bottom + 12 }]}>
      <LinearGradient
        colors={['rgba(0, 10, 7, 0.78)', 'rgba(1, 6, 4, 0.78)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientShell}
      >
        <View style={styles.tabRow} onLayout={handleLayout}>
          {tabWidth > 0 ? (
            <Animated.View
              style={[
                styles.indicator,
                {
                  width: Math.max(0, tabWidth - INDICATOR_INSET * 2),
                  transform: [{ translateX: indicatorX }],
                },
              ]}
            />
          ) : null}

          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const label = labelMap[route.name as keyof HomeTabParamList] ?? route.name;
            const iconName = iconMap[route.name as keyof HomeTabParamList];
            const isFocused = state.index === index;
            const iconSize = route.name === 'Home' ? 30 : 30;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

            return (
              <Pressable
                key={route.key}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel={options.tabBarAccessibilityLabel}
                onPress={onPress}
                style={styles.tabItem}
              >
                <Feather
                  name={iconName}
                  size={iconSize}
                  color={isFocused ? '#00a028ff' : '#85cbb1'}
                />
                <Text
                  style={[
                    styles.tabLabel,
                    isFocused ? styles.tabLabelActive : undefined,
                  ]}
                  numberOfLines={1}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  gradientShell: {
    width: '92%',
    borderRadius: 38,
    elevation: 18,
    shadowColor: '#00a028ff',
    shadowOpacity: 0.55,
    shadowOffset: { width: 0, height: 14 },
    shadowRadius: 20,
    overflow: 'hidden',
  },
  tabRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: TAB_HORIZONTAL_PADDING,
    paddingVertical: 10,
    position: 'relative',
  },
  indicator: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 255, 176, 0.16)',
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    flex: 1,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#85cbb1',
  },
  tabLabelActive: {
    color: '#00a028ff',
  },
});
