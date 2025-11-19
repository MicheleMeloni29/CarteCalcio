import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import TopStatusBar from '../../components/ui/TopStatusBar';
import { API_BASE_URL } from '../../constants/api';
import { useAuth } from '../../hooks/AuthProvider';
import ProposeExchangeSection from './exchange/ProposeExchangeSection';
import FindExchangeSection from './exchange/FindExchangeSection';
import { rarityLabels, modeTabs } from './exchange/constants';
import {
  ExchangeListing,
  ExchangeMode,
  NormalizedCard,
} from './exchange/types';
import {
  buildCardKey,
  buildNormalizedCards,
  buildTradeableCopies,
  filterMissingCards,
  normalizeRawCard,
} from './exchange/utils';

const normalizeExchangeListing = (raw: any): ExchangeListing | null => {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const offeredCardRaw = raw.offered_card ?? raw.offeredCard ?? raw.card;
  const inferredType = raw.card_type;
  const offeredCard = normalizeRawCard(
    offeredCardRaw,
    inferredType === 'player' ||
      inferredType === 'goalkeeper' ||
      inferredType === 'coach' ||
      inferredType === 'bonusMalus'
      ? inferredType
      : undefined,
  );
  if (!offeredCard) {
    return null;
  }
  const offerId = raw.id ?? raw.offer_id ?? raw.uuid;
  if (offerId === undefined || offerId === null) {
    return null;
  }
  const rawRarity = typeof raw.required_rarity === 'string' ? raw.required_rarity.toLowerCase() : null;
  const requiredRarity: NormalizedCard['rarity'] =
    rawRarity === 'rare' || rawRarity === 'epic' || rawRarity === 'legendary'
      ? rawRarity
      : rawRarity === 'common'
        ? 'common'
        : offeredCard.rarity;

  return {
    id: String(offerId),
    username:
      typeof raw.username === 'string'
        ? raw.username
        : typeof raw.user === 'string'
          ? raw.user
          : 'Collector',
    offeredCard,
    wants: typeof raw.wants === 'string' ? raw.wants : undefined,
    requiredRarity,
  };
};

const mapOffersResponse = (payload: unknown): ExchangeListing[] => {
  if (!Array.isArray(payload)) {
    return [];
  }
  return payload
    .map(normalizeExchangeListing)
    .filter((offer): offer is ExchangeListing => Boolean(offer));
};

