import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  View,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Text,
  ImageBackground,
} from 'react-native';

import { API_BASE_URL } from '../../constants/api';
import Card from '../../components/ui/Card'; // Componente Card personalizzato
import TopStatusBar from '../../components/ui/TopStatusBar';
import { useAuth } from '../../hooks/AuthProvider';

const DEFAULT_CARD_IMAGE = require('../../assets/images/Backgrounds/CollectionBackground.jpg');

// Definizione dell'interfaccia per il tipo di carta 
interface CardType {
  id: number;
  type: 'player' | 'goalkeeper' | 'coach' | 'bonusMalus';
  name: string;
  team?: string;
  attack?: number;
  defense?: number;
  save?: number;
  abilities?: string;
  effect?: string;
  duration?: number;
  attackBonus?: number;
  defenseBonus?: number;
  image_url?: string;
  rarityColor: 'common' | 'rare' | 'epic' | 'legendary';
  quantity: number;
  season?: string;
}

const GRID_COLUMNS = 5;

type TeamCardBuckets = {
  players: CardType[];
  goalkeepers: CardType[];
  coaches: CardType[];
};

const buildTeamOrderedCards = (
  playerCards: CardType[],
  goalkeeperCards: CardType[],
  coachCards: CardType[],
): { orderedByTeam: CardType[]; unassigned: CardType[] } => {
  const teamBuckets = new Map<string, TeamCardBuckets>();
  const unassigned: CardType[] = [];

  const assignCard = (card: CardType) => {
    if (!card.team) {
      unassigned.push(card);
      return;
    }

    const bucket =
      teamBuckets.get(card.team) ?? {
        players: [],
        goalkeepers: [],
        coaches: [],
      };

    if (card.type === 'player') {
      bucket.players.push(card);
    } else if (card.type === 'goalkeeper') {
      bucket.goalkeepers.push(card);
    } else if (card.type === 'coach') {
      bucket.coaches.push(card);
    } else {
      unassigned.push(card);
      return;
    }

    teamBuckets.set(card.team, bucket);
  };

  [...playerCards, ...goalkeeperCards, ...coachCards].forEach(assignCard);

  const orderedTeams = Array.from(teamBuckets.keys()).sort((a, b) =>
    a.localeCompare(b),
  );

  const orderedByTeam = orderedTeams.flatMap(team => {
    const bucket = teamBuckets.get(team);
    if (!bucket) {
      return [];
    }
    return [...bucket.players, ...bucket.goalkeepers, ...bucket.coaches];
  });

  return { orderedByTeam, unassigned };
};

type CollectionListItem =
  | { key: string; type: 'header'; team: string; isFirst: boolean }
  | { key: string; type: 'row'; cards: CardType[] };

const buildCollectionListItems = (
  cards: CardType[],
  columns: number,
): CollectionListItem[] => {
  const normalizedColumns = Math.max(1, columns);
  const items: CollectionListItem[] = [];
  let currentTeam: string | null = null;
  let rowBuffer: CardType[] = [];
  let rowIndex = 0;
  let headerIndex = 0;

  const flushRow = () => {
    if (rowBuffer.length === 0) {
      return;
    }
    items.push({
      key: `row-${rowIndex}`,
      type: 'row',
      cards: rowBuffer,
    });
    rowBuffer = [];
    rowIndex += 1;
  };

  cards.forEach(card => {
    const teamName =
      typeof card.team === 'string' && card.team.trim().length > 0
        ? card.team.trim()
        : null;

    if (teamName) {
      if (teamName !== currentTeam) {
        flushRow();
        currentTeam = teamName;
        items.push({
          key: `header-${headerIndex}-${teamName}`,
          type: 'header',
          team: teamName,
          isFirst: headerIndex === 0,
        });
        headerIndex += 1;
      }
    } else if (currentTeam) {
      flushRow();
      currentTeam = null;
    }

    rowBuffer.push(card);
    if (rowBuffer.length === normalizedColumns) {
      flushRow();
    }
  });

  flushRow();

  return items;
};

const normalizeRarity = (value: unknown): CardType['rarityColor'] => {
  if (typeof value !== 'string') {
    return 'common';
  }
  const lowered = value.toLowerCase();
  if (lowered === 'rare' || lowered === 'epic' || lowered === 'legendary') {
    return lowered as CardType['rarityColor'];
  }
  return 'common';
};

const parseOptionalNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return undefined;
};

const parseQuantity = (value: unknown): number => {
  const parsed = parseOptionalNumber(value);
  if (typeof parsed === 'number' && Number.isFinite(parsed)) {
    return Math.max(1, Math.floor(parsed));
  }
  return 1;
};

const coerceId = (value: unknown, fallback: number): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
};

