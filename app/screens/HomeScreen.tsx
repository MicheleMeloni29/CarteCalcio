import React from 'react';
import { View, Text, StyleSheet, ImageBackground, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';

import TopStatusBar from '../../components/ui/TopStatusBar';
import type { MainStackParamList } from '../navigators/types';

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<MainStackParamList>>();

  return (
    <ImageBackground
      source={require('../../assets/images//Backgrounds/HomeBackground.jpg')}
      style={styles.background}
      imageStyle={styles.backgroundImage}
    >
      <View style={styles.overlay}>
        <TopStatusBar edgePadding={0} />
        <View style={styles.content}>
          <Text style={styles.heading}>Serie A Exchange</Text>
          <Text style={styles.subtitle}>
            Choose where to continue your experience
          </Text>

          <View style={styles.topCtaRow}>
            <TouchableOpacity
              style={styles.achievementButton}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('Achievement')}
            >
              <Feather name="award" size={36} color="#85cbb1" />
              <Text style={styles.achievementText}>Achiev.</Text>
            </TouchableOpacity>
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
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 10,
  },
  heading: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#00a028ff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#d0d0d0',
    textAlign: 'center',
  },
  topCtaRow: {
    width: '100%',
    paddingHorizontal: 0,
    alignItems: 'flex-end',
    marginTop: 10,
    transform: [{ translateX: 26 }],
  },
  achievementButton: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 15,
    borderRadius: 99,
    backgroundColor: 'rgba(0, 10, 7, 0.78)',
  },
  achievementText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#85cbb1',
    marginTop: -3,
  },
});
