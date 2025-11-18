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
import DiscoverCard from '../../components/ui/DiscoverCard';
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
  owned: boolean;
  season?: string;
}

const GRID_COLUMNS = 5;

type TeamCardBuckets = {
  players: CardType[];
  goalkeepers: CardType[];
  coaches: CardType[];
};

const rarityPriority: Record<CardType['rarityColor'], number> = {
  common: 0,
  rare: 1,
  epic: 2,
  legendary: 3,
};

const getRarityRank = (rarity?: CardType['rarityColor']): number =>
  rarity ? rarityPriority[rarity] ?? rarityPriority.common : rarityPriority.common;

const sortCardsByRarity = (cards: CardType[]): CardType[] =>
  [...cards].sort((a, b) => {
    const rarityDiff = getRarityRank(a.rarityColor) - getRarityRank(b.rarityColor);
    if (rarityDiff !== 0) {
      return rarityDiff;
    }
    return (a.name ?? '').localeCompare(b.name ?? '');
  });

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
    const sortedPlayers = sortCardsByRarity(bucket.players);
    const sortedGoalkeepers = sortCardsByRarity(bucket.goalkeepers);
    const sortedCoaches = sortCardsByRarity(bucket.coaches);
    return [...sortedPlayers, ...sortedGoalkeepers, ...sortedCoaches];
  });

  return { orderedByTeam, unassigned: sortCardsByRarity(unassigned) };
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
    return Math.max(0, Math.floor(parsed));
  }
  return 0;
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
      const [catalogResponse, collectionResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/api/cards/all/`),
        callWithAuth(token =>
          fetch(`${API_BASE_URL}/api/packs/collection/`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
        ),
      ]);

      if (!catalogResponse.ok) {
        throw new Error(`Failed to fetch catalog (${catalogResponse.status})`);
      }

      if (!collectionResponse.ok) {
        throw new Error(`Failed to fetch collection (${collectionResponse.status})`);
      }

      const catalogData = await catalogResponse.json();
      const collectionData = await collectionResponse.json();

      const mapKey = (type: CardType['type'], id: number | string) => `${type}:${id}`;
      const ownedCardsMap = new Map<string, CardType>();

      const playerCards: CardType[] = (Array.isArray(collectionData?.player_cards)
        ? collectionData.player_cards
        : []
      ).map((raw: any, index: number) => {
        const quantity = parseQuantity(raw?.quantity);
        const parsed: CardType = {
          id: coerceId(raw?.id, index + 1),
          type: 'player',
          name: typeof raw?.name === 'string' ? raw.name : 'Carta',
          team: typeof raw?.team === 'string' ? raw.team : undefined,
          attack: parseOptionalNumber(raw?.attack),
          defense: parseOptionalNumber(raw?.defense),
          abilities: typeof raw?.abilities === 'string' ? raw.abilities : undefined,
          effect: undefined,
          duration: undefined,
          attackBonus: undefined,
          defenseBonus: undefined,
          save: undefined,
          image_url: typeof raw?.image_url === 'string' ? raw.image_url : undefined,
          rarityColor: normalizeRarity(raw?.rarity),
          quantity,
          owned: quantity > 0,
          season: typeof raw?.season === 'string' ? raw.season : '24/25.1',
        };
        ownedCardsMap.set(mapKey(parsed.type, parsed.id), parsed);
        return parsed;
      });

      const goalkeeperCards: CardType[] = (Array.isArray(collectionData?.goalkeeper_cards)
        ? collectionData.goalkeeper_cards
        : []
      ).map((raw: any, index: number) => {
        const quantity = parseQuantity(raw?.quantity);
        const parsed: CardType = {
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
          image_url: typeof raw?.image_url === 'string' ? raw.image_url : undefined,
          rarityColor: normalizeRarity(raw?.rarity),
          quantity,
          owned: quantity > 0,
          season: typeof raw?.season === 'string' ? raw.season : '24/25.1',
        };
        ownedCardsMap.set(mapKey(parsed.type, parsed.id), parsed);
        return parsed;
      });

      const coachCards: CardType[] = (Array.isArray(collectionData?.coach_cards)
        ? collectionData.coach_cards
        : []
      ).map((raw: any, index: number) => {
        const quantity = parseQuantity(raw?.quantity);
        const parsed: CardType = {
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
          image_url: typeof raw?.image_url === 'string' ? raw.image_url : undefined,
          rarityColor: normalizeRarity(raw?.rarity),
          quantity,
          owned: quantity > 0,
          season: typeof raw?.season === 'string' ? raw.season : '24/25.1',
        };
        ownedCardsMap.set(mapKey(parsed.type, parsed.id), parsed);
        return parsed;
      });

      const bonusCards: CardType[] = (Array.isArray(collectionData?.bonus_malus_cards)
        ? collectionData.bonus_malus_cards
        : []
      ).map((raw: any, index: number) => {
        const quantity = parseQuantity(raw?.quantity);
        const parsed: CardType = {
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
          image_url: typeof raw?.image_url === 'string' ? raw.image_url : undefined,
          rarityColor: normalizeRarity(raw?.rarity),
          quantity,
          owned: quantity > 0,
          season: typeof raw?.season === 'string' ? raw.season : '24/25.1',
        };
        ownedCardsMap.set(mapKey(parsed.type, parsed.id), parsed);
        return parsed;
      });

      type CatalogBuilder = {
        catalogList: any[];
        type: CardType['type'];
        fallbackName: string;
        baseId: number;
        statMapper?: (raw: any) => Partial<CardType>;
      };

      const mergeCatalogWithOwned = ({
        catalogList,
        type,
        fallbackName,
        baseId,
        statMapper,
      }: CatalogBuilder): CardType[] => {
        const normalized: CardType[] = [];
        const includedKeys = new Set<string>();
        const list = Array.isArray(catalogList) ? catalogList : [];

        list.forEach((raw, index) => {
          const id = coerceId(raw?.id, baseId + index);
          const key = mapKey(type, id);
          includedKeys.add(key);
          const ownedCard = ownedCardsMap.get(key);
          if (ownedCard) {
            normalized.push(ownedCard);
            return;
          }
          normalized.push({
            id,
            type,
            name: typeof raw?.name === 'string' ? raw.name : fallbackName,
            team: typeof raw?.team === 'string' ? raw.team : undefined,
            attack: undefined,
            defense: undefined,
            save: undefined,
            abilities: typeof raw?.abilities === 'string' ? raw.abilities : undefined,
            effect: undefined,
            duration: undefined,
            attackBonus: undefined,
            defenseBonus: undefined,
            image_url: typeof raw?.image_url === 'string' ? raw.image_url : undefined,
            rarityColor: normalizeRarity(raw?.rarity),
            quantity: 0,
            owned: false,
            season: typeof raw?.season === 'string' ? raw.season : '24/25.1',
            ...(typeof statMapper === 'function' ? statMapper(raw) : {}),
          });
        });

        const ownedSource =
          type === 'player'
            ? playerCards
            : type === 'goalkeeper'
              ? goalkeeperCards
              : type === 'coach'
                ? coachCards
                : bonusCards;

        ownedSource.forEach(card => {
          const key = mapKey(card.type, card.id);
          if (!includedKeys.has(key)) {
            normalized.push(card);
            includedKeys.add(key);
          }
        });

        return normalized;
      };

      const completePlayerCards = mergeCatalogWithOwned({
        catalogList: catalogData?.player_cards,
        type: 'player',
        fallbackName: 'Carta',
        baseId: 1,
        statMapper: raw => ({
          attack: parseOptionalNumber(raw?.attack),
          defense: parseOptionalNumber(raw?.defense),
        }),
      });

      const completeGoalkeeperCards = mergeCatalogWithOwned({
        catalogList: catalogData?.goalkeeper_cards,
        type: 'goalkeeper',
        fallbackName: 'Portiere',
        baseId: 500,
        statMapper: raw => ({
          save: parseOptionalNumber(raw?.save ?? raw?.saves),
        }),
      });

      const completeCoachCards = mergeCatalogWithOwned({
        catalogList: catalogData?.coach_cards,
        type: 'coach',
        fallbackName: 'Allenatore',
        baseId: 1000,
        statMapper: raw => ({
          attackBonus: parseOptionalNumber(raw?.attack_bonus),
          defenseBonus: parseOptionalNumber(raw?.defense_bonus),
        }),
      });

      const completeBonusCards = mergeCatalogWithOwned({
        catalogList: catalogData?.bonus_malus_cards,
        type: 'bonusMalus',
        fallbackName: 'Bonus/Malus',
        baseId: 2000,
        statMapper: raw => ({
          effect: typeof raw?.effect === 'string' ? raw.effect : undefined,
          duration: parseOptionalNumber(raw?.duration),
        }),
      });

      const { orderedByTeam, unassigned } = buildTeamOrderedCards(
        completePlayerCards,
        completeGoalkeeperCards,
        completeCoachCards,
      );

      setCards([...orderedByTeam, ...unassigned, ...completeBonusCards]);
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

    return (
      <View style={styles.cardRow}>
        {cardsInRow.map(card => {
          const key = `${item.key}-card-${card.id}`;
          if (!card.owned) {
            return (
              <View
                key={key}
                style={[styles.cardItem, styles.discoverCardContainer]}
                pointerEvents="none"
              >
                <View style={styles.cardWrapper}>
                  <DiscoverCard />
                </View>
              </View>
            );
          }
          const imageSource = card.image_url ? { uri: card.image_url } : DEFAULT_CARD_IMAGE;
          return (
            <TouchableOpacity
              key={key}
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
      </View>
    );
  };


  return (
    <ImageBackground
      source={require('../../assets/images/Backgrounds/CollectionBackground.jpg')}
      style={styles.background}
      imageStyle={styles.backgroundImage}
    >
      <View style={styles.screen}>
        <TopStatusBar />
        <View style={styles.container}>
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
                  <View style={styles.modalCardFrame}>
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
                  <TouchableOpacity
                    onPress={() => setSelectedCard(null)}
                    style={styles.modalCloseButton}
                    accessibilityRole="button"
                    accessibilityLabel="Torna alla collezione"
                  >
                    <Text style={styles.modalCloseButtonText}>Back</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>
          )}
        </View>
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
  screen: {
    flex: 1,
    backgroundColor: 'rgba(14, 12, 15, 0.25)',
  },
  container: {
    flex: 1,
    paddingBottom: 90,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  grid: {
    paddingHorizontal: 12,
    paddingVertical: 22,
    alignItems: 'stretch',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    marginBottom: 18,
  },
  cardItem: {
    alignItems: 'center',
    marginHorizontal: 2,
    marginVertical: 2,
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
  modalCardFrame: {
    position: 'relative',
    alignItems: 'center',
  },
  modalCloseButton: {
    paddingVertical: 12,
    paddingHorizontal: 48,
    borderRadius: 28,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    borderWidth: 1,
    borderColor: '#00a028ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseButtonText: {
    color: '#00a028ff',
    fontSize: 22,
    fontWeight: '500',
    letterSpacing: 1,
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
  discoverCardContainer: {
    opacity: 0.85,
    marginHorizontal: 6,
  },
});
