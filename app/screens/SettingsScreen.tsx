import React, { ComponentProps, ReactNode, useCallback, useMemo, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';

import TopStatusBar from '../../components/ui/TopStatusBar';
import { useAuth } from '../../hooks/AuthProvider';
import { useCredits } from '../../hooks/CreditProvider';
import type { HomeTabParamList, MainStackParamList } from '../navigators/types';

type SettingsNav = StackNavigationProp<MainStackParamList, 'Settings'>;
type IoniconName = ComponentProps<typeof Ionicons>['name'];

type SettingRow = {
  label: string;
  icon: IoniconName;
  onPress: () => void;
  trailing?: ReactNode;
};

const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<SettingsNav>();
  const { username, credits, loading: creditsLoading, refreshCredits } = useCredits();
  const { logout } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const handleNavigate = useCallback(
    (route: keyof HomeTabParamList) => {
      navigation.navigate('Tabs', { screen: route });
    },
    [navigation],
  );

  const handleRefreshCredits = useCallback(async () => {
    if (refreshing) {
      return;
    }
    setRefreshing(true);
    try {
      await refreshCredits();
    } catch (error) {
      console.error('Failed to refresh credits', error);
      Alert.alert('Errore', 'Impossibile aggiornare i crediti. Riprova più tardi.');
    } finally {
      setRefreshing(false);
    }
  }, [refreshCredits, refreshing]);

  const handleLogout = useCallback(() => {
    Alert.alert(
      'Logout',
      'Sei sicuro di voler uscire?',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Esci',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              console.error('Logout failed', error);
              Alert.alert('Errore', 'Non è stato possibile effettuare il logout.');
            }
          },
        },
      ],
      { cancelable: true },
    );
  }, [logout]);

  const accountRows: SettingRow[] = useMemo(
    () => [
      {
        label: 'Vai alla collezione',
        icon: 'albums-outline',
        onPress: () => handleNavigate('Collection'),
      },
      {
        label: 'Vai allo shop',
        icon: 'basket-outline',
        onPress: () => handleNavigate('Shop'),
      },
      {
        label: 'Aggiorna crediti',
        icon: 'refresh-outline',
        onPress: handleRefreshCredits,
        trailing: refreshing || creditsLoading ? (
          <ActivityIndicator size="small" color="#00a028ff" />
        ) : undefined,
      },
    ],
    [handleNavigate, handleRefreshCredits, refreshing, creditsLoading],
  );

  return (
    <View style={styles.screen}>
      <TopStatusBar />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.heading}>Impostazioni</Text>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Account</Text>
          <View style={styles.accountCard}>
            <Text style={styles.accountName}>{username ?? 'Utente'}</Text>
            <Text style={styles.accountCredits}>
              Crediti:{' '}
              {creditsLoading ? '···' : typeof credits === 'number' ? credits : '-'}
            </Text>
          </View>
          <View style={styles.rows}>
            {accountRows.map(row => (
              <TouchableOpacity
                key={row.label}
                style={styles.row}
                activeOpacity={0.85}
                onPress={row.onPress}
              >
                <View style={styles.rowLeft}>
                  <Ionicons name={row.icon} size={20} color="#00a028ff" />
                  <Text style={styles.rowLabel}>{row.label}</Text>
                </View>
                <View style={styles.rowRight}>
                  {row.trailing}
                  {!row.trailing ? (
                    <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
                  ) : null}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Sicurezza</Text>
          <TouchableOpacity
            style={[styles.row, styles.logoutRow]}
            activeOpacity={0.85}
            onPress={handleLogout}
          >
            <View style={styles.rowLeft}>
              <Ionicons name="exit-outline" size={20} color="#ff5c5c" />
              <Text style={[styles.rowLabel, styles.logoutLabel]}>Esci dall'account</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Supporto</Text>
          <Text style={styles.infoText}>
            Hai bisogno di aiuto? Inviaci un messaggio e ti risponderemo il prima possibile.
          </Text>
          <TouchableOpacity
            style={styles.secondaryButton}
            activeOpacity={0.85}
            onPress={() =>
              Alert.alert(
                'Supporto',
                'Invia una mail a support@cartecalcio.app con la tua richiesta.',
              )
            }
          >
            <Text style={styles.secondaryButtonLabel}>Contatta il supporto</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

export default SettingsScreen;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0e0c0f',
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  scrollContent: {
    paddingBottom: 28,
    gap: 24,
  },
  heading: {
    fontSize: 28,
    fontWeight: '800',
    color: '#00a028ff',
    marginTop: 4,
  },
  section: {
    backgroundColor: 'rgba(15, 15, 19, 0.72)',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(0, 160, 40, 0.25)',
    gap: 14,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#94a3b8',
    textTransform: 'uppercase',
  },
  accountCard: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 160, 40, 0.25)',
    backgroundColor: 'rgba(15, 42, 24, 0.45)',
    gap: 6,
  },
  accountName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f8fafc',
  },
  accountCredits: {
    fontSize: 15,
    color: '#debd43ff',
  },
  rows: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(14, 12, 15, 0.6)',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#f8fafc',
  },
  logoutRow: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 92, 92, 0.4)',
    backgroundColor: 'rgba(70, 16, 16, 0.45)',
  },
  logoutLabel: {
    color: '#ff9b9b',
  },
  infoText: {
    fontSize: 14,
    color: '#cbd5f5',
    lineHeight: 20,
  },
  secondaryButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#00a028ff',
  },
  secondaryButtonLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#00a028ff',
  },
});
