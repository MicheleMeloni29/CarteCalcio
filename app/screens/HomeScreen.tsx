import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { MainStackParamList } from '../navigators/MainStackNavigator';
import TopStatusBar from '../../components/ui/TopStatusBar';

type HomeScreenNavigationProp = StackNavigationProp<MainStackParamList, 'Home'>;

const menuItems = [
  {
    key: 'collections',
    label: 'COLLECTION',
    description: 'View the cards you own',
    route: 'Collection' as const,
  },
  {
    key: 'shop',
    label: 'SHOP',
    description: 'Buy packages and special offers',
    route: 'Shop' as const,
  },
  {
    key: 'earn',
    label: 'EARN',
    description: 'Learn how to earn rewards',
    route: 'Earn' as const,
  },
  {
    key: 'settings',
    label: 'SETTINGS',
    description: 'Manage accounts and preferences',
    route: 'Settings' as const,
  },
];

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();

  return (
    <ImageBackground
      source={require('../../assets/images/HomeBackground.jpg')}
      style={styles.background}
      imageStyle={styles.backgroundImage}
    >
      <View style={styles.overlay}>
        <TopStatusBar />
        <View style={styles.content}>
            <Text style={styles.heading}>Serie A Exchange</Text>
            <Text style={styles.subtitle}>
              Choose where to continue your experience
            </Text>

            <View style={styles.menuContainer}>
              {menuItems.map((item, index) => {
                const isLeftAligned = index === 1 || item.key === 'settings';

                return (
                  <TouchableOpacity
                    key={item.key}
                    style={[
                      styles.menuButtonWrapper,
                      isLeftAligned
                        ? styles.menuButtonWrapperLeft
                        : styles.menuButtonWrapperRight,
                    ]}
                    activeOpacity={0.85}
                    onPress={() => {
                      if (item.route) {
                        navigation.navigate(item.route);
                      }
                    }}
                  >
                    <View
                      style={[
                        styles.menuButtonBackground,
                        isLeftAligned
                          ? styles.menuButtonBackgroundLeft
                          : styles.menuButtonBackgroundRight,
                      ]}
                    >
                      <View
                        style={[
                          styles.menuContent,
                          isLeftAligned
                            ? styles.menuContentLeft
                            : styles.menuContentRight,
                        ]}
                      >
                        <Text
                          style={[
                            styles.menuLabel,
                            isLeftAligned ? styles.textLeft : styles.textRight,
                          ]}
                        >
                          {item.label}
                        </Text>
                        <Text
                          style={[
                            styles.menuDescription,
                            isLeftAligned ? styles.textLeft : styles.textRight,
                          ]}
                        >
                          {item.description}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
        </View>
      </View>
    </ImageBackground>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  backgroundImage: {
    opacity: 0.65,
  },
  overlay: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  heading: {
    fontSize: 34,
    fontWeight: 'bold',
    color: '#00a028ff',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#d0d0d0',
    textAlign: 'center',
    marginBottom: 60,
  },
  menuContainer: {
    gap: 30,
  },
  menuButtonWrapper: {
    width: '90%',
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  menuButtonWrapperLeft: {
    alignSelf: 'flex-start',
    marginLeft: 60,
    marginRight: 'auto',
  },
  menuButtonWrapperRight: {
    alignSelf: 'flex-start',
    marginLeft: -44,
    marginRight: 'auto',
  },
  menuButtonBackground: {
    backgroundColor: 'rgba(14, 12, 15, 0.85)',
    borderRadius: 14,
    borderWidth: 4,
    borderColor: '#00a028ff',
    paddingVertical: 20,
    paddingHorizontal: 28,
  },
  menuButtonBackgroundLeft: {
    transform: [{ skewX: '12deg' }],
    marginLeft: 28,
    marginRight: -48,
  },
  menuButtonBackgroundRight: {
    transform: [{ skewX: '-12deg' }],
    marginRight: 28,
    marginLeft: -48,
  },
  menuContent: {
    transform: [{ skewX: '0deg' }],
  },
  menuContentLeft: {
    transform: [{ skewX: '-12deg' }],
  },
  menuContentRight: {
    transform: [{ skewX: '12deg' }],
  },
  textLeft: {
    textAlign: 'left',
  },
  textRight: {
    textAlign: 'right',
  },
  menuLabel: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#00a028ff',
    marginBottom: 8,
  },
  menuDescription: {
    fontSize: 14,
    color: '#f0f0f0',
  },
});
