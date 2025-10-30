import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import TopStatusBar from '../../components/ui/TopStatusBar';

const AchievementScreen: React.FC = () => (
  <View style={styles.container}>
    <TopStatusBar />
    <View style={styles.content}>
      <Text style={styles.heading}>Achievement</Text>
      <Text style={styles.description}>
        Qui troverai le sfide completate e gli obiettivi futuri. Continua a giocare per
        sbloccare nuovi riconoscimenti!
      </Text>
    </View>
  </View>
);

export default AchievementScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    backgroundColor: '#0e0c0f',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    gap: 46,
  },
  heading: {
    fontSize: 28,
    fontWeight: '800',
    color: '#00a028ff',
    paddingTop: 150,
  },
  description: {
    fontSize: 16,
    color: '#d0d0d0',
    textAlign: 'center',
    lineHeight: 22,
  },
});
