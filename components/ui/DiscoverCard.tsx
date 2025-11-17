import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5 } from '@expo/vector-icons';

const CARD_DIMENSIONS = { width: 60, height: 90, borderRadius: 10 };
const ICON_SIZE = 46;
const BANNER_HEIGHT = 72;

const DiscoverCard: React.FC = () => {
  return (
    <LinearGradient
      colors={['#111827', '#0f172a', '#020617']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.card, CARD_DIMENSIONS]}
    >
      <View style={[styles.bannerWrapper, { height: BANNER_HEIGHT }]}>
        <FontAwesome5 name="user-alt" size={ICON_SIZE} color="#005d18ff" />
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  card: {
    marginTop: 4,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 3,
    borderColor: '#00a028ff',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 6,
  },
  bannerWrapper: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    marginTop: 8,
  },
  textContainer: {
    alignItems: 'center',
  },
});

export default DiscoverCard;
