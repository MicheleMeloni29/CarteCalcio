import React, {
  useCallback,
  useMemo,
  useState,
} from 'react';
import {
  Alert,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

import { useCredits } from '../../hooks/CreditProvider';
import TopStatusBar from '../../components/ui/TopStatusBar';
import type {
  MainStackParamList,
} from '../navigators/MainStackNavigator';



type ShopItem = {
  id: string;
  name: string;
  description: string;
  price: number;
};

const SHOP_ITEMS: ShopItem[] = [
  {
    id: 'basic-pack',
    name: 'Basic Pack',
    description: 'Good for starting your collection',
    price: 20,
  },
  {
    id: 'standard-pacj',
    name: 'Standard Pack',
    description: 'Higher chance of Rare',
    price: 50,
  },
  {
    id: 'premium-pack',
    name: 'Premium Pack',
    description: 'Good chances for Epic and Rare',
    price: 150,
  },
  {
  id: 'elite-pack',
  name: 'Elite Pack',
    description: 'Excellent chances of Epic, maybe Legendary',
  price: 400,
  },
  {
    id: 'mythic-pack',
    name: 'Mythic Pack',
    description: 'High chance of Legendary',
    price: 1200,
  },
];

const coinSource = require('../../assets/images/Coin.png');

const ShopScreen: React.FC = () => {
  const { credits, adjustCredits } = useCredits();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const navigation = useNavigation<
      StackNavigationProp<MainStackParamList, 'Earn'>
    >();

  const availableCredits = credits ?? 0;

  const sortedItems = useMemo(
    () => [...SHOP_ITEMS].sort((a, b) => a.price - b.price),
    [],
  );

  const handleExit = useCallback(() => {
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate('Home');
      }
    }, [navigation]);
  
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
          <View style={styles.cardPrice}>
            <Image source={coinSource} style={styles.cardPriceIcon} resizeMode="contain" />
            <Text style={styles.cardPriceValue}>{item.price}</Text>
          </View>
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
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleExit}
          activeOpacity={0.85}
        >
          <Ionicons
            name="arrow-back"
            size={22}
            color="#00a028ff"
          />
        </TouchableOpacity>
        <View style={styles.balanceCard}>
          <Text style={styles.subtitle}>
            Complete quiz to earn more credits
          </Text>
        </View>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 12,
    marginTop: 12,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: '#e2e8f0',
    textAlign: 'left',
  },
  balanceCard: {
    backgroundColor: 'rgba(15, 42, 24, 0.66)',
    borderColor: '#00a028ff',
    borderWidth: 2,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
    marginBottom: 20,
    flex: 1,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 15, 19, 0.65)',
    borderColor: 'rgba(0, 160, 40, 1)',
    borderWidth: 2,
    borderRadius: 14,
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
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
    borderWidth: 2,
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
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(14, 12, 15, 0.45)',
    borderWidth: 1,
    borderColor: 'rgba(222, 189, 67, 0.45)',
  },
  cardPriceIcon: {
    width: 18,
    height: 18,
    marginRight: 6,
  },
  cardPriceValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#debd43ff',
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
