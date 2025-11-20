import React, { ComponentProps, ReactNode, useCallback, useMemo, useState } from 'react';
import { Alert, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { CommonActions, useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';

import { useAuth } from '../../hooks/AuthProvider';
import { useCredits } from '../../hooks/CreditProvider';
import { useAchievements } from '../../hooks/AchievementProvider';
import { useExchangeNotifications } from '../../hooks/useExchangeNotifications';
import { rootNavigationRef } from '../../app/navigators/navigationRef';
import type { MainStackParamList } from '../../app/navigators/types';

const coinSource = require('../../assets/images/Coin.png');
const STATUS_BAR_GRADIENT = ['rgba(0, 10, 7, 0.78)', 'rgba(1, 6, 4, 0.78)'] as const;

type IoniconName = ComponentProps<typeof Ionicons>['name'];

type QuickSettingRow = {
  label: string;
  icon: IoniconName;
  onPress: () => void;
  trailing?: ReactNode;
  destructive?: boolean;
};

interface TopStatusBarProps {
  edgePadding?: number;
}

const TopStatusBar: React.FC<TopStatusBarProps> = ({ edgePadding = 24 }) => {
  const { accessToken, logout } = useAuth();
  const { credits, username } = useCredits();
  const { achievements, loading: achievementsLoading } = useAchievements();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<StackNavigationProp<MainStackParamList>>();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pushNotificationsEnabled, setPushNotificationsEnabled] = useState(true);
  const [dataSaverEnabled, setDataSaverEnabled] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);
  const [languagePreview, setLanguagePreview] = useState<'it' | 'en'>('it');

  const {
    notifications: exchangeNotifications,
    loading: exchangeNotificationsLoading,
    markNotificationsRead,
  } = useExchangeNotifications();

  type NotificationItem =
    | {
        key: string;
        type: 'achievement';
        title: string;
        description: string;
        achievementId: string;
      }
    | {
        key: string;
        type: 'exchange';
        title: string;
        description: string;
        exchangeId: string;
      };

  const achievementNotifications = useMemo<NotificationItem[]>(
    () =>
      achievements
        .filter(achievement => achievement.completed && !achievement.claimed)
        .map(achievement => ({
          key: `achievement-${achievement.id}`,
          type: 'achievement' as const,
          title: achievement.title,
          description: `${achievement.description} | +${achievement.rewardCredits} crediti`,
          achievementId: achievement.id,
        })),
    [achievements],
  );

  const exchangeNotificationItems = useMemo<NotificationItem[]>(
    () =>
      exchangeNotifications.map(notification => ({
        key: `exchange-${notification.id}`,
        type: 'exchange' as const,
        title: notification.title,
        description: notification.message,
        exchangeId: notification.id,
      })),
    [exchangeNotifications],
  );

  const combinedNotifications = useMemo(
    () => [...achievementNotifications, ...exchangeNotificationItems],
    [achievementNotifications, exchangeNotificationItems],
  );

  const notificationCount = combinedNotifications.length;
  const displayedNotifications = combinedNotifications.slice(0, 4);
  const extraNotifications = Math.max(0, notificationCount - displayedNotifications.length);

  const handleToggleNotifications = useCallback(() => {
    setNotificationsOpen(prev => {
      const next = !prev;
      if (next) {
        setSettingsOpen(false);
      }
      return next;
    });
  }, []);

  const handleToggleSettings = useCallback(() => {
    setSettingsOpen(prev => {
      const next = !prev;
      if (next) {
        setNotificationsOpen(false);
      }
      return next;
    });
  }, []);

  const handleSupport = useCallback(() => {
    setSettingsOpen(false);
    Alert.alert('Supporto', 'Invia una mail a support@cartecalcio.app con la tua richiesta.');
  }, []);

  const handleLogout = useCallback(() => {
    setSettingsOpen(false);
    Alert.alert(
      'Logout',
      'Sei sicuro di voler uscire?',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Esci',
          style: 'destructive',
          onPress: () => {
            logout().catch(error => {
              console.error('Logout failed', error);
              Alert.alert('Errore', 'Non e stato possibile effettuare il logout.');
            });
          },
        },
      ],
      { cancelable: true },
    );
  }, [logout]);

  const handleNotificationPress = useCallback(
    (achievementId: string) => {
      setNotificationsOpen(false);
      setSettingsOpen(false);

      let currentNavigator: any = navigation;
      while (currentNavigator) {
        const state = currentNavigator.getState?.();
        const routeNames: string[] | undefined = state?.routeNames;
        if (routeNames?.includes('Achievement')) {
          currentNavigator.navigate('Achievement', { focusAchievementId: achievementId });
          return;
        }
        currentNavigator = currentNavigator.getParent?.();
      }

      if (rootNavigationRef.isReady()) {
        rootNavigationRef.dispatch(
          CommonActions.navigate({
            name: 'Achievement',
            params: { focusAchievementId: achievementId },
            merge: true,
          }),
        );
      } else {
        console.warn('Navigation not ready yet, cannot open Achievement screen.');
      }
    },
    [navigation],
  );

  const handleExchangeNotificationPress = useCallback(
    (notificationId: string) => {
      markNotificationsRead([notificationId]).catch(error => {
        console.error('Unable to acknowledge exchange notification', error);
      });
      setNotificationsOpen(false);
      setSettingsOpen(false);

      let currentNavigator: any = navigation;
      while (currentNavigator) {
        const state = currentNavigator.getState?.();
        const routeNames: string[] | undefined = state?.routeNames;
        if (routeNames?.includes('Exchange')) {
          currentNavigator.navigate('Exchange');
          return;
        }
        currentNavigator = currentNavigator.getParent?.();
      }

      if (rootNavigationRef.isReady()) {
        rootNavigationRef.dispatch(
          CommonActions.navigate({
            name: 'Exchange',
            merge: true,
          }),
        );
      } else {
        console.warn('Navigation not ready yet, cannot open Exchange screen.');
      }
    },
    [markNotificationsRead, navigation],
  );

  const togglePushNotificationsSetting = useCallback(() => {
    setPushNotificationsEnabled(prev => {
      const next = !prev;
      Alert.alert(
        'Notifiche',
        next ? 'Notifiche push abilitate.' : 'Notifiche push disattivate.',
      );
      return next;
    });
  }, []);

  const toggleDataSaverSetting = useCallback(() => {
    setDataSaverEnabled(prev => !prev);
  }, []);

  const toggleAnalyticsSetting = useCallback(() => {
    setAnalyticsEnabled(prev => {
      const next = !prev;
      Alert.alert(
        'Analisi utilizzo',
        next ? 'Condivisione dati anonimi attivata.' : 'Condivisione dati anonimi disattivata.',
      );
      return next;
    });
  }, []);

  const handleLanguageSetting = useCallback(() => {
    setLanguagePreview(prev => {
      const next = prev === 'it' ? 'en' : 'it';
      Alert.alert(
        'Lingua',
        `Lingua impostata su ${next.toUpperCase()}. Le traduzioni verranno applicate in seguito.`,
      );
      return next;
    });
  }, []);

  const handlePrivacySetting = useCallback(() => {
    Alert.alert(
      'Privacy',
      'Gestione avanzata della privacy disponibile a breve. Nel frattempo consulta i termini su cartecalcio.app/privacy.',
    );
  }, []);

  const renderTogglePill = useCallback(
    (enabled: boolean, activeLabel = 'Attive', inactiveLabel = 'Spente') => (
      <View style={[styles.togglePill, enabled && styles.togglePillActive]}>
        <Text style={styles.togglePillLabel}>{enabled ? activeLabel : inactiveLabel}</Text>
      </View>
    ),
    [],
  );

  const quickSettings = useMemo<QuickSettingRow[]>(
    () => [
      {
        label: 'Consenti notifiche',
        icon: 'notifications-circle-outline',
        onPress: togglePushNotificationsSetting,
        trailing: renderTogglePill(pushNotificationsEnabled),
      },
      {
        label: "Lingua dell'app",
        icon: 'globe-outline',
        onPress: handleLanguageSetting,
        trailing: (
          <View style={styles.languageBadge}>
            <Text style={styles.languageBadgeText}>{languagePreview.toUpperCase()}</Text>
          </View>
        ),
      },
      {
        label: 'Preferenze privacy',
        icon: 'shield-checkmark-outline',
        onPress: handlePrivacySetting,
      },
      {
        label: 'Logout',
        icon: 'exit-outline',
        onPress: handleLogout,
        destructive: true,
      },
    ],
    [
      analyticsEnabled,
      dataSaverEnabled,
      handleLanguageSetting,
      handleLogout,
      handlePrivacySetting,
      pushNotificationsEnabled,
      renderTogglePill,
      toggleAnalyticsSetting,
      toggleDataSaverSetting,
      togglePushNotificationsSetting,
      languagePreview,
    ],
  );

  if (!accessToken || !username) {
    return null;
  }

  return (
    <View
      style={[
        styles.wrapper,
        {
          paddingTop: insets.top + 4,
          paddingHorizontal: edgePadding,
        },
      ]}
    >
      <TouchableOpacity
        accessibilityLabel="Apri notifiche"
        accessibilityHint="Mostra le notifiche disponibili"
        onPress={handleToggleNotifications}
        activeOpacity={0.9}
        style={[styles.iconButton, styles.iconButtonLeft, notificationsOpen && styles.iconButtonActive]}
      >
        <LinearGradient
          colors={STATUS_BAR_GRADIENT}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.iconButtonBackground}
        />
        <View
          pointerEvents="none"
          style={[
            styles.iconButtonHighlight,
            notificationsOpen && styles.iconButtonHighlightActive,
          ]}
        />
        <Ionicons
          name={notificationsOpen ? 'notifications' : 'notifications-outline'}
          size={26}
          color={notificationsOpen ? '#00a028ff' : '#85cbb1'}
        />
        {notificationCount > 0 && (
          <View style={styles.notificationBadge}>
            <Text style={styles.notificationBadgeText}>
              {notificationCount > 9 ? '9+' : notificationCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      <LinearGradient
        colors={STATUS_BAR_GRADIENT}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.container}
      >
        <Text numberOfLines={1} style={styles.username}>
          {username}
        </Text>
        <View style={styles.creditContainer}>
          <Image source={coinSource} style={styles.coin} resizeMode='contain' />
          <Text style={styles.creditValue}>{credits ?? 0}</Text>
        </View>
      </LinearGradient>

      <TouchableOpacity
        accessibilityLabel="Apri impostazioni"
        accessibilityHint="Mostra il menu impostazioni"
        onPress={handleToggleSettings}
        activeOpacity={0.9}
        style={[styles.iconButton, styles.iconButtonRight, settingsOpen && styles.iconButtonActive]}
      >
        <LinearGradient
          colors={STATUS_BAR_GRADIENT}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.iconButtonBackground}
        />
        <View
          pointerEvents="none"
          style={[
            styles.iconButtonHighlight,
            settingsOpen && styles.iconButtonHighlightActive,
          ]}
        />
        <Ionicons
          name={settingsOpen ? 'settings' : 'settings-outline'}
          size={26}
          color={settingsOpen ? '#00a028ff' : '#85cbb1'}
        />
      </TouchableOpacity>

      {notificationsOpen && (
        <View style={[styles.notificationsDropdown, { top: insets.top + 56 }]}>
          <Text style={styles.dropdownTitle}>Notifiche</Text>
          {achievementsLoading || exchangeNotificationsLoading ? (
            <Text style={styles.dropdownEmpty}>Caricamento notifiche...</Text>
          ) : (
            <>
              {displayedNotifications.length === 0 ? (
                <Text style={styles.dropdownEmpty}>Nessuna notifica al momento</Text>
              ) : (
                displayedNotifications.map(notification => {
                  const onPress =
                    notification.type === 'achievement'
                      ? () => handleNotificationPress(notification.achievementId)
                      : () => handleExchangeNotificationPress(notification.exchangeId);
                  return (
                    <TouchableOpacity
                      key={notification.key}
                      activeOpacity={0.85}
                      style={styles.notificationItem}
                      onPress={onPress}
                      accessibilityRole="button"
                      accessibilityLabel={notification.title}
                    >
                      <Text style={styles.notificationTitle}>{notification.title}</Text>
                      <Text style={styles.notificationDescription}>{notification.description}</Text>
                    </TouchableOpacity>
                  );
                })
              )}
              {extraNotifications > 0 && (
                <Text style={styles.dropdownFooter}>
                  +{extraNotifications} altre notifiche disponibili
                </Text>
              )}
            </>
          )}
        </View>
      )}

      {settingsOpen && (
        <View style={[styles.settingsDropdown, { top: insets.top + 56 }]}>
          <Text style={styles.dropdownTitle}>Impostazioni rapide</Text>
          <View style={styles.settingsAccountCard}>
            <Text style={styles.settingsAccountName}>{username}</Text>
          </View>
          <View style={styles.settingsRows}>
            {quickSettings.map(row => (
              <TouchableOpacity
                key={row.label}
                activeOpacity={0.85}
                style={[styles.settingsRow, row.destructive && styles.settingsRowDanger]}
                onPress={row.onPress}
              >
                <View style={styles.settingsRowLeft}>
                  <Ionicons
                    name={row.icon}
                    size={18}
                    color={row.destructive ? '#ff5c5c' : '#00a028ff'}
                  />
                  <Text
                    style={[
                      styles.settingsRowLabel,
                      row.destructive && styles.settingsRowLabelDanger,
                    ]}
                  >
                    {row.label}
                  </Text>
                </View>
                <View style={styles.settingsRowRight}>
                  {row.trailing}
                  {!row.destructive && (
                    <Ionicons name='chevron-forward' size={16} color='#85cbb1' />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.settingsInfoText}>
            Hai bisogno di aiuto? Il nostro team risponde via email.
          </Text>
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.settingsSecondaryButton}
            onPress={handleSupport}
          >
            <Text style={styles.settingsSecondaryButtonLabel}>Contatta il supporto</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 0,
    width: '100%',
    alignSelf: 'stretch',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    position: 'relative',
  },
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 99,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: 8,
  },
  username: {
    fontSize: 16,
    fontWeight: '800',
    color: '#00a028ff',
    maxWidth: '90%',
    flexShrink: 1,
  },
  creditContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  coin: {
    width: 22,
    height: 22,
    marginRight: 2,
  },
  creditValue: {
    fontSize: 17,
    fontWeight: '700',
    color: '#debd43ff',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 99,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  iconButtonActive: {
    shadowColor: '#00a028ff',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 3,
  },
  iconButtonBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  iconButtonHighlight: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  iconButtonHighlightActive: {
    backgroundColor: 'rgba(0, 255, 176, 0.16)',
  },
  iconButtonLeft: {
    marginLeft: -10,
  },
  iconButtonRight: {
    marginRight: -10,
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#ff5c5c',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  notificationBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  notificationsDropdown: {
    position: 'absolute',
    left: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    zIndex: 20,
  },
  dropdownTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  dropdownEmpty: {
    color: '#94a3b8',
    fontSize: 13,
  },
  notificationItem: {
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  notificationTitle: {
    color: '#00a028ff',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  notificationDescription: {
    color: '#e2e8f0',
    fontSize: 12,
  },
  dropdownFooter: {
    marginTop: 10,
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  languageBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(0, 160, 40, 0.18)',
  },
  languageBadgeText: {
    color: '#00d25fff',
    fontSize: 12,
    fontWeight: '700',
  },
  settingsDropdown: {
    position: 'absolute',
    left: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0, 160, 40, 0.4)',
    zIndex: 30,
    gap: 12,
  },
  settingsAccountCard: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 160, 40, 0.25)',
    backgroundColor: 'rgba(7, 28, 16, 0.55)',
    gap: 4,
  },
  settingsAccountName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f8fafc',
  },
  settingsRows: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(14, 12, 15, 0.6)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  settingsRowDanger: {
    backgroundColor: 'rgba(70, 16, 16, 0.45)',
    borderBottomColor: 'rgba(255, 92, 92, 0.25)',
  },
  settingsRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  settingsRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  settingsRowLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f8fafc',
  },
  settingsRowLabelDanger: {
    color: '#ff9b9b',
  },
  togglePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  togglePillActive: {
    backgroundColor: 'rgba(0, 160, 40, 0.2)',
    borderColor: '#00a028ff',
  },
  togglePillLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#f8fafc',
  },
  settingsInfoText: {
    fontSize: 12,
    color: '#cbd5f5',
    lineHeight: 18,
  },
  settingsSecondaryButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#00a028ff',
  },
  settingsSecondaryButtonLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#00a028ff',
  },
});

export default TopStatusBar;
