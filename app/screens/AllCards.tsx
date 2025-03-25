import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, View, Modal, TouchableOpacity, Text, ImageBackground } from 'react-native';
import Card from '../../components/ui/Card'; // Componente Card personalizzato

// Definizione dell'interfaccia per il tipo di carta 
interface CardType {
  id: number;
  type: 'player' | 'coach' | 'bonusMalus';
  name: string;
  team?: string;
  attack?: number;
  defense?: number;
  abilities?: string;
  effect?: string;
  duration?: number;
  attackBonus?: number;
  defenseBonus?: number;
  image_url?: string;
  rarityColor: 'common' | 'rare' | 'epic' | 'legendary';
}

export default function AllCardsScreen() {
  const [cards, setCards] = useState<CardType[]>([]);
  const [selectedCard, setSelectedCard] = useState<CardType | null>(null); // Stato per la carta selezionata

  const fetchCards = async () => {
    try {
      const response = await fetch('https://032f-2a01-e11-9002-1af0-b516-a56b-30e4-819f.ngrok-free.app/api/cards/all/');
      console.log('Carte:', response);
      const data = await response.json();
      console.log('Dati dal backend:', JSON.stringify(data, null, 2));

      // Ordino le carte player per team
      const sortedPlayerCards = data.player_cards
        .map((card: any) => ({
          ...card,
          type: 'player',
          rarityColor: card.rarity, // Mappa direttamente la proprietà "rarity"
        }))
        .sort((a: any, b: any) => a.team.localeCompare(b.team));

      const allCards = [
        ...sortedPlayerCards,
        ...data.coach_cards.map((card: any) => ({
          ...card,
          type: 'coach',
          attackBonus: card.attack_bonus || 0,
          defenseBonus: card.defense_bonus || 0,
          rarityColor: card.rarity,
        })),
        ...data.bonus_malus_cards.map((card: any) => ({
          ...card,
          type: 'bonusMalus',
          rarityColor: card.rarity,
        })),
      ];

      console.log('Carte elaborate:', allCards);
      setCards(allCards);
    } catch (error) {
      console.error('Errore nel recupero delle carte:', error);
    }
  };


  useEffect(() => {
    fetchCards();
  }, []);

  const renderCard = ({ item }: { item: CardType }) => (
    <TouchableOpacity onPress={() => setSelectedCard(item)}>
      <Card
        size="small"
        type={item.type}
        name={item.name}
        team={item.team}
        attack={item.attack}
        defense={item.defense}
        abilities={item.abilities}
        effect={item.effect}
        duration={item.duration}
        attackBonus={item.attackBonus}
        defenseBonus={item.defenseBonus}
        image={{ uri: item.image_url }}
        rarity={item.rarityColor} // Passa direttamente il valore di "rarityColor"
      />
    </TouchableOpacity>
  );


  return (
    <View
      style={styles.container}>
      <FlatList
        data={cards}
        keyExtractor={(item, index) => `${item.type}-${item.id}-${index}`}
        renderItem={renderCard}
        numColumns={5}
        contentContainerStyle={styles.grid}
      />

      {selectedCard && (
        <Modal transparent={true} animationType="fade" visible={!!selectedCard}>
          <View style={styles.modalContainer}>
            <Card
              size="large"
              type={selectedCard.type}
              name={selectedCard.name}
              team={selectedCard.team}
              attack={selectedCard.attack}
              defense={selectedCard.defense}
              abilities={selectedCard.abilities}
              effect={selectedCard.effect}
              duration={selectedCard.duration}
              attackBonus={selectedCard.attackBonus}
              defenseBonus={selectedCard.defenseBonus}
              image={{ uri: selectedCard.image_url }}
              rarity={selectedCard.rarityColor} // Passa il colore della rarità come prop "rarity"
            />
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setSelectedCard(null)}
            >
              <Text style={styles.closeButtonText}>Chiudi</Text>
            </TouchableOpacity>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  grid: {
    padding: 10,
    alignItems: 'center',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  closeButton: {
    marginTop: 20,
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 5,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
