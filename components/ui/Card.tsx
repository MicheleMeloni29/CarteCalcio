import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Image, ImageSourcePropType } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// Cards component
interface CardProps {
  size?: 'small' | 'medium' | 'large';
  type: 'player' | 'goalkeeper' | 'coach' | 'bonusMalus';
  name: string;
  team?: string;
  attack?: number;
  defense?: number;
  save?: number;
  abilities?: string;
  effect?: string;
  duration?: number;
  imageScale?: number;
  attackBonus?: number;
  defenseBonus?: number;
  image?: { uri: string } | number | null;
  rarity?: 'common' | 'rare' | 'epic' | 'legendary'; // Usa rarità come chiave
  season?: string | null;
  collectionNumber?: number | string;
}

const FALLBACK_IMAGE_URI =
  'https://www.thermaxglobal.com/wp-content/uploads/2020/05/image-not-found.jpg';

const isRemoteImage = (value: unknown): value is { uri: string } => {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const uri = (value as { uri?: unknown }).uri;
  return typeof uri === 'string' && uri.length > 0;
};

const teamColors: { [key: string]: string[] } = {
  Bergamo: ['#12151f', '#174ba1'],
  Virtus: ['#0000ff', '#b22222'],
  '4mori': ['#000080', '#8b0000'],
  Lakecity: ['#0000cd', '#00ffff'],
  Toscani: ['#4169e1', '#87ceeb'],
  Viola: ['#800080', '#654698'],
  Grifoni: ['#1e2937', '#f04b35'],
  Veneti: ['#01295b', '#e0d048'],
  Lombardia: ['#000000', '#0000cd'],
  Zebre: ['#f0f8ff', '#000000'],
  Aquile: ['#b0d6f4', '#bbe0f9'],
  Salento: ['#ffd700', '#b22222'],
  Diavoli: ['#000000', '#ea2b30'],
  Brianza: ['#f6f4f2', '#da0c2d'],
  Partenopi: ['#3396ce', '#87ceeb'],
  Parmigiani: ['#e9e056', '#282b33'],
  Lupi: ['#a89763', '#600619'],
  Granata: ['#853643', '#470a15'],
  Friulani: ['#0e0f15', '#cdcfe3'],
  Leoni: ['#f98b49', '#537162'],
};

const rarityColors: Record<Exclude<CardProps['rarity'], undefined>, string> = {
  common: '#9b5200',
  rare: '#d8d8d8',
  epic: '#ffd100',
  legendary: '#35ffb3',
};

type GradientTuple = readonly [string, string, ...string[]];

const rarityBorderGradients: Partial<
  Record<Exclude<CardProps['rarity'], undefined>, GradientTuple>
> = {
  rare: [
    '#D8DEE9',  // silver chiaro
    '#bac1c5ff',  // silver medio
    '#9a9fa1ff',  // leggero riflesso
    '#71797cff',  // ripetizione media
    '#D8DEE9',  // silver chiaro
    '#bac1c5ff',  // silver medio
    '#9a9fa1ff',  // leggero riflesso
    '#71797cff',  // ripetizione media
    '#D8DEE9',  // silver chiaro
    '#bac1c5ff',  // silver medio
    '#9a9fa1ff',  // leggero riflesso
    '#71797cff',  // ripetizione media
  ] as const,
  epic: [
    '#FFF4C2', // highlight oro chiaro
    '#f6e592ff', // highlight giallo
    '#F0C859', // oro principale
    '#D4A017', // ombra ambrata
    '#FFF4C2', // secondo highlight
    '#f6e592ff', // highlight giallo
    '#F0C859', // oro principale di ritorno
    '#D4A017', // ombra finale
    '#FFF4C2', // highlight oro chiaro
    '#f6e592ff', // highlight giallo
    '#F0C859', // oro principale
    '#D4A017', // ombra ambrata
    '#FFF4C2', // secondo highlight
    '#f6e592ff', // highlight giallo
    '#F0C859', // oro principale di ritorno
    '#D4A017', // ombra finale
  ] as const,
  legendary: [
    '#C6FFE9', // highlight magico
    '#3AFFB8', // smeraldo brillante
    '#16C98D', // verde prezioso
    '#0A7A55', // profondità
    '#16C98D', // ritorno al verde prezioso
    '#3AFFB8', // secondo smeraldo
    '#C6FFE9', // highlight finale
    '#3AFFB8', // accento conclusivo
    '#C6FFE9', // highlight magico
    '#3AFFB8', // smeraldo brillante
    '#16C98D', // verde prezioso
    '#0A7A55', // profondità
    '#16C98D', // ritorno al verde prezioso
    '#3AFFB8', // secondo smeraldo
    '#C6FFE9', // highlight finale
    '#3AFFB8', // accento conclusivo
    '#C6FFE9', // highlight magico
    '#3AFFB8', // smeraldo brillante
    '#16C98D', // verde prezioso
    '#0A7A55', // profondità
    '#16C98D', // ritorno al verde prezioso
    '#3AFFB8', // secondo smeraldo
  ] as const,
};


