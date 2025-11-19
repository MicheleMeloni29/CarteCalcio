import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';

import Card from '../../../components/ui/Card';
import { TradeableCopy } from './types';

type Props = {
  tradeableCopies: TradeableCopy[];
  selectedCopyKey: string | null;
  onSelectCopy: (copyKey: string) => void;
};

const ProposeExchangeSection: React.FC<Props> = ({
  tradeableCopies,
  selectedCopyKey,
  onSelectCopy,
}) => {
  const renderTradeableCard = (copy: TradeableCopy) => {
    const { card, key, totalAvailable } = copy;
    const isSelected = selectedCopyKey === key;

    return (
      <TouchableOpacity
        key={key}
        onPress={() => onSelectCopy(key)}
        activeOpacity={0.85}
        style={styles.cardButton}
      >
        <Card
          size="small"
          type={card.type}
          name={card.name}
          team={card.team}
          attack={card.attack}
          defense={card.defense}
          save={card.save}
          attackBonus={card.attackBonus}
          defenseBonus={card.defenseBonus}
          effect={card.effect}
          duration={card.duration}
          image={card.imageUrl ? { uri: card.imageUrl } : undefined}
          rarity={card.rarity}
          season={card.season}
        />
        {isSelected && (
          <View style={styles.cardOverlayCheck}>
            <Feather name="check-circle" size={18} color="#00a028ff" />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.section}>
      {tradeableCopies.length === 0 ? (
        <Text style={styles.emptyText}>You do not have duplicate cards available for trading.</Text>
      ) : (
        <View style={styles.cardGrid}>{tradeableCopies.map(renderTradeableCard)}</View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    paddingVertical: 8,
  },
  emptyText: {
    color: '#8f8f8f',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'flex-start',
  },
  cardButton: {
    width: '30%',
    alignItems: 'center',
    position: 'relative',
    marginBottom: 8,
  },
  cardOverlayCheck: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#0f2b1a',
    borderRadius: 16,
    padding: 2,
  },
});

export default ProposeExchangeSection;
