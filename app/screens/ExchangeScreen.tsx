import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

import TopStatusBar from '../../components/ui/TopStatusBar';
import { API_BASE_URL } from '../../constants/api';
import { useAuth } from '../../hooks/AuthProvider';
import Card from '../../components/ui/Card';

type Rarity = 'common' | 'rare' | 'epic' | 'legendary';
type CardCategory = 'player' | 'goalkeeper' | 'coach' | 'bonusMalus';
type ExchangeMode = 'porpose' | 'find';

type NormalizedCard = {
  id: number;
  type: CardCategory;
  name: string;
  rarity: Rarity;
  team?: string;
  imageUrl?: string;
  season?: string;
  quantity: number;
  owned: boolean;
  attack?: number;
  defense?: number;
  save?: number;
  attackBonus?: number;
  defenseBonus?: number;
  effect?: string;
  duration?: number;
};

type ExchangeListing = {
  id: string;
  username: string;
  offeredCard: NormalizedCard;
  wants?: string;
  requiredRarity: Rarity;
};

const rarityPriority: Record<Rarity, number> = {
  common: 0,
  rare: 1,
  epic: 2,
  legendary: 3,
};

const rarityLabels: Record<Rarity, string> = {
  common: 'Common',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
};

const rarityColors: Record<Rarity, string> = {
  common: '#9b5200',
  rare: '#d8d8d8',
  epic: '#ffd100',
  legendary: '#35ffb3',
};

const modeTabs: Array<{ key: ExchangeMode; label: string; helper: string }> = [
  { key: 'porpose', label: 'porpose escange', helper: 'Offer one of your duplicates' },
  { key: 'find', label: 'find excange', helper: 'Look for cards you still miss' },
];

const buildCardKey = (type: CardCategory, id: number) => `${type}:${id}`;

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

const normalizeRarity = (value: unknown): Rarity => {
  if (typeof value !== 'string') {
    return 'common';
  }
  const lowered = value.toLowerCase();
  if (lowered === 'rare' || lowered === 'epic' || lowered === 'legendary') {
    return lowered;
  }
  return 'common';
};

const parseQuantity = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.floor(value));
  }
  return 0;
};

const parseImageUrl = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
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

const enrichCardWithStats = (card: NormalizedCard, raw: any): NormalizedCard => {
  const enriched: NormalizedCard = { ...card };
  if (card.type === 'player') {
    enriched.attack = parseOptionalNumber(raw?.attack);
    enriched.defense = parseOptionalNumber(raw?.defense);
  } else if (card.type === 'goalkeeper') {
    enriched.save = parseOptionalNumber(raw?.save ?? raw?.saves);
  } else if (card.type === 'coach') {
    enriched.attackBonus = parseOptionalNumber(raw?.attack_bonus);
    enriched.defenseBonus = parseOptionalNumber(raw?.defense_bonus);
  } else if (card.type === 'bonusMalus') {
    enriched.effect = typeof raw?.effect === 'string' ? raw.effect : undefined;
    enriched.duration = parseOptionalNumber(raw?.duration);
  }
  return enriched;
};

