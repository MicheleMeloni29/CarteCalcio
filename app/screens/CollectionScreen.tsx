import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, View, Modal, TouchableOpacity, Text, ScrollView, ImageBackground } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';

import { API_BASE_URL } from '../../constants/api';
import Card from '../../components/ui/Card'; // Componente Card personalizzato
import TopStatusBar from '../../components/ui/TopStatusBar';
import { useAuth } from '../../hooks/AuthProvider';
import type { MainStackParamList } from '../navigators/MainStackNavigator';

// Definizione dell'interfaccia per il tipo di carta 
interface CardType {
  id: number;
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
  image_url?: string;
  rarityColor: 'common' | 'rare' | 'epic' | 'legendary';
}

type DropdownKey = 'team' | 'rarity' | 'type';

const normalizeRarity = (value: unknown): CardType['rarityColor'] => {
  if (typeof value !== 'string') {
    return 'common';
  }
  const lowered = value.toLowerCase();
  if (lowered === 'rare' || lowered === 'epic' || lowered === 'legendary') {
    return lowered as CardType['rarityColor'];
  }
  return 'common';
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

export default function CollectionScreen() {
  const navigation = useNavigation<StackNavigationProp<MainStackParamList, 'Collection'>>();
  const { accessToken, refreshAccessToken } = useAuth();
  const [cards, setCards] = useState<CardType[]>([]);
  const [selectedCard, setSelectedCard] = useState<CardType | null>(null); // Stato per la carta selezionata
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [selectedRarity, setSelectedRarity] = useState<CardType['rarityColor'] | null>(null);
  const [selectedType, setSelectedType] = useState<CardType['type'] | null>(null);
  const [activeDropdown, setActiveDropdown] = useState<DropdownKey | null>(null);
  const typeLabels: Record<CardType['type'], string> = {
    player: 'Giocatori',
    coach: 'Allenatori',
    bonusMalus: 'Bonus/Malus',
  };

  const callWithAuth = useCallback(
    async (request: (token: string) => Promise<Response>) => {
      const attempt = async (
        token: string | null,
        allowRefresh: boolean,
      ): Promise<Response> => {
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

  const fetchCards = useCallback(async () => {
    try {
      const response = await callWithAuth(token =>
        fetch(`${API_BASE_URL}/api/packs/collection/`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch collection (${response.status})`);
      }

      const data = await response.json();

      const playerCards: CardType[] = (Array.isArray(data?.player_cards)
        ? data.player_cards
        : []
      ).map((raw: any, index: number) => ({
        id: coerceId(raw?.id, index + 1),
        type: 'player',
        name: typeof raw?.name === 'string' ? raw.name : 'Carta',
        team: typeof raw?.team === 'string' ? raw.team : undefined,
        attack: parseOptionalNumber(raw?.attack),
        defense: parseOptionalNumber(raw?.defense),
        abilities:
          typeof raw?.abilities === 'string' ? raw.abilities : undefined,
        effect: undefined,
        duration: undefined,
        attackBonus: undefined,
        defenseBonus: undefined,
        image_url:
          typeof raw?.image_url === 'string' ? raw.image_url : undefined,
        rarityColor: normalizeRarity(raw?.rarity),
      }));

      const coachCards: CardType[] = (Array.isArray(data?.coach_cards)
        ? data.coach_cards
        : []
      ).map((raw: any, index: number) => ({
        id: coerceId(raw?.id, index + 1000),
        type: 'coach',
        name: typeof raw?.name === 'string' ? raw.name : 'Allenatore',
        team: typeof raw?.team === 'string' ? raw.team : undefined,
        attack: undefined,
        defense: undefined,
        abilities: undefined,
        effect: undefined,
        duration: undefined,
        attackBonus: parseOptionalNumber(raw?.attack_bonus),
        defenseBonus: parseOptionalNumber(raw?.defense_bonus),
        image_url:
          typeof raw?.image_url === 'string' ? raw.image_url : undefined,
        rarityColor: normalizeRarity(raw?.rarity),
      }));

      const bonusCards: CardType[] = (Array.isArray(data?.bonus_malus_cards)
        ? data.bonus_malus_cards
        : []
      ).map((raw: any, index: number) => ({
        id: coerceId(raw?.id, index + 2000),
        type: 'bonusMalus',
        name: typeof raw?.name === 'string' ? raw.name : 'Bonus/Malus',
        team: undefined,
        attack: undefined,
        defense: undefined,
        abilities: undefined,
        effect: typeof raw?.effect === 'string' ? raw.effect : undefined,
        duration: parseOptionalNumber(raw?.duration),
        attackBonus: undefined,
        defenseBonus: undefined,
        image_url:
          typeof raw?.image_url === 'string' ? raw.image_url : undefined,
        rarityColor: normalizeRarity(raw?.rarity),
      }));

      setCards([...playerCards, ...coachCards, ...bonusCards]);
    } catch (error) {
      console.error('Errore nel recupero della collezione:', error);
      setCards([]);
    }
  }, [callWithAuth]);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  const teamOptions = useMemo(() => {
    const teams = new Set<string>();
    cards.forEach(card => {
      if (card.team) {
        teams.add(card.team);
      }
    });
    return Array.from(teams).sort((a, b) => a.localeCompare(b));
  }, [cards]);

  const rarityOptions = useMemo(() => {
    const rarities = new Set<CardType['rarityColor']>();
    cards.forEach(card => {
      if (card.rarityColor) {
        rarities.add(card.rarityColor);
      }
    });
    const order: CardType['rarityColor'][] = ['common', 'rare', 'epic', 'legendary'];
    return Array.from(rarities).sort(
      (a, b) => order.indexOf(a) - order.indexOf(b),
    );
  }, [cards]);

  const typeOptions = useMemo(() => {
    const types = new Set<CardType['type']>();
    cards.forEach(card => types.add(card.type));
    const order: CardType['type'][] = ['player', 'coach', 'bonusMalus'];
    return Array.from(types).sort(
      (a, b) => order.indexOf(a) - order.indexOf(b),
    );
  }, [cards]);

  const filteredCards = useMemo(() => {
    return cards.filter(card => {
      if (selectedTeam && card.team !== selectedTeam) {
        return false;
      }
      if (selectedRarity && card.rarityColor !== selectedRarity) {
        return false;
      }
      if (selectedType && card.type !== selectedType) {
        return false;
      }
      return true;
    });
  }, [cards, selectedTeam, selectedRarity, selectedType]);

  const handleExit = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Home');
    }
  }, [navigation]);

  const formatRarityLabel = (rarity: CardType['rarityColor']) =>
    rarity.charAt(0).toUpperCase() + rarity.slice(1);

  const dropdownOptions = useMemo(
    () => ({
      team: teamOptions,
      rarity: rarityOptions,
      type: typeOptions,
    }),
    [teamOptions, rarityOptions, typeOptions],
  );

  const dropdownDefinitions = useMemo(
    () => [
      { key: 'team' as const, label: 'Team' },
      { key: 'rarity' as const, label: 'Rarity' },
      { key: 'type' as const, label: 'Type' },
    ],
    [],
  );

  const formatTypeLabel = (cardType: CardType['type']) =>
    typeLabels[cardType];

  const formatOptionLabel = (key: DropdownKey, value: string) => {
    if (key === 'rarity') {
      return formatRarityLabel(value as CardType['rarityColor']);
    }
    if (key === 'type') {
      return formatTypeLabel(value as CardType['type']);
    }
    return value;
  };

  const toggleDropdown = (key: DropdownKey) => {
    setActiveDropdown(prev => (prev === key ? null : key));
  };

  const handleDropdownSelect = (key: DropdownKey, value: string | null) => {
    switch (key) {
      case 'team':
        setSelectedTeam(value);
        break;
      case 'rarity':
        setSelectedRarity(value as CardType['rarityColor'] | null);
        break;
      case 'type':
        setSelectedType(value as CardType['type'] | null);
        break;
      default:
        break;
    }
    setActiveDropdown(null);
  };

  const getSelectedLabel = (key: DropdownKey) => {
    switch (key) {
      case 'team':
        return selectedTeam ?? 'All';
      case 'rarity':
        return selectedRarity
          ? formatRarityLabel(selectedRarity)
          : 'All';
      case 'type':
        return selectedType ? formatTypeLabel(selectedType) : 'All';
      default:
        return 'All';
    }
  };

  const isOptionSelected = (key: DropdownKey, value: string | null) => {
    switch (key) {
      case 'team':
        return selectedTeam === value;
      case 'rarity':
        return selectedRarity === value;
      case 'type':
        return selectedType === value;
      default:
        return false;
    }
  };

  const hasSelectedValue = (key: DropdownKey) => {
    switch (key) {
      case 'team':
        return selectedTeam !== null;
      case 'rarity':
        return selectedRarity !== null;
      case 'type':
        return selectedType !== null;
      default:
        return false;
    }
  };

  const renderCard = ({ item }: { item: CardType }) => {
    const imageSource = item.image_url
      ? { uri: item.image_url }
      : require('../../assets/images/Backgrounds/CollectionBackground.jpg');

    return (
      <TouchableOpacity onPress={() => setSelectedCard(item)}>
        <Card
          size="small"
          type={item.type}
          name={item.name}
          team={item.team}
          attack={item.attack}
          defense={item.defense}
          abilities={item.abilities}
          effect={item.effect}
          duration={item.duration}
          attackBonus={item.attackBonus}
          defenseBonus={item.defenseBonus}
          image={imageSource}
          rarity={item.rarityColor}
        />
      </TouchableOpacity>
    );
  };


  return (
    <ImageBackground
      source={require('../../assets/images/Backgrounds/CollectionBackground.jpg')}
      style={styles.background}
      imageStyle={styles.backgroundImage}
    >
      <View style={styles.container}>
        <TopStatusBar />
        <View style={styles.filtersContainer}>
          <View style={styles.filtersRow}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleExit}
              activeOpacity={0.85}
            >
              <Ionicons
                name="arrow-back"
                size={26}
                color="#00a028ff"
                style={{ marginRight: 6 }}
              />
            </TouchableOpacity>
            <View style={styles.dropdownRow}>
              {dropdownDefinitions.map(({ key, label }) => {
                const isOpen = activeDropdown === key;
                const hasValue = hasSelectedValue(key);
                const options = dropdownOptions[key] ?? [];

                return (
                  <View
                    key={key}
                    style={[
                      styles.dropdownWrapper,
                      isOpen && styles.dropdownWrapperActive,
                    ]}
                  >
                    <TouchableOpacity
                      style={[
                        styles.dropdownTrigger,
                        (isOpen || hasValue) && styles.dropdownTriggerActive,
                      ]}
                      activeOpacity={0.85}
                      onPress={() => toggleDropdown(key)}
                    >
                      <Text style={styles.dropdownLabel}>{label}</Text>
                      <Text style={styles.dropdownValue} numberOfLines={1}>
                        {getSelectedLabel(key)}
                      </Text>
                      <Ionicons
                        name={isOpen ? 'chevron-up' : 'chevron-down'}
                        size={16}
                        color={isOpen ? '#00751c' : '#1f2933'}
                      />
                    </TouchableOpacity>

                    {isOpen && (
                      <View style={styles.dropdownMenu}>
                        <ScrollView
                          nestedScrollEnabled
                          showsVerticalScrollIndicator={false}
                        >
                          <TouchableOpacity
                            style={[
                              styles.dropdownOption,
                              isOptionSelected(key, null) &&
                              styles.dropdownOptionActive,
                              options.length === 0 && styles.dropdownOptionLast,
                            ]}
                            onPress={() => handleDropdownSelect(key, null)}
                          >
                            <Text
                              style={[
                                styles.dropdownOptionText,
                                isOptionSelected(key, null) &&
                                styles.dropdownOptionTextActive,
                              ]}
                            >
                              Tutte
                            </Text>
                            {isOptionSelected(key, null) && (
                              <Ionicons
                                name="checkmark"
                                size={16}
                                color="#00ff3cff"
                              />
                            )}
                          </TouchableOpacity>

                          {options.map((option, index) => {
                            const isSelected = isOptionSelected(key, option);
                            const isLast = index === options.length - 1;

                            return (
                              <TouchableOpacity
                                key={`${key}-${option}`}
                                style={[
                                  styles.dropdownOption,
                                  isSelected && styles.dropdownOptionActive,
                                  isLast && styles.dropdownOptionLast,
                                ]}
                                onPress={() => handleDropdownSelect(key, option)}
                              >
                                <Text
                                  style={[
                                    styles.dropdownOptionText,
                                    isSelected && styles.dropdownOptionTextActive,
                                  ]}
                                >
                                  {formatOptionLabel(key, option)}
                                </Text>
                                {isSelected && (
                                  <Ionicons
                                    name="checkmark"
                                    size={16}
                                    color="#00751c"
                                  />
                                )}
                              </TouchableOpacity>
                            );
                          })}
                        </ScrollView>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        </View>
        <FlatList
          data={filteredCards}
          keyExtractor={(item, index) => `${item.type}-${item.id}-${index}`}
          renderItem={renderCard}
          numColumns={4}
          contentContainerStyle={[
            styles.grid,
            filteredCards.length === 0 && styles.gridEmpty,
          ]}
          onScrollBeginDrag={() => {
            if (activeDropdown) {
              setActiveDropdown(null);
            }
          }}
          ListEmptyComponent={
            <Text style={styles.emptyMessage}>
              Nessuna carta trovata con i filtri selezionati.
            </Text>
          }
        />

        {selectedCard && (
          <Modal transparent={true} animationType="fade" visible={!!selectedCard}>
            <View style={styles.modalContainer}>
              <Card
                size="large"
                type={selectedCard.type}
                name={selectedCard.name}
                team={selectedCard.team}
                attack={selectedCard.attack}
                defense={selectedCard.defense}
                abilities={selectedCard.abilities}
                effect={selectedCard.effect}
                duration={selectedCard.duration}
                attackBonus={selectedCard.attackBonus}
                defenseBonus={selectedCard.defenseBonus}
                image={{ uri: selectedCard.image_url }}
                rarity={selectedCard.rarityColor} // Passa il colore della rarità come prop "rarity"
              />
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setSelectedCard(null)}
              >
                <Text style={styles.closeButtonText}>Chiudi</Text>
              </TouchableOpacity>
            </View>
          </Modal>
        )}
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  backgroundImage: {
  },
  container: {
    flex: 1,
    backgroundColor: 'rgba(14, 12, 15, 0.25)',
    paddingBottom: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  exitLabel: {
    color: '#00a028ff',
    fontSize: 16,
    fontWeight: '700',
  },
  filtersContainer: {
    paddingVertical: 16,
    zIndex: 10,
    marginBottom: 12,
  },
  filtersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 12,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 15, 19, 0.65)',
    borderColor: 'rgba(0, 160, 40, 1)',
    borderWidth: 2,
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
    minHeight: 40,
  },
  backLabel: {
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '600',
    color: '#00a028ff',
  },
  dropdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 12,
    flex: 1,
  },
  dropdownWrapper: {
    flex: 1,
    minWidth: 0,
    position: 'relative',
    borderRadius: 14,
    borderColor: 'rgba(0, 160, 40, 1)',
    borderWidth: 2,
  },
  dropdownWrapperActive: {
    zIndex: 25,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    minHeight: 40,
    backgroundColor: 'rgba(15, 15, 19, 0.65)',
  },
  dropdownTriggerActive: {
    borderColor: '#00a028ff',
    backgroundColor: 'rgba(168, 176, 170, 0.19)',
  },
  dropdownLabel: {
    fontSize: 17,
    fontWeight: '600',
    color: '#00a028ff',
    marginBottom: 2,
  },
  dropdownValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#00a028ff',
    marginRight: 8,
  },
  dropdownMenu: {
    position: 'absolute',
    top: '100%',
    left: -10,
    right: -10,
    marginTop: 6,
    backgroundColor: 'rgba(15, 15, 19, 0.65)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#00a028ff',
    maxHeight: 240,
    overflow: 'hidden',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 30,
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  dropdownOptionLast: {
    borderBottomWidth: 0,
  },
  dropdownOptionActive: {
    backgroundColor: 'rgba(0, 160, 40, 0.12)',
  },
  dropdownOptionText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2933',
    marginRight: 12,
  },
  dropdownOptionTextActive: {
    color: '#00751c',
  },
  grid: {
    paddingHorizontal: 22,
    paddingVertical: 22,
    alignItems: 'center',
  },
  list: {
    flex: 1,
  },
  gridEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyMessage: {
    fontSize: 16,
    color: '#4b5563',
    textAlign: 'center',
    paddingVertical: 40,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  closeButton: {
    marginTop: 20,
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 5,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