const ExchangeScreen: React.FC = () => {
  const { accessToken, refreshAccessToken } = useAuth();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<ExchangeMode>('porpose');
  const [cards, setCards] = useState<NormalizedCard[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTradeKey, setSelectedTradeKey] = useState<string | null>(null);
  const [myOffers, setMyOffers] = useState<ExchangeListing[]>([]);
  const [availableOffers, setAvailableOffers] = useState<ExchangeListing[]>([]);
  const [optimisticMyOffers, setOptimisticMyOffers] = useState<ExchangeListing[]>([]);

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
        const [catalogResponse, collectionResponse, myOffersResponse, feedResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/api/cards/all/`),
          callWithAuth(token =>
            fetch(`${API_BASE_URL}/api/packs/collection/`, {
              headers: { Authorization: `Bearer ${token}` },
            }),
          ),
          callWithAuth(token =>
            fetch(`${API_BASE_URL}/api/exchange/offers/mine/`, {
              headers: { Authorization: `Bearer ${token}` },
            }),
          ),
          callWithAuth(token =>
            fetch(`${API_BASE_URL}/api/exchange/offers/feed/`, {
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
        const parseOffersPayload = async (
          response: Response,
          context: 'your offers' | 'community offers',
        ): Promise<{ items: unknown; missing: boolean }> => {
          if (response.status === 404 || response.status === 204) {
            return { items: [], missing: true };
          }
          if (!response.ok) {
            throw new Error(`Unable to load ${context} (${response.status})`);
          }
          try {
            return { items: await response.json(), missing: false };
          } catch {
            return { items: [], missing: false };
          }
        };

        const [catalogData, collectionData, myOffersPayload, feedPayload] = await Promise.all([
          catalogResponse.json(),
          collectionResponse.json(),
          parseOffersPayload(myOffersResponse, 'your offers'),
          parseOffersPayload(feedResponse, 'community offers'),
        ]);
        setCards(buildNormalizedCards(catalogData, collectionData));
        setMyOffers(mapOffersResponse(myOffersPayload.items));
        setAvailableOffers(mapOffersResponse(feedPayload.items));
        if (!myOffersPayload.missing) {
          setOptimisticMyOffers([]);
        }
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

  const tradeableCopies = useMemo(() => buildTradeableCopies(cards), [cards]);
  const allMyOffers = useMemo(
    () => [...optimisticMyOffers, ...myOffers],
    [optimisticMyOffers, myOffers],
  );
  const reservedCounts = useMemo(() => {
    const serverCounts = allMyOffers.reduce<Record<string, number>>((acc, offer) => {
      const key = buildCardKey(offer.offeredCard.type, offer.offeredCard.id);
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});
    return serverCounts;
  }, [allMyOffers]);
  const availableTradeableCopies = useMemo(() => {
    const baseKeys = Object.keys(reservedCounts);
    if (baseKeys.length === 0) {
      return tradeableCopies;
    }
    const usage = new Map<string, number>();
    return tradeableCopies.filter(copy => {
      const baseKey = buildCardKey(copy.card.type, copy.card.id);
      const reserved = reservedCounts[baseKey] ?? 0;
      if (reserved <= 0) {
        return true;
      }
      const allowed = Math.max(copy.totalAvailable - reserved, 0);
      if (allowed <= 0) {
        return false;
      }
      const used = usage.get(baseKey) ?? 0;
      if (used < allowed) {
        usage.set(baseKey, used + 1);
        return true;
      }
      return false;
    });
  }, [tradeableCopies, reservedCounts]);
  const missingCards = useMemo(() => filterMissingCards(cards), [cards]);
  const selectedOfferCard = useMemo(() => {
    if (!selectedTradeKey) {
      return null;
    }
    const match = availableTradeableCopies.find(copy => copy.key === selectedTradeKey);
    return match ? match.card : null;
  }, [selectedTradeKey, availableTradeableCopies]);

  const requestableCards = useMemo(() => {
    if (!selectedOfferCard) {
      return [];
    }
    return missingCards.filter(card => card.rarity === selectedOfferCard.rarity);
  }, [missingCards, selectedOfferCard]);

  const handleSelectOffer = useCallback((copyKey: string) => {
    setSelectedTradeKey(prev => (prev === copyKey ? null : copyKey));
  }, []);

  const handleSubmitProposal = useCallback(async () => {
    if (!selectedOfferCard) {
      return;
    }

    try {
      await callWithAuth(token =>
        fetch(`${API_BASE_URL}/api/exchange/offers/`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            card_id: selectedOfferCard.id,
            card_type: selectedOfferCard.type,
          }),
        }),
      );
      const optimisticOffer: ExchangeListing = {
        id: `pending-${Date.now()}`,
        username: 'You',
        offeredCard: selectedOfferCard,
        wants:
          requestableCards.length === 0
            ? `any ${rarityLabels[selectedOfferCard.rarity]} card`
            : `any ${rarityLabels[selectedOfferCard.rarity]} card you still miss`,
        requiredRarity: selectedOfferCard.rarity,
        isOptimistic: true,
      };
      setOptimisticMyOffers(prev => [...prev, optimisticOffer]);
      setSelectedTradeKey(null);
     await fetchCards({ silent: true });
      const missingCount = requestableCards.length;
      const summary =
        missingCount > 0
          ? `Your proposal will be visible to users who miss ${selectedOfferCard.name}. They can respond only with a duplicate ${rarityLabels[selectedOfferCard.rarity]} card you do not own (found ${missingCount} possible matches).`
          : `Your proposal will be visible to users who miss ${selectedOfferCard.name}. You already own every ${rarityLabels[selectedOfferCard.rarity]} card, so you will be matched when new drops arrive.`;
      Alert.alert('Exchange ready', summary);
    } catch (err) {
      console.error('Unable to publish exchange offer', err);
      Alert.alert(
        'Unable to publish exchange',
        err instanceof Error ? err.message : 'Please try again later.',
      );
    }
  }, [callWithAuth, fetchCards, requestableCards.length, selectedOfferCard]);

  const handleJoinOffer = useCallback(
    async (offer: ExchangeListing) => {
      try {
        await callWithAuth(token =>
          fetch(`${API_BASE_URL}/api/exchange/offers/${offer.id}/join/`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }),
        );
        await fetchCards({ silent: true });
        Alert.alert(
          'Exchange requested',
          `We have notified ${offer.username}. You will see the new card in your collection once they confirm the trade.`,
        );
      } catch (err) {
        console.error('Unable to join exchange', err);
        Alert.alert(
          'Unable to open trade',
          err instanceof Error ? err.message : 'Please try again later.',
        );
      }
    },
    [callWithAuth, fetchCards],
  );

  const handleDeleteProposal = useCallback(
    async (proposal: ExchangeListing) => {
      try {
        if (proposal.isOptimistic) {
          setOptimisticMyOffers(prev => prev.filter(item => item.id !== proposal.id));
        } else {
          await callWithAuth(token =>
            fetch(`${API_BASE_URL}/api/exchange/offers/${proposal.id}/`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${token}` },
            }),
          );
          await fetchCards({ silent: true });
        }
      } catch (err) {
        console.error('Unable to delete exchange', err);
        Alert.alert(
          'Unable to delete exchange',
          err instanceof Error ? err.message : 'Please try again later.',
        );
      }
    },
    [callWithAuth, fetchCards],
  );

  const hasCards = cards.length > 0;
  const canSubmitProposal = Boolean(selectedOfferCard);
  const showActionBar = mode === 'porpose' && Boolean(selectedOfferCard);

  return (
    <View style={styles.container}>
      <TopStatusBar />
      <View style={styles.content}>
        <View style={styles.subheadingCard}>
          <Text style={styles.subheading}>
            Choose whether to create a trade proposal or browse the community's open trades
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
            contentContainerStyle={[
              styles.scrollContent,
              showActionBar && styles.scrollContentWithAction,
            ]}
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
              <ProposeExchangeSection
                tradeableCopies={availableTradeableCopies}
                selectedCopyKey={selectedTradeKey}
                onSelectCopy={handleSelectOffer}
              />
            )}

            {hasCards && mode === 'find' && (
              <FindExchangeSection
                myProposals={allMyOffers}
                availableOffers={availableOffers}
                onDeleteProposal={handleDeleteProposal}
                onJoinOffer={handleJoinOffer}
              />
            )}
          </ScrollView>
        )}
        {showActionBar && (
          <View
            style={[
              styles.actionBar,
              {
                paddingBottom: Math.max(insets.bottom, 10),
                bottom: Math.max(insets.bottom, 0) + 110,
              },
            ]}
          >
            <TouchableOpacity
              style={[styles.actionButton, styles.actionButtonReady]}
              onPress={handleSubmitProposal}
            >
              <Text style={styles.actionButtonText}>Send proposal</Text>
            </TouchableOpacity>
          </View>
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
    fontSize: 12,
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
    padding: 10,
    backgroundColor: '#141217',
    alignItems: 'center',
    justifyContent: 'center',
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
    textAlign: 'center',
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
  scrollContentWithAction: {
    paddingBottom: 220,
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
  emptyText: {
    color: '#8f8f8f',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  actionBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 24,
    backgroundColor: 'transparent',
  },
  actionButton: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1f1f1f',
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#141217',
    alignItems: 'center',
  },
  actionButtonReady: {
    borderColor: '#00a028ff',
    backgroundColor: '#0e2a17',
  },
  actionButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
    textTransform: 'uppercase',
  },
});
