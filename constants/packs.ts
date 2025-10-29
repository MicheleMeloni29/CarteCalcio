import { ImageSourcePropType } from 'react-native';

export const PACK_IMAGE_MAP: Record<string, ImageSourcePropType> = {
  'basic-pack': require('../assets/images/Packs/BasicPack.png'),
  'standard-pack': require('../assets/images/Packs/StandardPack.png'),
  'premium-pack': require('../assets/images/Packs/PremiumPack.png'),
  'elite-pack': require('../assets/images/Packs/Elite Pack.png'),
  'mythic-pack': require('../assets/images/Packs/MythicPack.png'),
};

export const DEFAULT_PACK_IMAGE = PACK_IMAGE_MAP['premium-pack'];
