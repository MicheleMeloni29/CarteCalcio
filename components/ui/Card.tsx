import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// Cards component
interface CardProps {
  size?: 'small' | 'medium' | 'large';
  type: 'player' | 'coach' | 'bonusMalus';
  name: string;
  team?: string;
  attack?: number;
  defense?: number;
  abilities?: string;
  effect?: string;
  duration?: number;
  attackBonus?: number;
  defenseBonus?: number;
  image: any;
  rarity?: 'common' | 'rare' | 'epic' | 'legendary'; // Usa rarità come chiave
}

const teamColors: { [key: string]: string[] } = {
  'Bergamo': ['#12151f', '#174ba1'],          // midnightblue, black
  'Virtus': ['#0000ff', '#b22222'],           // blue, firebrick
  '4mori': ['#000080', '#8b0000'],            // navy, darkred
  'Lakecity': ['#0000cd', '#00ffff'],         // mediumblue, cyan
  'Toscani': ['#4169e1', '#87ceeb'],          // royalblue, 
  'Viola': ['#800080', '#654698'],            // purple  
  'Grifoni': ['#1e2937', '#f04b35'],          // midnightblue, darkred
  'Veneti': ['#01295b', '#e0d048'],           // midnightblue, darkkhaki
  'Lombardia': ['#000000', '#0000cd'],         // black, mediumblue
  'Zebre': ['#f0f8ff', '#000000'],            // aliceblue, black
  'Aquile': ['#b0d6f4', '#bbe0f9'],           // cyan 
  'Salento': ['#ffd700', '#b22222'],          // gold, firebrick
  'Diavoli': ['#000000', '#ea2b30'],          // firebrick, black
  'Brianza': ['#f6f4f2', '#da0c2d'],          // firebrick  
  'Partenopi': ['#3396ce', '#87ceeb'],        // skyblue
  'Parmigiani': ['#e9e056', '#282b33'],        // mediumblue, gold
  'Lupi': ['#a89763', '#600619'],             // darkred, goldenrod
  'Granata': ['#853643', '#470a15'],          // maroon
  'Friulani': ['#0e0f15', '#cdcfe3'],         // black, lightsteelblue
  'Leoni': ['#f98b49', '#537162'],            // orange, green
};

const rarityColors = {
  common: '#9b5200',
  rare: '#d8d8d8',
  epic: '#ffd100',
  legendary: '#35ffb3',
};

const normalizeTeamName = (team: string | undefined): string => {
  if (!team) return '';
  // Converti tutto in minuscolo e capitalizza la prima lettera
  return team
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const Card: React.FC<CardProps> = ({
  size = 'medium',
  type,
  name,
  team = 'Unknown', // Default al team "Unknown"
  attack,
  defense,
  abilities,
  effect,
  duration,
  attackBonus,
  defenseBonus,
  image,
  rarity = 'common', // Default alla rarità "common"
}) => {
  const sizes = {
    small: { width: 70, height: 105, fontSize: 2.8, padding: 2.8, borderWidth: 5.6 },
    medium: { width: 150, height: 225, fontSize: 6, padding: 6, borderWidth: 12 },
    large: { width: 350, height: 525, fontSize: 14, padding: 14, borderWidth: 28 },
  };

  const cardStyle = sizes[size] || sizes.medium;

  const normalizedTeam = normalizeTeamName(team);
  const repeatedColors: [string, string, ...string[]] = teamColors[normalizedTeam]
    ? Array(5).fill(teamColors[normalizedTeam]).flat() as [string, string, ...string[]]
    : ['#ccc', '#000']; // Fallback ai colori di default
  const borderColor = rarityColors[rarity?.toLowerCase() as keyof typeof rarityColors] || '#000';

  const metallicBorderColors = [
    borderColor,
    '#ffffff', // Riflessione brillante
    borderColor,
    '#d9d9d9', // Ombreggiatura chiara
    borderColor,
  ];

  console.log(`Card: ${name}, Team: ${team}, Rarity: ${rarity}`);
  console.log(`Repeated Colors: ${repeatedColors}, Border Color: ${borderColor}`);



  return (
    <LinearGradient
      colors={repeatedColors}
      style={[
        styles.card,
        {
          width: cardStyle.width,
          height: cardStyle.height,
          borderRadius: cardStyle.width / 8,
          padding: cardStyle.padding,
          backgroundColor: 'transparent',
          borderWidth: cardStyle.borderWidth,
          borderColor: borderColor,
          borderStyle: 'solid',
        },
      ]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
    >
      {/* Contenitore superiore: Nome e Squadra */}
      <View style={styles.header}>
        <Text style={[styles.name, { fontSize: cardStyle.fontSize * 1.2 }]}>{name}</Text>
        {team && <Text style={[styles.team, { fontSize: cardStyle.fontSize }]}>{team}</Text>}
      </View>
      {/* Immagine */}
      <Image source={{ uri: image.uri }}
        style={styles.image}
        onError={() => {
          console.error('Errore nel caricamento immagine', image.uri)
          image.uri = 'https://www.thermaxglobal.com/wp-content/uploads/2020/05/image-not-found.jpg'
        }}
      />
      {/* Statistiche player */}
      {type === 'player' && (
        <View style={styles.playerStats}>
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
      {/* Bonus Coach */}
      {type === 'coach' && (
        <View style={styles.coachStats}>
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
          {duration && <Text style={[styles.duration, { fontSize: cardStyle.fontSize * 0.8 }]}>Duration: {duration} turns</Text>}
        </View>
      )}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    justifyContent: 'space-between', // Spaziatura uniforme
    margin: 4,
    elevation: 5,
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
  image: {
    width: '100%',
    height: '50%',
    resizeMode: 'contain',
    borderRadius: 5,
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
    flexDirection: 'row', // Allineamento orizzontale delle colonne
    justifyContent: 'space-evenly', // Spazio equo tra le colonne
    alignItems: 'center',
    width: '100%', // Occupa l'intera larghezza
    marginTop: 10, // Spazio sopra le statistiche
  },
  bonusColumn: {
    alignItems: 'center', // Centra il contenuto (label e valore) verticalmente
    justifyContent: 'center',
  },
  playerStats: {
    flexDirection: 'row', // Allineamento orizzontale
    justifyContent: 'space-between', // Spazio tra Attack e Defense
    alignItems: 'center',
    width: '100%',
    marginTop: 4, // Spazio sopra per separare dall'immagine
  },
  statColumn: {
    alignItems: 'center', // Centra i contenuti nella colonna
    flex: 1, // Ogni colonna occupa il 50% della larghezza
  },
  statLabel: {
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
  },
  statValue: {
    fontWeight: 'bold',
    color: '#ffd700', // Stesso colore per evidenziare come nelle coach
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
});

export default Card;