const rarityGlowStyles: Partial<
  Record<Exclude<CardProps['rarity'], undefined>, { shadowColor: string; shadowOpacity: number; shadowRadius: number; elevation: number }>
> = {
  rare: {
    shadowColor: '#b5c9ff',
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 6,
  },
  epic: {
    shadowColor: '#ffdf87',
    shadowOpacity: 0.55,
    shadowRadius: 12,
    elevation: 8,
  },
  legendary: {
    shadowColor: '#3dff9b',
    shadowOpacity: 0.6,
    shadowRadius: 14,
    elevation: 9,
  },
};

const normalizeTeamName = (team: string | undefined): string => {
  if (!team) return '';
  return team
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const CardComponent: React.FC<CardProps> = ({
  size = 'medium',
  type,
  name,
  team = 'Unknown',
  attack,
  defense,
  abilities,
  effect,
  duration,
  attackBonus,
  defenseBonus,
  save,
  imageScale,
  image,
  rarity = 'common',
  season,
  collectionNumber,
}) => {
  const sizes = {
    small: { width: 80, height: 120, fontSize: 2.8, padding: 2.8, borderWidth: 5.6 },
    medium: { width: 180, height: 270, fontSize: 7, padding: 7, borderWidth: 14 },
    large: { width: 350, height: 525, fontSize: 14, padding: 14, borderWidth: 28 },
  };

  const cardStyle = sizes[size] || sizes.medium;

  const imageConfig = {
    large: {
      heightScale: 0.64,
      marginTop: -cardStyle.height * 0.015,
      marginBottom: cardStyle.height * 0.06,
    },
    medium: {
      heightScale: 0.66,
      marginTop: -cardStyle.height * 0.015,
      marginBottom: cardStyle.height * 0.02,
    },
    small: {
      heightScale: 0.62,
      marginTop: -cardStyle.height * 0.015,
      marginBottom: cardStyle.height * 0.03,
    },
  } as const;

  const baseConfig = imageConfig[size] ?? imageConfig.medium;
  const normalizedScale =
    typeof imageScale === 'number' && Number.isFinite(imageScale)
      ? imageScale
      : baseConfig.heightScale;
  const clampedScale = Math.min(Math.max(normalizedScale, 0.3), 0.9);
  const scaleDelta = clampedScale - baseConfig.heightScale;
  const imageHeight = cardStyle.height * clampedScale;
  const effectiveMarginTop =
    baseConfig.marginTop - scaleDelta * cardStyle.height * 0.35;
  const effectiveMarginBottom = Math.max(
    baseConfig.marginBottom - scaleDelta * cardStyle.height * 0.25,
    cardStyle.height * 0.015,
  );

  const containerPadding = cardStyle.padding;
  const containerBorderWidth = cardStyle.borderWidth;
  const extraBottomPadding =
    size === 'small'
      ? cardStyle.height * 0.075
      : size === 'medium'
        ? cardStyle.height * 0.055
        : cardStyle.height * 0.035;
  const statsBottomSpacing =
    size === 'small'
      ? cardStyle.height * 0.02
      : size === 'medium'
        ? cardStyle.height * 0.035
        : cardStyle.height * 0.02;

  const isStaticResource = typeof image === 'number';
  const providedRemoteUri = isRemoteImage(image) ? image.uri : null;
  const staticResource = isStaticResource ? (image as number) : null;
  const [fallbackUri, setFallbackUri] = useState<string | null>(null);

  useEffect(() => {
    setFallbackUri(null);
  }, [providedRemoteUri, staticResource]);

  const resolvedImageSource = useMemo<ImageSourcePropType>(() => {
    if (fallbackUri) {
      return { uri: fallbackUri };
    }
    if (providedRemoteUri) {
      return { uri: providedRemoteUri };
    }
    if (staticResource !== null) {
      return staticResource;
    }
    return { uri: FALLBACK_IMAGE_URI };
  }, [fallbackUri, providedRemoteUri, staticResource]);

  const normalizedTeam = normalizeTeamName(team);
  const repeatedColors: [string, string, ...string[]] = teamColors[normalizedTeam]
    ? (Array(5).fill(teamColors[normalizedTeam]).flat() as [string, string, ...string[]])
    : ['#ccc', '#000'];

  const normalizedRarity = rarity.toLowerCase() as Exclude<CardProps['rarity'], undefined>;
  const borderColor = rarityColors[normalizedRarity] || '#000';
  const borderGradient = rarityBorderGradients[normalizedRarity];
  const glowStyle = rarityGlowStyles[normalizedRarity];
  const seasonLabel = typeof season === 'string' && season.trim().length > 0 ? season.trim() : null;
  const seasonLabelUpper = useMemo(
    () => (seasonLabel ? seasonLabel.toUpperCase() : null),
    [seasonLabel],
  );
  const seasonFontScale =
    size === 'large' ? 0.75 : size === 'medium' ? 0.78 : 0.82;

  const outerDimensions = {
    width: cardStyle.width,
    height: cardStyle.height,
    borderRadius: cardStyle.width / 8 + containerBorderWidth,
    padding: containerBorderWidth,
  };

  const cardContent = (
    <LinearGradient
      colors={repeatedColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={[
        styles.cardInner,
        {
          borderRadius: cardStyle.width / 8,
          padding: containerPadding,
          paddingBottom: containerPadding + extraBottomPadding,
        },
      ]}
    >
      {seasonLabelUpper && (
        <View
          pointerEvents="none"
          style={[
            styles.seasonLabelContainer,
            {
              right: - containerPadding,
            },
          ]}
        >
          <Text
            style={[
              styles.seasonLabelText,
              {
                fontSize: cardStyle.fontSize * seasonFontScale,
                lineHeight: cardStyle.fontSize * seasonFontScale * 1.05,
              },
            ]}
          >
            {seasonLabelUpper}
          </Text>
        </View>
      )}
      {/* Contenitore superiore: Nome e Squadra */}
      <View style={styles.header}>
        <Text style={[styles.name, { fontSize: cardStyle.fontSize * 1.2 }]}>{name}</Text>
        {team && <Text style={[styles.team, { fontSize: cardStyle.fontSize }]}>{team}</Text>}
        {type === 'goalkeeper' && collectionNumber !== undefined && collectionNumber !== null && (
          <Text style={[styles.collectionNumber, { fontSize: cardStyle.fontSize * 0.8 }]}>
            #{collectionNumber}
          </Text>
        )}
      </View>
      {/* Immagine */}
      <Image
        source={resolvedImageSource}
        resizeMode="cover"
        style={[
          styles.image,
          {
            height: imageHeight,
            marginTop: effectiveMarginTop,
            marginBottom: effectiveMarginBottom,
          },
        ]}
        onError={() => {
          if (!fallbackUri) {
            setFallbackUri(FALLBACK_IMAGE_URI);
          }
        }}
      />
      {/* Statistiche player */}
      {type === 'player' && (
        <View style={[styles.playerStats, { marginBottom: statsBottomSpacing }]}>
          <View style={styles.statColumn}>
            <Text style={[styles.statLabel, { fontSize: cardStyle.fontSize * 0.8 }]}>
              Attack
            </Text>
            <Text style={[styles.statValue, { fontSize: cardStyle.fontSize * 1.1 }]}>
              {attack}
            </Text>
          </View>
          <View style={styles.statColumn}>
            <Text style={[styles.statLabel, { fontSize: cardStyle.fontSize * 0.8 }]}>
              Defense
            </Text>
            <Text style={[styles.statValue, { fontSize: cardStyle.fontSize * 1.1 }]}>
              {defense}
            </Text>
          </View>
        </View>
      )}
      {type === 'goalkeeper' && (
        <View style={[styles.goalkeeperStats, { marginBottom: statsBottomSpacing }]}>
          <View style={styles.statColumn}>
            <Text style={[styles.statLabel, { fontSize: cardStyle.fontSize * 0.8 }]}>
              Saves
            </Text>
            <Text style={[styles.statValue, { fontSize: cardStyle.fontSize * 1.1 }]}>
              {typeof save === 'number' ? `${save}%` : '--%'}
            </Text>
          </View>
        </View>
      )}
      {/* Bonus Coach */}
      {type === 'coach' && (
        <View
          style={[
            styles.coachStats,
            {
              marginTop: size === 'small' ? cardStyle.height * 0.01 : cardStyle.height * 0.04,
              marginBottom: size === 'small' ? cardStyle.height * 0.12 : cardStyle.height * 0.05,
            },
          ]}
        >
          <View style={styles.bonusColumn}>
            <Text style={[styles.bonusLabel, { fontSize: cardStyle.fontSize * 0.8 }]}>
              Attack Bonus
            </Text>
            <Text style={[styles.bonusValue, { fontSize: cardStyle.fontSize * 1.1 }]}>
              {attackBonus}%
            </Text>
          </View>
          <View style={styles.bonusColumn}>
            <Text style={[styles.bonusLabel, { fontSize: cardStyle.fontSize * 0.8 }]}>
              Defense Bonus
            </Text>
            <Text style={[styles.bonusValue, { fontSize: cardStyle.fontSize * 1.1 }]}>
              {defenseBonus}%
            </Text>
          </View>
        </View>
      )}
      {/* Bonus/Malus */}
      {type === 'bonusMalus' && (
        <View style={styles.bonusMalus}>
          <Text style={[styles.effect, { fontSize: cardStyle.fontSize * 0.9 }]}>{effect}</Text>
          {duration && (
            <Text style={[styles.duration, { fontSize: cardStyle.fontSize * 0.8 }]}>
              Duration: {duration} turns
            </Text>
          )}
        </View>
      )}
    </LinearGradient>
  );

  if (borderGradient) {
    return (
      <LinearGradient
        colors={borderGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.cardOuter, outerDimensions, glowStyle]}
      >
        {cardContent}
      </LinearGradient>
    );
  }

  return (
    <View
      style={[
        styles.cardOuter,
        outerDimensions,
        {
          backgroundColor: borderColor,
        },
      ]}
    >
      {cardContent}
    </View>
  );
};

const styles = StyleSheet.create({
  cardOuter: {
    margin: 4,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 8,
    elevation: 6,
    borderRadius: 20,
  },
  cardInner: {
    flex: 1,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'flex-start',
    backgroundColor: 'transparent',
    borderRadius: 16,
    overflow: 'hidden',
  },
  header: {
    alignItems: 'center',
    marginTop: 4,
  },
  name: {
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  team: {
    color: '#ddd',
    textAlign: 'center',
    marginTop: 2,
  },
  collectionNumber: {
    color: '#9be7ff',
    textAlign: 'center',
    marginTop: 2,
    fontWeight: '600',
  },
  image: {
    width: '100%',
    borderRadius: 5,
    overflow: 'hidden',
    alignSelf: 'stretch',
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    width: '100%',
    marginBottom: 8,
  },
  stat: {
    fontWeight: '600',
    color: '#fff',
  },
  bonusMalus: {
    alignItems: 'center',
    marginVertical: 8,
  },
  effect: {
    color: '#fff',
    textAlign: 'center',
  },
  duration: {
    color: '#bbb',
    textAlign: 'center',
    marginTop: 4,
  },
  coachStats: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    width: '100%',
    marginTop: 10,
  },
  bonusColumn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginTop: 4,
  },
  goalkeeperStats: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    marginTop: 4,
  },
  statColumn: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
  },
  statValue: {
    fontWeight: 'bold',
    color: '#ffd700',
    textAlign: 'center',
  },
  bonusLabel: {
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
  },
  bonusValue: {
    fontWeight: 'bold',
    color: '#ffd700',
    textAlign: 'center',
  },
  seasonLabelContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'none',
  },
  seasonLabelText: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '700',
    letterSpacing: 1.2,
    textAlign: 'center',
    includeFontPadding: false,
    transform: [{ rotate: '-90deg' }],
  },
});

export default React.memo(CardComponent);
