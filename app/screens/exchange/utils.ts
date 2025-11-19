import { rarityPriority } from './constants';
import { CardCategory, NormalizedCard, Rarity, TradeableCopy } from './types';

export const buildCardKey = (type: CardCategory, id: number) => `${type}:${id}`;

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

export const buildNormalizedCards = (catalogData: any, collectionData: any): NormalizedCard[] => {
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

export const normalizeRawCard = (raw: any, fallbackType?: CardCategory): NormalizedCard | null => {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const candidateType = raw.type;
  const type: CardCategory | undefined =
    candidateType === 'player' ||
    candidateType === 'goalkeeper' ||
    candidateType === 'coach' ||
    candidateType === 'bonusMalus'
      ? candidateType
      : fallbackType;
  if (!type) {
    return null;
  }
  const id = coerceId(raw.id, Number.NaN);
  if (!Number.isFinite(id)) {
    return null;
  }
  const quantity = parseQuantity(raw.quantity ?? raw.total ?? 0);
  const owned =
    typeof raw.owned === 'boolean' ? raw.owned : quantity > 0 || Boolean(raw.is_owned);
  const baseCard: NormalizedCard = {
    id,
    type,
    name: typeof raw.name === 'string' ? raw.name : 'Unknown card',
    team: typeof raw.team === 'string' ? raw.team : undefined,
    imageUrl: parseImageUrl(raw.imageUrl ?? raw.image_url),
    season: typeof raw.season === 'string' ? raw.season : undefined,
    rarity: normalizeRarity(raw.rarity),
    quantity,
    owned,
  };
  return enrichCardWithStats(baseCard, raw);
};

export const filterTradeableCards = (cards: NormalizedCard[]) =>
  cards.filter(card => card.quantity > 1);

export const filterMissingCards = (cards: NormalizedCard[]) => cards.filter(card => !card.owned);

export const buildTradeableCopies = (cards: NormalizedCard[]): TradeableCopy[] => {
  const copies: TradeableCopy[] = [];
  cards.forEach(card => {
    if (card.quantity <= 1) {
      return;
    }
    const available = Math.max(0, card.quantity - 1);
    for (let index = 0; index < available; index += 1) {
      copies.push({
        key: `${buildCardKey(card.type, card.id)}#${index + 1}`,
        card,
        slot: index + 1,
        totalAvailable: available,
      });
    }
  });
  return copies;
};
