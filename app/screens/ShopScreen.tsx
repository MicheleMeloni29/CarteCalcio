import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  Alert,
  FlatList,
  Image,
  ImageSourcePropType,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

import { API_BASE_URL } from '../../constants/api';
import { DEFAULT_PACK_IMAGE, PACK_IMAGE_MAP } from '../../constants/packs';
import { useCredits } from '../../hooks/CreditProvider';
import { useAuth } from '../../hooks/AuthProvider';
import TopStatusBar from '../../components/ui/TopStatusBar';
import type {
  MainStackParamList,
  OpenedPackCard,
} from '../navigators/MainStackNavigator';



type PackRarityWeight = {
  rarity: string;
  weight: number;
};

type ShopItem = {
  id: string;
  backendId: number | null;
  slug: string;
  name: string;
  description: string;
  price: number;
  cardsPerPack: number;
  rarityWeights: PackRarityWeight[];
  image: ImageSourcePropType;
};

const coinSource = require('../../assets/images/Coin.png');

const ShopScreen: React.FC = () => {
  const { credits, refreshCredits } = useCredits();
  const { accessToken, refreshAccessToken } = useAuth();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [packs, setPacks] = useState<ShopItem[]>([]);
  const [packsLoading, setPacksLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const navigation = useNavigation<StackNavigationProp<MainStackParamList>>();

  const availableCredits = credits ?? 0;
  const sortedItems = useMemo(
    () => [...packs].sort((a, b) => a.price - b.price),
    [packs],
  );
  const listEmptyComponent = useMemo(
    () => (
      <View style={styles.emptyState}>
        <Text style={styles.emptyStateText}>
          {packsLoading
            ? 'Caricamento pacchetti...'
            : loadError ?? 'Nessun pacchetto disponibile.'}
        </Text>
      </View>
    ),
    [packsLoading, loadError],
  );

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

  const normalizeOpenedCards = useCallback((rawCards: unknown[]): OpenedPackCard[] => {
    return rawCards
      .map((raw, index) => {
        if (!raw || typeof raw !== 'object') {
          return null;
        }
        const record = raw as Record<string, unknown>;

        const type = typeof record.type === 'string' ? record.type : 'unknown';
        const name =
          typeof record.name === 'string' && record.name.trim().length > 0
            ? record.name.trim()
            : `Carta ${index + 1}`;
        const rarity =
          typeof record.rarity === 'string' && record.rarity.length > 0
            ? record.rarity
            : null;

        return {
          id: typeof record.id === 'number' ? record.id : null,
          type,
          name,
          rarity,
          image_url: typeof record.image_url === 'string' ? record.image_url : null,
          team: typeof record.team === 'string' ? record.team : null,
          attack: typeof record.attack === 'number' ? record.attack : null,
          defense: typeof record.defense === 'number' ? record.defense : null,
          abilities: typeof record.abilities === 'string' ? record.abilities : null,
          attack_bonus: typeof record.attack_bonus === 'number' ? record.attack_bonus : null,
          defense_bonus: typeof record.defense_bonus === 'number' ? record.defense_bonus : null,
          effect: typeof record.effect === 'string' ? record.effect : null,
          duration: typeof record.duration === 'number' ? record.duration : null,
          season: typeof record.season === 'string' ? record.season : null,
        } as OpenedPackCard;
      })
      .filter((value): value is OpenedPackCard => value !== null);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const mapPack = (raw: unknown, index: number): ShopItem | null => {
      if (!raw || typeof raw !== 'object') {
        return null;
      }

      const pack = raw as Record<string, unknown>;
      const slug =
        typeof pack.slug === 'string' && pack.slug.length > 0
          ? pack.slug
          : `pack-${pack.id ?? index}`;
      const name =
        typeof pack.name === 'string' && pack.name.length > 0 ? pack.name : slug;
      const description =
        typeof pack.description === 'string' && pack.description.trim().length > 0
          ? pack.description.trim()
          : 'Pacchetto disponibile per l\'acquisto.';

      const priceValue = pack.price;
      const price =
        typeof priceValue === 'number'
          ? priceValue
          : typeof priceValue === 'string'
            ? Number(priceValue)
            : NaN;

      if (!Number.isFinite(price)) {
        return null;
      }

      const cardsPerPackRaw = pack.cards_per_pack;
      const cardsPerPack =
        typeof cardsPerPackRaw === 'number' && cardsPerPackRaw > 0
          ? cardsPerPackRaw
          : 5;

      const rarityWeightsRaw = Array.isArray(pack.rarity_weights)
        ? pack.rarity_weights
        : [];
      const rarityWeights: PackRarityWeight[] = rarityWeightsRaw
        .map(entry => {
          if (!entry || typeof entry !== 'object') {
            return null;
          }
          const record = entry as Record<string, unknown>;
          const rarityName =
            typeof record.rarity === 'string' ? record.rarity : null;
          const weightRaw = record.weight;
          const weight =
            typeof weightRaw === 'number'
              ? weightRaw
              : typeof weightRaw === 'string'
                ? Number(weightRaw)
                : NaN;

          if (!rarityName || !Number.isFinite(weight)) {
            return null;
          }

          return { rarity: rarityName, weight };
        })
        .filter((value): value is PackRarityWeight => value !== null);

      const image = PACK_IMAGE_MAP[slug] ?? DEFAULT_PACK_IMAGE;

      return {
        id: slug,
        backendId: typeof pack.id === 'number' ? pack.id : null,
        slug,
        name,
        description,
        price,
        cardsPerPack,
        rarityWeights,
        image,
      };
    };

    const loadPacks = async () => {
      setPacksLoading(true);
      setLoadError(null);

      try {
        const response = await fetch(`${API_BASE_URL}/api/packs/`);
        if (!response.ok) {
          throw new Error(`Unexpected status: ${response.status}`);
        }

        const data = await response.json();
        if (!Array.isArray(data)) {
          throw new Error('Invalid response format for packs.');
        }

        const mapped = data
          .map((entry, index) => mapPack(entry, index))
          .filter((value): value is ShopItem => value !== null);

        if (isMounted) {
          setPacks(mapped);
        }
      } catch (error) {
        console.error('Failed to load packs', error);
        if (isMounted) {
          setPacks([]);
          setLoadError('Impossibile caricare i pacchetti. Riprova più tardi.');
        }
      } finally {
        if (isMounted) {
          setPacksLoading(false);
        }
      }
    };

    loadPacks();

    return () => {
      isMounted = false;
    };
  }, []);


  const handleExit = useCallback(() => {
    if (navigation.canGoBack()) {
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
      const response = await callWithAuth(token =>
        fetch(`${API_BASE_URL}/api/packs/${item.slug}/purchase/`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }),
      );

      if (!response.ok) {
        let detail = 'Impossibile completare l\'acquisto, riprova.';
        try {
          const payload = await response.json();
          if (payload && typeof payload.detail === 'string') {
            detail = payload.detail;
          }
        } catch {
          // ignore JSON parse errors
        }
        throw new Error(detail);
      }

      const data = await response.json();
      const openedCards = Array.isArray(data?.cards)
        ? normalizeOpenedCards(data.cards)
        : [];

      await refreshCredits();

      navigation.navigate('PackOpen', {
        packSlug: item.slug,
        packName: item.name,
        cards: openedCards,
        credits: typeof data?.credits === 'number' ? data.credits : null,
      });
    } catch (error) {
      const message =
        error instanceof Error && error.message ? error.message : 'Impossibile completare l\'acquisto, riprova.';
      Alert.alert('Errore', message);
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
        <Image source={item.image} style={styles.packImage} resizeMode="contain" />
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
            {processingId === item.id ? 'Purchase...' : 'Buy now'}
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
        ListEmptyComponent={listEmptyComponent}
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
  emptyState: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    color: '#cbd5f5',
    fontSize: 16,
    textAlign: 'center',
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
    textAlign: 'center',
  },
  packImage: {
    width: '100%',
    height: 280,
    marginBottom: -40,
    marginTop: -40,
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
