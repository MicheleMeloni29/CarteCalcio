export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';
export type CardCategory = 'player' | 'goalkeeper' | 'coach' | 'bonusMalus';
export type ExchangeMode = 'porpose' | 'find';
export type FindCarouselTab = 'mine' | 'community';

export type NormalizedCard = {
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

export type ExchangeListing = {
  id: string;
  username: string;
  offeredCard: NormalizedCard;
  wants?: string;
  requiredRarity: Rarity;
  isOptimistic?: boolean;
};

export type TradeableCopy = {
  key: string;
  card: NormalizedCard;
  slot: number;
  totalAvailable: number;
};
