import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../../hooks/AuthProvider';
import { useCredits } from '../../hooks/CreditProvider';

const coinSource = require('../../assets/images/Coin.png');

const TopStatusBar: React.FC = () => {
  const { accessToken } = useAuth();
  const { credits, username } = useCredits();
  const insets = useSafeAreaInsets();

  if (!accessToken || !username) {
    return null;
  }

  return (
    <View style={[styles.wrapper, { paddingTop: insets.top + 4 }]}>
      <View style={styles.container}>
        <Text numberOfLines={1} style={styles.username}>
          {username}
        </Text>
        <View style={styles.creditContainer}>
          <Image source={coinSource} style={styles.coin} resizeMode="contain" />
          <Text style={styles.creditValue}>{credits ?? 0}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(14, 12, 15, 0.3)',
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  username: {
    fontSize: 16,
    fontWeight: '800',
    color: '#00a028ff',
    maxWidth: '90%',
  },
  creditContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  coin: {
    width: 22,
    height: 22,
    marginRight: 6,
  },
  creditValue: {
    fontSize: 17,
    fontWeight: '700',
    color: '#debd43ff',
  },
});

export default TopStatusBar;
