import { ExchangeMode, FindCarouselTab, Rarity } from './types';

export const rarityPriority: Record<Rarity, number> = {
  common: 0,
  rare: 1,
  epic: 2,
  legendary: 3,
};

export const rarityLabels: Record<Rarity, string> = {
  common: 'Common',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
};

export const rarityColors: Record<Rarity, string> = {
  common: '#9b5200',
  rare: '#d8d8d8',
  epic: '#ffd100',
  legendary: '#35ffb3',
};

export const modeTabs: Array<{ key: ExchangeMode; label: string }> = [
  { key: 'porpose', label: 'porpose escange' },
  { key: 'find', label: 'find excange' },
];

export const findCarouselTabs: Array<{ key: FindCarouselTab; label: string }> = [
  { key: 'mine', label: 'My exchanges' },
  { key: 'community', label: 'Community offers' },
];

export const MY_EXCHANGE_INITIAL_COUNT = 6;
export const COMMUNITY_EXCHANGE_INITIAL_COUNT = 10;
export const LOAD_MORE_STEP = 6;
