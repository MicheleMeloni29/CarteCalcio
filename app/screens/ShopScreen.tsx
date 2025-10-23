import React, { useMemo, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useCredits } from '../../hooks/CreditProvider';
import TopStatusBar from '../../components/ui/TopStatusBar';

type ShopItem = {
  id: string;
  name: string;
  description: string;
  price: number;
};

const SHOP_ITEMS: ShopItem[] = [
  {
    id: 'starter-pack',
    name: 'Starter Pack',
    description: '5 carte comuni per avviare la tua collezione.',
    price: 150,
  },
  {
    id: 'rare-pack',
    name: 'Rare Pack',
    description: 'Contiene 3 carte rare garantite.',
    price: 400,
  },
  {
    id: 'legendary-pack',
    name: 'Legendary Pack',
    description: 'Una carta leggendaria assicurata.',
    price: 950,
  },
];

const ShopScreen: React.FC = () => {
  const { credits, adjustCredits } = useCredits();
  const [processingId, setProcessingId] = useState<string | null>(null);

  const availableCredits = credits ?? 0;

  const sortedItems = useMemo(
    () => [...SHOP_ITEMS].sort((a, b) => a.price - b.price),
    [],
  );

  const handlePurchase = async (item: ShopItem) => {
    if (processingId) {
      return;
    }

    if (availableCredits < item.price) {
      Alert.alert('Crediti insufficienti', 'Non hai abbastanza crediti per questo acquisto.');
      return;
    }

    setProcessingId(item.id);
    try {
      await adjustCredits(-item.price);
      Alert.alert('Acquisto completato', `${item.name} aggiunto al tuo inventario!`);
    } catch (error) {
      Alert.alert('Errore', 'Impossibile completare l\'acquisto, riprova.');
    } finally {
      setProcessingId(null);
    }
  };

  const renderItem = ({ item }: { item: ShopItem }) => {
    const disabled = processingId !== null && processingId !== item.id;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{item.name}</Text>
          <Text style={styles.cardPrice}>{item.price} crediti</Text>
        </View>
        <Text style={styles.cardDescription}>{item.description}</Text>
        <TouchableOpacity
          style={[
            styles.purchaseButton,
            (availableCredits < item.price || disabled) && styles.purchaseButtonDisabled,
          ]}
          activeOpacity={0.85}
          onPress={() => handlePurchase(item)}
          disabled={availableCredits < item.price || disabled}
        >
          <Text style={styles.purchaseLabel}>
            {processingId === item.id ? 'Acquisto...' : 'Acquista'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <TopStatusBar />
      <Text style={styles.title}>Shop</Text>
      <Text style={styles.subtitle}>
        Spendi i tuoi crediti per ottenere nuovi pacchetti e carte esclusive.
      </Text>

      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Crediti disponibili</Text>
        <Text style={styles.balanceValue}>{availableCredits}</Text>
      </View>

      <FlatList
        data={sortedItems}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

export default ShopScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    backgroundColor: '#0e0c0f',
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#00a028ff',
    marginTop: 12,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: '#e2e8f0',
    marginBottom: 24,
  },
  balanceCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderColor: '#00a028ff',
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
    marginBottom: 20,
  },
  balanceLabel: {
    fontSize: 14,
    color: '#cbd5f5',
    marginBottom: 4,
  },
  balanceValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#f8fafc',
  },
  listContent: {
    paddingBottom: 40,
  },
  card: {
    backgroundColor: 'rgba(15, 15, 19, 0.85)',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 160, 40, 0.35)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f8fafc',
  },
  cardPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#38bdf8',
  },
  cardDescription: {
    fontSize: 14,
    color: '#cbd5f5',
    marginBottom: 18,
  },
  purchaseButton: {
    backgroundColor: '#00a028ff',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  purchaseButtonDisabled: {
    backgroundColor: 'rgba(0, 160, 40, 0.35)',
  },
  purchaseLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0e0c0f',
  },
});
