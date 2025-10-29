import React, { useMemo } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';

import Card from '../../components/ui/Card';
import type {
  MainStackParamList,
  OpenedPackCard,
} from '../navigators/MainStackNavigator';

const CARD_TYPE_LABELS: Record<string, string> = {
  player: 'Carta giocatore',
  coach: 'Carta allenatore',
  bonus: 'Carta bonus/malus',
};

type PackOpenRouteProp = RouteProp<MainStackParamList, 'PackOpen'>;

const CARD_PLACEHOLDER = require('../../assets/images/AllCardsBackground.jpg');
const CARD_CAROUSEL_ITEM_WIDTH = 370;

const PackOpenScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<MainStackParamList>>();
  const route = useRoute<PackOpenRouteProp>();
  const { packName, cards } = route.params;

  const cardData = useMemo(
    () => (Array.isArray(cards) ? cards : []) as OpenedPackCard[],
    [cards],
  );

  const handleBackToShop = () => {
    navigation.navigate('Shop');
  };

  const handleGoToCollection = () => {
    navigation.navigate('Collection');
  };

  const renderCard = ({ item }: { item: OpenedPackCard }) => {
    const cardType =
      item.type === 'bonus'
        ? 'bonusMalus'
        : item.type === 'coach'
          ? 'coach'
          : 'player';
    const imageSource =
      typeof item.image_url === 'string' && item.image_url.length > 0
        ? { uri: item.image_url }
        : CARD_PLACEHOLDER;

    return (
      <View style={styles.carouselItem}>
        <Card
          size="large"
          type={cardType as 'player' | 'coach' | 'bonusMalus'}
          name={item.name}
          team={item.team ?? undefined}
          attack={item.attack ?? undefined}
          defense={item.defense ?? undefined}
          abilities={item.abilities ?? undefined}
          effect={item.effect ?? undefined}
          duration={item.duration ?? undefined}
          attackBonus={item.attack_bonus ?? undefined}
          defenseBonus={item.defense_bonus ?? undefined}
          image={imageSource}
          rarity={item.rarity ? (item.rarity as 'common' | 'rare' | 'epic' | 'legendary') : 'common'}
        />
        <Text style={styles.carouselMeta}>
          {CARD_TYPE_LABELS[item.type] ?? item.type}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Hai aperto {packName}</Text>
      <Text style={styles.subHeading}>Ecco le carte che hai trovato</Text>
      <FlatList
        data={cardData}
        keyExtractor={(item, index) => `${item.id ?? 'card'}-${index}`}
        renderItem={renderCard}
        horizontal
        pagingEnabled
        snapToAlignment="center"
        snapToInterval={CARD_CAROUSEL_ITEM_WIDTH}
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        style={styles.carousel}
        contentContainerStyle={styles.carouselContent}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Nessuna carta trovata</Text>
        }
      />
      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.primaryButton} activeOpacity={0.85} onPress={handleGoToCollection}>
          <Text style={styles.primaryButtonLabel}>Vai alla collezione</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} activeOpacity={0.85} onPress={handleBackToShop}>
          <Text style={styles.secondaryButtonLabel}>Apri un altro pack</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default PackOpenScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 32,
    paddingHorizontal: 20,
    backgroundColor: '#0e0c0f',
  },
  heading: {
    fontSize: 24,
    fontWeight: '700',
    color: '#00a028ff',
    textAlign: 'center',
    marginTop: 30,
    marginBottom: 8,
  },
  subHeading: {
    fontSize: 16,
    color: '#cbd5f5',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 24,
  },
  carousel: {
    flexGrow: 0,
  },
  carouselContent: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    alignItems: 'center',
  },
  carouselItem: {
    width: CARD_CAROUSEL_ITEM_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 20,
  },
  carouselMeta: {
    marginTop: 12,
    fontSize: 15,
    fontWeight: '600',
    color: '#cbd5f5',
    textTransform: 'uppercase',
  },
  emptyText: {
    fontSize: 15,
    color: '#cbd5f5',
    textAlign: 'center',
    paddingVertical: 40,
  },
  actionsRow: {
    marginTop: 24,
    marginBottom: 34,
    gap: 10,
  },
  primaryButton: {
    backgroundColor: '#00a028ff',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0e0c0f',
  },
  secondaryButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#00a028ff',
  },
  secondaryButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#00a028ff',
  },
});
