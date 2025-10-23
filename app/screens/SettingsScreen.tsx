import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import TopStatusBar from '../../components/ui/TopStatusBar';

const SettingsScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <TopStatusBar />
      <View style={styles.content}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>Soon</Text>
      </View>
    </View>
  );
};

export default SettingsScreen;

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
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#00a028ff',
    marginTop: 12,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#ffffff',
    textAlign: 'center',
  },
});
