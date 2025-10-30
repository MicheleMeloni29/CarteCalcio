import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import TopStatusBar from '../../components/ui/TopStatusBar';

const ExchangeScreen: React.FC = () => (
  <View style={styles.container}>
    <TopStatusBar />
    <View style={styles.content}>
      <Text style={styles.heading}>Exchange</Text>
      <Text style={styles.description}>
        Questa sezione sara presto disponibile per permetterti di scambiare le carte
        duplicate con altri giocatori. L'idea e' quella di creare una piattaforma divisa
        tra "proponi scambio" e "trova scambio". Nella prima, l'utente potra' inserire il
        doppione che desidera scambiare, ma solo con carte dello stesso valore.
        Se un altro utente, entra su "trova scambio", vedra' una lista di proposte di scambio
        che corrispondono alle carte che possiede
        doppie.
      </Text>
    </View>
  </View>
);

export default ExchangeScreen;

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
    paddingTop: 100,
  },
  description: {
    fontSize: 16,
    color: '#d0d0d0',
    textAlign: 'center',
    lineHeight: 22,
    alignItems: 'center',
  },
});