const buildNormalizedCards = (catalogData: any, collectionData: any): NormalizedCard[] => {
  const normalized: NormalizedCard[] = [];
  const includedKeys = new Set<string>();
  const collectionCards = new Map<string, NormalizedCard>();

  const registerCollection = (
    list: any,
    type: CardCategory,
    fallbackName: string,
    baseId: number,
  ) => {
    const source = Array.isArray(list) ? list : [];
    source.forEach((raw, index) => {
      const id = coerceId(raw?.id, baseId + index);
      const key = buildCardKey(type, id);
      const quantity = parseQuantity(raw?.quantity);
      const baseCard: NormalizedCard = {
        id,
        type,
        name: typeof raw?.name === 'string' ? raw.name : fallbackName,
        team: typeof raw?.team === 'string' ? raw.team : undefined,
        imageUrl: parseImageUrl(raw?.image_url),
        season: typeof raw?.season === 'string' ? raw.season : undefined,
        rarity: normalizeRarity(raw?.rarity),
        quantity,
        owned: quantity > 0,
      };
      collectionCards.set(key, enrichCardWithStats(baseCard, raw));
    });
  };

  registerCollection(collectionData?.player_cards, 'player', 'Giocatore', 1);
  registerCollection(collectionData?.goalkeeper_cards, 'goalkeeper', 'Portiere', 500);
  registerCollection(collectionData?.coach_cards, 'coach', 'Allenatore', 1000);
  registerCollection(collectionData?.bonus_malus_cards, 'bonusMalus', 'Bonus/Malus', 2000);

  const pushFromCatalog = (
    list: any,
    type: CardCategory,
    fallbackName: string,
    baseId: number,
  ) => {
    const source = Array.isArray(list) ? list : [];
    source.forEach((raw, index) => {
      const id = coerceId(raw?.id, baseId + index);
      const key = buildCardKey(type, id);
      const cached = collectionCards.get(key);

      if (cached) {
        normalized.push({
          ...cached,
          name: cached.name ?? (typeof raw?.name === 'string' ? raw.name : fallbackName),
          team: cached.team ?? (typeof raw?.team === 'string' ? raw.team : undefined),
          imageUrl: cached.imageUrl ?? parseImageUrl(raw?.image_url),
          season: cached.season ?? (typeof raw?.season === 'string' ? raw.season : undefined),
          rarity: cached.rarity ?? normalizeRarity(raw?.rarity),
        });
        includedKeys.add(key);
        return;
      }

      normalized.push(
        enrichCardWithStats(
          {
            id,
            type,
            name: typeof raw?.name === 'string' ? raw.name : fallbackName,
            team: typeof raw?.team === 'string' ? raw.team : undefined,
            imageUrl: parseImageUrl(raw?.image_url),
            season: typeof raw?.season === 'string' ? raw.season : undefined,
            rarity: normalizeRarity(raw?.rarity),
            quantity: 0,
            owned: false,
          },
          raw,
        ),
      );
      includedKeys.add(key);
    });
  };

  pushFromCatalog(catalogData?.player_cards, 'player', 'Giocatore', 1);
  pushFromCatalog(catalogData?.goalkeeper_cards, 'goalkeeper', 'Portiere', 500);
  pushFromCatalog(catalogData?.coach_cards, 'coach', 'Allenatore', 1000);
  pushFromCatalog(catalogData?.bonus_malus_cards, 'bonusMalus', 'Bonus/Malus', 2000);

  collectionCards.forEach((card, key) => {
    if (!includedKeys.has(key)) {
      normalized.push(card);
      includedKeys.add(key);
    }
  });

  return normalized.sort((a, b) => {
    const rarityDiff = rarityPriority[a.rarity] - rarityPriority[b.rarity];
    if (rarityDiff !== 0) {
      return rarityDiff;
    }
    return a.name.localeCompare(b.name);
  });
};

const filterTradeableCards = (cards: NormalizedCard[]) =>
  cards.filter(card => card.quantity > 1);

const filterMissingCards = (cards: NormalizedCard[]) => cards.filter(card => !card.owned);

