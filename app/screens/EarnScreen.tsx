import React, { useMemo, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useCredits } from '../../hooks/CreditProvider';
import TopStatusBar from '../../components/ui/TopStatusBar';

type Mission = {
  id: string;
  title: string;
  description: string;
  reward: number;
};

const DAILY_MISSIONS: Mission[] = [
  {
    id: 'daily-login',
    title: 'Bonus accesso giornaliero',
    description: 'Accedi ogni giorno per ricevere un piccolo extra.',
    reward: 50,
  },
  {
    id: 'share-friend',
    title: 'Condividi con un amico',
    description: 'Invita un amico a registrarsi alla piattaforma.',
    reward: 120,
  },
  {
    id: 'first-win',
    title: 'Prima vittoria del giorno',
    description: 'Vinci una partita per ottenere il bonus.',
    reward: 200,
  },
];

const EarnScreen: React.FC = () => {
  const { credits, adjustCredits } = useCredits();
  const [claimed, setClaimed] = useState<Record<string, boolean>>({});
  const [processing, setProcessing] = useState<string | null>(null);

  const availableCredits = credits ?? 0;

  const orderedMissions = useMemo(
    () => [...DAILY_MISSIONS].sort((a, b) => a.reward - b.reward),
    [],
  );

  const handleClaim = async (mission: Mission) => {
    if (processing || claimed[mission.id]) {
      return;
    }

    setProcessing(mission.id);
    try {
      await adjustCredits(mission.reward);
      setClaimed(prev => ({ ...prev, [mission.id]: true }));
      Alert.alert('Ricompensa riscossa', `Hai ottenuto ${mission.reward} crediti!`);
    } catch (error) {
      Alert.alert('Errore', 'Non è stato possibile assegnare la ricompensa. Riprova più tardi.');
    } finally {
      setProcessing(null);
    }
  };

  const renderMission = ({ item }: { item: Mission }) => {
    const isClaimed = claimed[item.id];
    const disabled = processing !== null && processing !== item.id;

    return (
      <View style={styles.missionCard}>
        <View style={styles.missionHeader}>
          <Text style={styles.missionTitle}>{item.title}</Text>
          <Text style={styles.missionReward}>+{item.reward} crediti</Text>
        </View>
        <Text style={styles.missionDescription}>{item.description}</Text>

        <TouchableOpacity
          style={[
            styles.claimButton,
            (isClaimed || disabled) && styles.claimButtonDisabled,
          ]}
          onPress={() => handleClaim(item)}
          disabled={isClaimed || disabled}
        >
          <Text style={styles.claimLabel}>
            {isClaimed ? 'Riscossa' : processing === item.id ? 'Assegno...' : 'Riscatta'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <TopStatusBar />
      <Text style={styles.title}>Earn</Text>
      <Text style={styles.subtitle}>
        Completa missioni giornaliere per accumulare nuovi crediti da spendere nello shop.
      </Text>

      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Crediti attuali</Text>
        <Text style={styles.balanceValue}>{availableCredits}</Text>
      </View>

      <FlatList
        data={orderedMissions}
        keyExtractor={item => item.id}
        renderItem={renderMission}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

export default EarnScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    backgroundColor: '#0e0c0f',
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#00a028ff',
    marginTop: 12,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: '#e2e8f0',
    marginBottom: 24,
  },
  balanceCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderColor: '#00a028ff',
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
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
  missionCard: {
    backgroundColor: 'rgba(15, 15, 19, 0.85)',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.35)',
  },
  missionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  missionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f8fafc',
  },
  missionReward: {
    fontSize: 16,
    fontWeight: '600',
    color: '#34d399',
  },
  missionDescription: {
    fontSize: 14,
    color: '#cbd5f5',
    marginBottom: 18,
  },
  claimButton: {
    backgroundColor: '#22c55e',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  claimButtonDisabled: {
    backgroundColor: 'rgba(34, 197, 94, 0.35)',
  },
  claimLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0e0c0f',
  },
});
