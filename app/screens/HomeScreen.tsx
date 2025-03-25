import React from 'react';
import { View, Text, StyleSheet, ImageBackground } from 'react-native';

export default function HomeScreen() {
  return (
    <ImageBackground
          source={require('../../assets/images/pratoBackground.webp')} 
          style={styles.background}
    >
      <View>
        <Text>Test</Text>
      </View>
    </ImageBackground>
    
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    resizeMode: 'cover',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
});