const ExchangeScreen: React.FC = () => {
  const { accessToken, refreshAccessToken } = useAuth();
  const [mode, setMode] = useState<ExchangeMode>('porpose');
  const [cards, setCards] = useState<NormalizedCard[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedOfferKey, setSelectedOfferKey] = useState<string | null>(null);

  const callWithAuth = useCallback(
    async (request: (token: string) => Promise<Response>) => {
      const attempt = async (token: string | null, allowRefresh: boolean): Promise<Response> => {
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

  const fetchCards = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!silent) {
        setLoading(true);
      }
      setError(null);

      try {
        const [catalogResponse, collectionResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/api/cards/all/`),
          callWithAuth(token =>
            fetch(`${API_BASE_URL}/api/packs/collection/`, {
              headers: { Authorization: `Bearer ${token}` },
            }),
          ),
        ]);

        if (!catalogResponse.ok) {
          throw new Error(`Catalog unavailable (${catalogResponse.status})`);
        }

        if (!collectionResponse.ok) {
          throw new Error(`Collection unavailable (${collectionResponse.status})`);
        }

        const catalogData = await catalogResponse.json();
        const collectionData = await collectionResponse.json();
        setCards(buildNormalizedCards(catalogData, collectionData));
      } catch (err) {
        console.error('Unable to load exchange data', err);
        setError(err instanceof Error ? err.message : 'Unexpected error while loading data');
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [callWithAuth],
  );

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchCards({ silent: true });
    } finally {
      setRefreshing(false);
    }
  }, [fetchCards]);

  const tradeableCards = useMemo(() => filterTradeableCards(cards), [cards]);
  const missingCards = useMemo(() => filterMissingCards(cards), [cards]);
  const selectedOfferCard = useMemo(() => {
    if (!selectedOfferKey) {
      return null;
    }
    return cards.find(card => buildCardKey(card.type, card.id) === selectedOfferKey) ?? null;
  }, [cards, selectedOfferKey]);

  const requestableCards = useMemo(() => {
    if (!selectedOfferCard) {
      return [];
    }
    return missingCards.filter(card => card.rarity === selectedOfferCard.rarity);
  }, [missingCards, selectedOfferCard]);

  const availableOffers = useMemo<ExchangeListing[]>(() => [], []);

  const handleSelectOffer = useCallback((card: NormalizedCard) => {
    const key = buildCardKey(card.type, card.id);
    setSelectedOfferKey(prev => {
      if (prev === key) {
        return null;
      }
      return key;
    });
  }, []);

  const handleSubmitProposal = useCallback(() => {
    if (!selectedOfferCard) {
      return;
    }

    const missingCount = requestableCards.length;
    const summary =
      missingCount > 0
        ? `Your proposal will be visible to users who miss ${selectedOfferCard.name}. They can respond only with a duplicate ${rarityLabels[selectedOfferCard.rarity]} card you do not own (we found ${missingCount} possible matches).`
        : `Your proposal will be visible to users who miss ${selectedOfferCard.name}. You already own every ${rarityLabels[selectedOfferCard.rarity]} card, so you will be matched when new drops arrive.`;

    Alert.alert(
      'Exchange ready',
      summary,
    );
  }, [selectedOfferCard, requestableCards]);

  const handleJoinOffer = useCallback((offer: ExchangeListing) => {
    Alert.alert(
      'find excange',
      `We will contact ${offer.username} to trade for ${offer.offeredCard.name}.`,
    );
  }, []);

  const renderCardOption = (
    card: NormalizedCard,
    isSelected: boolean,
    onPress: () => void,
    variant: 'grid' | 'inline' = 'grid',
  ) => {
    if (variant === 'inline') {
      return (
        <TouchableOpacity
          key={buildCardKey(card.type, card.id)}
          style={[
            styles.cardChip,
            styles.cardChipInline,
            { borderColor: rarityColors[card.rarity] },
            isSelected && styles.cardChipSelected,
          ]}
          onPress={onPress}
          activeOpacity={0.85}
        >
          <View style={[styles.cardPreview, { backgroundColor: `${rarityColors[card.rarity]}26` }]}>
            {card.imageUrl ? (
              <Image source={{ uri: card.imageUrl }} style={styles.cardImage} />
            ) : (
              <Text style={styles.cardInitial}>{card.name.slice(0, 1).toUpperCase()}</Text>
            )}
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.cardName} numberOfLines={1}>
              {card.name}
            </Text>
            <Text style={styles.cardMeta}>
              {rarityLabels[card.rarity]}
              {card.quantity > 0 ? ` - x${card.quantity}` : ''}
            </Text>
          </View>
          {isSelected && <Feather name="check-circle" size={18} color="#00a028ff" />}
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity
        key={buildCardKey(card.type, card.id)}
        onPress={onPress}
        activeOpacity={0.9}
        style={[
          styles.cardTileButton,
          isSelected && styles.cardTileButtonSelected,
        ]}
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

  const hasCards = cards.length > 0;
  const canSubmitProposal = Boolean(selectedOfferCard);

  return (
    <View style={styles.container}>
      <TopStatusBar />
      <View style={styles.content}>
        <View style={styles.subheadingCard}>
          <Text style={styles.subheading}>
            Choose whether to create a proposal or browse the community's open trades.
          </Text>
        </View>
        <View style={styles.modeSwitcher}>
          {modeTabs.map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.modeButton, mode === tab.key && styles.modeButtonActive]}
              onPress={() => setMode(tab.key)}
              activeOpacity={0.9}
            >
              <Text style={styles.modeLabel}>{tab.label}</Text>
              <Text style={styles.modeHelper}>{tab.helper}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color="#00a028ff" />
          </View>
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor="#00a028ff"
              />
            }
          >
            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={() => fetchCards()}>
                  <Text style={styles.retryText}>Try again</Text>
                </TouchableOpacity>
              </View>
            )}

            {!hasCards && !error && (
              <Text style={styles.emptyText}>
                We could not find cards in your profile. Open a few packs to start trading!
              </Text>
            )}

            {hasCards && mode === 'porpose' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Porpose escange</Text>
                <Text style={styles.sectionDescription}>
                  Select a duplicate to offer; the system will match you with an unowned card of the
                  same rarity.
                </Text>

                <Text style={styles.subSectionTitle}>1 - Card you offer</Text>
                {tradeableCards.length === 0 ? (
                  <Text style={styles.emptyText}>
                    You do not have duplicate cards available for trading right now.
                  </Text>
                ) : (
                  <View style={styles.cardGrid}>
                    {tradeableCards.map(card =>
                      renderCardOption(
                        card,
                        selectedOfferKey === buildCardKey(card.type, card.id),
                        () => handleSelectOffer(card),
                      ),
                    )}
                  </View>
                )}

                <View
                  style={[
                    styles.matchInfoBox,
                    !selectedOfferCard && styles.matchInfoBoxDisabled,
                  ]}
                >
                  <Text style={styles.matchInfoTitle}>Automatic matching</Text>
                  {!selectedOfferCard ? (
                    <Text style={styles.matchInfoText}>
                      Select a duplicate to understand which cards can be received automatically.
                    </Text>
                  ) : (
                    <>
                      <Text style={styles.matchInfoText}>
                        Other users who miss {selectedOfferCard.name} will see your proposal. They
                        can respond only with a duplicate {rarityLabels[selectedOfferCard.rarity]} card you
                        still miss.
                      </Text>
                      {requestableCards.length === 0 ? (
                        <Text style={styles.matchInfoText}>
                          You already own every {rarityLabels[selectedOfferCard.rarity]} card.
                        </Text>
                      ) : (
                        <View style={styles.needGrid}>
                          {requestableCards.slice(0, 6).map(card => (
                            <View
                              key={buildCardKey(card.type, card.id)}
                              style={styles.needBadge}
                            >
                              <Text style={styles.needBadgeText}>{card.name}</Text>
                            </View>
                          ))}
                          {requestableCards.length > 6 && (
                            <Text style={styles.moreNeedsText}>
                              +{requestableCards.length - 6} more
                            </Text>
                          )}
                        </View>
                      )}
                    </>
                  )}
                </View>

                <TouchableOpacity
                  style={[styles.primaryButton, !canSubmitProposal && styles.primaryButtonDisabled]}
                  onPress={handleSubmitProposal}
                  disabled={!canSubmitProposal}
                >
                  <Text style={styles.primaryButtonText}>Send proposal</Text>
                </TouchableOpacity>
              </View>
            )}

            {hasCards && mode === 'find' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>find excange</Text>
                <Text style={styles.sectionDescription}>
                  Here you only see proposals that include cards you do not own yet.
                </Text>

                {availableOffers.length === 0 ? (
                  <Text style={styles.emptyText}>
                    No proposals from other users match your needs right now.
                  </Text>
                ) : (
                  availableOffers.map(offer => (
                    <View key={offer.id} style={styles.offerCard}>
                      <View style={styles.offerOwner}>
                        <Feather name="user" size={16} color="#ffffff" />
                        <Text style={styles.offerOwnerText}>{offer.username}</Text>
                      </View>
                      <View style={styles.offerContent}>
                        {renderCardOption(
                          offer.offeredCard,
                          false,
                          () => handleJoinOffer(offer),
                          'inline',
                        )}
                        <View style={styles.offerDetails}>
                          <Text style={styles.offerLabel}>Looking for:</Text>
                          <Text style={styles.offerValue}>
                            {offer.wants
                              ? offer.wants
                              : `any ${rarityLabels[offer.requiredRarity]} card`}
                          </Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        style={styles.secondaryButton}
                        onPress={() => handleJoinOffer(offer)}
                      >
                        <Text style={styles.secondaryButtonText}>Open trade</Text>
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </View>
  );
};

export default ExchangeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0e0c0f',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  subheadingCard: {
    backgroundColor: 'rgba(15, 42, 24, 0.66)',
    borderColor: '#00a028ff',
    borderWidth: 2,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  subheading: {
    fontSize: 14,
    color: '#e2e8f0',
    lineHeight: 20,
    textAlign: 'center',
    fontWeight: '600',
  },
  modeSwitcher: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    marginBottom: 16,
  },
  modeButton: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1f1f1f',
    padding: 16,
    backgroundColor: '#141217',
  },
  modeButtonActive: {
    borderColor: '#00a028ff',
    backgroundColor: '#0e2a17',
  },
  modeLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    textTransform: 'uppercase',
  },
  modeHelper: {
    fontSize: 12,
    color: '#bcbcbc',
    marginTop: 4,
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
    marginTop: 8,
  },
  scrollContent: {
    paddingBottom: 80,
    gap: 12,
  },
  errorBox: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ff5959',
    padding: 16,
    backgroundColor: '#3a1212',
  },
  errorText: {
    color: '#ff9f9f',
    fontSize: 14,
    marginBottom: 12,
  },
  retryButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#ff9f9f',
  },
  retryText: {
    color: '#190707',
    fontWeight: '700',
  },
  section: {
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 20,
    color: '#ffffff',
    fontWeight: '700',
    marginBottom: 6,
  },
  sectionDescription: {
    fontSize: 13,
    color: '#c4c4c4',
    lineHeight: 18,
    marginBottom: 20,
  },
  subSectionTitle: {
    color: '#bdbdbd',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  matchInfoBox: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 160, 40, 0.45)',
    backgroundColor: 'rgba(12, 18, 16, 0.85)',
    padding: 16,
    marginTop: 18,
  },
  matchInfoBoxDisabled: {
    opacity: 0.6,
  },
  matchInfoTitle: {
    color: '#e2e8f0',
    fontWeight: '700',
    marginBottom: 8,
  },
  matchInfoText: {
    color: '#a3b4c4',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  needGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  needBadge: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#00a028ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(0, 160, 40, 0.15)',
  },
  needBadgeText: {
    color: '#d7ffe7',
    fontSize: 12,
    fontWeight: '600',
  },
  moreNeedsText: {
    color: '#8dd4a4',
    fontSize: 12,
    fontWeight: '600',
    alignSelf: 'center',
  },
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 8,
  },
  cardTileButton: {
    width: '30%',
    alignItems: 'center',
    position: 'relative',
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    marginBottom: 10,
  },
  cardTileButtonSelected: {
    borderColor: '#00a028ff',
    backgroundColor: 'rgba(0, 160, 40, 0.1)',
  },
  cardChip: {
    width: '48%',
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    backgroundColor: '#15121c',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardChipInline: {
    width: '100%',
  },
  cardChipSelected: {
    borderColor: '#00a028ff',
    backgroundColor: '#102f1f',
  },
  cardOverlayCheck: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#0f2b1a',
    borderRadius: 16,
    padding: 2,
  },
  cardPreview: {
    width: 48,
    height: 64,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardImage: {
    width: 48,
    height: 64,
    borderRadius: 10,
  },
  cardInitial: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  cardInfo: {
    flex: 1,
  },
  cardName: {
    color: '#ffffff',
    fontWeight: '600',
  },
  cardMeta: {
    color: '#b4b4b4',
    fontSize: 12,
    marginTop: 2,
  },
  primaryButton: {
    marginTop: 28,
    marginBottom: 48,
    paddingVertical: 14,
    borderRadius: 28,
    backgroundColor: '#00a028ff',
    alignItems: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: '#050c09',
    fontWeight: '700',
    fontSize: 15,
  },
  emptyText: {
    color: '#8f8f8f',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  offerCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#272727',
    padding: 16,
    backgroundColor: '#15121c',
    gap: 12,
  },
  offerOwner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  offerOwnerText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  offerContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  offerDetails: {
    flex: 1,
    paddingTop: 4,
  },
  offerLabel: {
    color: '#9f9f9f',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  offerValue: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
    marginTop: 4,
  },
  secondaryButton: {
    borderRadius: 28,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#00a028ff',
  },
  secondaryButtonText: {
    color: '#00a028ff',
    fontWeight: '700',
  },
});