export default function CollectionScreen() {
  const { accessToken, refreshAccessToken } = useAuth();
  const [cards, setCards] = useState<CardType[]>([]);
  const [selectedCard, setSelectedCard] = useState<CardType | null>(null); // Stato per la carta selezionata

  const callWithAuth = useCallback(
    async (request: (token: string) => Promise<Response>) => {
      const attempt = async (
        token: string | null,
        allowRefresh: boolean,
      ): Promise<Response> => {
        if (!token) {
          if (!allowRefresh) {
            throw new Error('Missing access token');
          }
          const refreshed = await refreshAccessToken();
          if (!refreshed) {
            throw new Error('Missing access token');
          }
          return attempt(refreshed, false);
        }

        const response = await request(token);
        if (response.status === 401 && allowRefresh) {
          const refreshed = await refreshAccessToken();
          if (!refreshed) {
            throw new Error('Missing access token');
          }
          return attempt(refreshed, false);
        }

        return response;
      };

      return attempt(accessToken, true);
    },
    [accessToken, refreshAccessToken],
  );

  const fetchCards = useCallback(async () => {
    try {
      const response = await callWithAuth(token =>
        fetch(`${API_BASE_URL}/api/packs/collection/`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch collection (${response.status})`);
      }

      const data = await response.json();

      const playerCards: CardType[] = (Array.isArray(data?.player_cards)
        ? data.player_cards
        : []
      ).map((raw: any, index: number) => ({
        id: coerceId(raw?.id, index + 1),
        type: 'player',
        name: typeof raw?.name === 'string' ? raw.name : 'Carta',
        team: typeof raw?.team === 'string' ? raw.team : undefined,
        attack: parseOptionalNumber(raw?.attack),
        defense: parseOptionalNumber(raw?.defense),
        abilities:
          typeof raw?.abilities === 'string' ? raw.abilities : undefined,
        effect: undefined,
        duration: undefined,
        attackBonus: undefined,
        defenseBonus: undefined,
        image_url:
          typeof raw?.image_url === 'string' ? raw.image_url : undefined,
        rarityColor: normalizeRarity(raw?.rarity),
        quantity: parseQuantity(raw?.quantity),
        season: typeof raw?.season === 'string' ? raw.season : '24/25.1',
      }));

      const goalkeeperCards: CardType[] = (Array.isArray(data?.goalkeeper_cards)
        ? data.goalkeeper_cards
        : []
      ).map((raw: any, index: number) => ({
        id: coerceId(raw?.id, index + 500),
        type: 'goalkeeper',
        name: typeof raw?.name === 'string' ? raw.name : 'Portiere',
        team: typeof raw?.team === 'string' ? raw.team : undefined,
        attack: undefined,
        defense: undefined,
        save: parseOptionalNumber(raw?.save),
        abilities: typeof raw?.abilities === 'string' ? raw.abilities : undefined,
        effect: undefined,
        duration: undefined,
        attackBonus: undefined,
        defenseBonus: undefined,
        image_url:
          typeof raw?.image_url === 'string' ? raw.image_url : undefined,
        rarityColor: normalizeRarity(raw?.rarity),
        quantity: parseQuantity(raw?.quantity),
        season: typeof raw?.season === 'string' ? raw.season : '24/25.1',
      }));

      const coachCards: CardType[] = (Array.isArray(data?.coach_cards)
        ? data.coach_cards
        : []
      ).map((raw: any, index: number) => ({
        id: coerceId(raw?.id, index + 1000),
        type: 'coach',
        name: typeof raw?.name === 'string' ? raw.name : 'Allenatore',
        team: typeof raw?.team === 'string' ? raw.team : undefined,
        attack: undefined,
        defense: undefined,
        abilities: undefined,
        effect: undefined,
        duration: undefined,
        attackBonus: parseOptionalNumber(raw?.attack_bonus),
        defenseBonus: parseOptionalNumber(raw?.defense_bonus),
        image_url:
          typeof raw?.image_url === 'string' ? raw.image_url : undefined,
        rarityColor: normalizeRarity(raw?.rarity),
        quantity: parseQuantity(raw?.quantity),
        season: typeof raw?.season === 'string' ? raw.season : '24/25.1',
      }));

      const bonusCards: CardType[] = (Array.isArray(data?.bonus_malus_cards)
        ? data.bonus_malus_cards
        : []
      ).map((raw: any, index: number) => ({
        id: coerceId(raw?.id, index + 2000),
        type: 'bonusMalus',
        name: typeof raw?.name === 'string' ? raw.name : 'Bonus/Malus',
        team: undefined,
        attack: undefined,
        defense: undefined,
        abilities: undefined,
        effect: typeof raw?.effect === 'string' ? raw.effect : undefined,
        duration: parseOptionalNumber(raw?.duration),
        attackBonus: undefined,
        defenseBonus: undefined,
        image_url:
          typeof raw?.image_url === 'string' ? raw.image_url : undefined,
        rarityColor: normalizeRarity(raw?.rarity),
        quantity: parseQuantity(raw?.quantity),
        season: typeof raw?.season === 'string' ? raw.season : '24/25.1',
      }));

      const { orderedByTeam, unassigned } = buildTeamOrderedCards(
        playerCards,
        goalkeeperCards,
        coachCards,
      );

      // Keep each coach next to their team while preserving the bonus cards tail.
      setCards([...orderedByTeam, ...unassigned, ...bonusCards]);
    } catch (error) {
      console.error('Errore nel recupero della collezione:', error);
      setCards([]);
    }
  }, [callWithAuth]);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  const displayItems = useMemo(
    () => buildCollectionListItems(cards, GRID_COLUMNS),
    [cards],
  );

  const renderItem = ({ item }: { item: CollectionListItem }) => {
    if (item.type === 'header') {
      return (
        <View
          style={[
            styles.teamHeaderRow,
            !item.isFirst && styles.teamHeaderRowSpacing,
          ]}
        >
          <Text style={styles.teamHeaderText}>{item.team}</Text>
        </View>
      );
    }

    const cardsInRow = item.cards;
    const emptySlots = Math.max(0, GRID_COLUMNS - cardsInRow.length);

    return (
      <View style={styles.cardRow}>
        {cardsInRow.map(card => {
          const imageSource = card.image_url ? { uri: card.image_url } : DEFAULT_CARD_IMAGE;
          return (
            <TouchableOpacity
              key={`${item.key}-card-${card.id}`}
              onPress={() => setSelectedCard(card)}
              style={styles.cardItem}
            >
              <View style={styles.cardWrapper}>
                <Card
                  size="small"
                  type={card.type}
                  name={card.name}
                  team={card.team}
                  attack={card.attack}
                  defense={card.defense}
                  save={card.save}
                  abilities={card.abilities}
                  effect={card.effect}
                  duration={card.duration}
                  attackBonus={card.attackBonus}
                  defenseBonus={card.defenseBonus}
                  image={imageSource}
                  rarity={card.rarityColor}
                  season={card.season}
                  collectionNumber={card.id}
                />
                <View style={styles.quantityBadge}>
                  <Text style={styles.quantityBadgeText}>{`x${card.quantity}`}</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
        {emptySlots > 0 &&
          Array.from({ length: emptySlots }).map((_, index) => (
            <View
              key={`${item.key}-placeholder-${index}`}
              style={styles.cardPlaceholder}
              pointerEvents="none"
            />
          ))}
      </View>
    );
  };


  return (
    <ImageBackground
      source={require('../../assets/images/Backgrounds/CollectionBackground.jpg')}
      style={styles.background}
      imageStyle={styles.backgroundImage}
    >
      <View style={styles.container}>
        <TopStatusBar />
        <FlatList
          data={displayItems}
          keyExtractor={item => item.key}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.grid,
            cards.length === 0 && styles.gridEmpty,
          ]}
          ListEmptyComponent={
            <Text style={styles.emptyMessage}>
              No cards found
            </Text>
          }
        />

        {selectedCard && (
          <Modal
            transparent
            animationType="fade"
            visible
            onRequestClose={() => setSelectedCard(null)}
          >
            <View style={styles.modalContainer}>
              <TouchableWithoutFeedback onPress={() => setSelectedCard(null)}>
                <View style={styles.modalBackdrop} />
              </TouchableWithoutFeedback>
              <View style={styles.modalCardWrapper}>
                <Card
                  size="large"
                  type={selectedCard.type}
                  name={selectedCard.name}
                  team={selectedCard.team}
                  attack={selectedCard.attack}
                  defense={selectedCard.defense}
                  save={selectedCard.save}
                  abilities={selectedCard.abilities}
                  effect={selectedCard.effect}
                  duration={selectedCard.duration}
                  attackBonus={selectedCard.attackBonus}
                  defenseBonus={selectedCard.defenseBonus}
                  image={
                    selectedCard.image_url
                      ? { uri: selectedCard.image_url }
                      : require('../../assets/images/Backgrounds/CollectionBackground.jpg')
                  }
                  rarity={selectedCard.rarityColor}
                  season={selectedCard.season}
                  collectionNumber={selectedCard.id}
                />
                <View style={styles.modalQuantityBadge}>
                  <Text style={styles.modalQuantityBadgeText}>{`x${selectedCard.quantity}`}</Text>
                </View>
              </View>
            </View>
          </Modal>
        )}
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  backgroundImage: {
  },
  container: {
    flex: 1,
    backgroundColor: 'rgba(14, 12, 15, 0.25)',
    paddingBottom: 90,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  grid: {
    paddingHorizontal: 22,
    paddingVertical: 22,
    alignItems: 'stretch',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  cardItem: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 6,
  },
  cardWrapper: {
    position: 'relative',
  },
  teamHeaderText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffffff',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  quantityBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(15, 15, 19, 0.85)',
    borderRadius: 16,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#00a028ff',
  },
  quantityBadgeText: {
    color: '#f9fafb',
    fontSize: 12,
    fontWeight: '700',
  },
  gridEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyMessage: {
    fontSize: 32,
    color: '#cbcbcbff',
    textAlign: 'center',
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  modalCardWrapper: {
    position: 'relative',
    alignItems: 'center',
    zIndex: 1,
  },
  modalQuantityBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#00a028ff',
  },
  modalQuantityBadgeText: {
    color: '#f9fafb',
    fontSize: 16,
    fontWeight: '700',
  },
  teamHeaderRow: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 6,
    marginBottom: 12,
  },
  teamHeaderRowSpacing: {
    marginTop: 28,
  },
  cardPlaceholder: {
    flex: 1,
    marginHorizontal: 6,
  },
});
