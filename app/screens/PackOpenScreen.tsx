import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  FlatList,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';

import Card from '../../components/ui/Card';
import type {
  MainStackParamList,
  OpenedPackCard,
} from '../navigators/MainStackNavigator';

type PackOpenRouteProp = RouteProp<MainStackParamList, 'PackOpen'>;

const CARD_PLACEHOLDER = require('../../assets/images/Backgrounds/CollectionBackground.jpg');
const CARD_CAROUSEL_ITEM_WIDTH = 370;
const CARD_CAROUSEL_ITEM_SPACING = 1;
const CARD_CAROUSEL_LEAD_OFFSET = 90;
const CARD_CAROUSEL_SNAP_INTERVAL = CARD_CAROUSEL_ITEM_WIDTH + CARD_CAROUSEL_ITEM_SPACING;
const CARD_STACK_HEIGHT = 420;
const STACK_CARD_LAYER_OFFSET = 14;
const STACK_BASE_TOP = 64;

const PackOpenScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<MainStackParamList>>();
  const route = useRoute<PackOpenRouteProp>();
  const { packName, cards } = route.params;
  const { width: windowWidth } = useWindowDimensions();

  const cardData = useMemo(
    () => (Array.isArray(cards) ? cards : []) as OpenedPackCard[],
    [cards],
  );

  const [currentStackIndex, setCurrentStackIndex] = useState(0);
  const [isAnimatingStack, setIsAnimatingStack] = useState(false);
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  const { paddingStart, paddingEnd } = useMemo(() => {
    const basePadding = Math.max((windowWidth - CARD_CAROUSEL_ITEM_WIDTH) / 2, 0);
    return {
      paddingStart: Math.max(basePadding - CARD_CAROUSEL_LEAD_OFFSET, 0),
      paddingEnd: basePadding,
    };
  }, [windowWidth]);

  useEffect(() => {
    pan.stopAnimation();
    pan.setValue({ x: 0, y: 0 });
    setCurrentStackIndex(0);
    setIsAnimatingStack(false);
  }, [cardData, pan]);

  const remainingCards = useMemo(
    () => cardData.slice(currentStackIndex),
    [cardData, currentStackIndex],
  );

  const handleBackToShop = () => {
    navigation.navigate('Shop');
  };

  const handleGoToCollection = () => {
    navigation.navigate('Collection');
  };

  const renderCardContent = (item: OpenedPackCard) => {
    const normalizedType: 'player' | 'coach' | 'bonusMalus' =
      item.type === 'bonus' ? 'bonusMalus' : item.type === 'coach' ? 'coach' : 'player';
    const imageSource =
      typeof item.image_url === 'string' && item.image_url.length > 0
        ? { uri: item.image_url }
        : CARD_PLACEHOLDER;
    const rarity =
      item.rarity && ['common', 'rare', 'epic', 'legendary'].includes(item.rarity)
        ? (item.rarity as 'common' | 'rare' | 'epic' | 'legendary')
        : 'common';

    return (
      <Card
        size="medium"
        type={normalizedType}
        name={item.name}
        team={item.team ?? undefined}
        attack={item.attack ?? undefined}
        defense={item.defense ?? undefined}
        abilities={item.abilities ?? undefined}
        effect={item.effect ?? undefined}
        duration={item.duration ?? undefined}
        attackBonus={item.attack_bonus ?? undefined}
        defenseBonus={item.defense_bonus ?? undefined}
        image={imageSource}
        rarity={rarity}
      />
    );
  };

  const handleCompleteSwipe = useCallback(() => {
    if (isAnimatingStack || remainingCards.length === 0) {
      return;
    }

    setIsAnimatingStack(true);
    pan.stopAnimation();
    const exitDistance = windowWidth + CARD_CAROUSEL_ITEM_WIDTH + 48;
    Animated.parallel([
      Animated.timing(pan.x, {
        toValue: -exitDistance,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(pan.y, {
        toValue: 0,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      pan.setValue({ x: 0, y: 0 });
      setIsAnimatingStack(false);

      if (finished) {
        setCurrentStackIndex(prev => {
          const next = prev + 1;
          return next >= cardData.length ? cardData.length : next;
        });
      }
    });
  }, [
    cardData.length,
    isAnimatingStack,
    pan,
    remainingCards.length,
    windowWidth,
  ]);

  const panResponder = useMemo(() => {
    const canInteract = !isAnimatingStack && remainingCards.length > 0;

    return PanResponder.create({
      onStartShouldSetPanResponder: () => canInteract,
      onStartShouldSetPanResponderCapture: () => canInteract,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        if (!canInteract) {
          return false;
        }
        const { dx, dy } = gestureState;
        return Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 4;
      },
      onMoveShouldSetPanResponderCapture: (_, gestureState) => {
        if (!canInteract) {
          return false;
        }
        const { dx, dy } = gestureState;
        return Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 4;
      },
      onPanResponderMove: (_, gestureState) => {
        pan.setValue({
          x: gestureState.dx,
          y: gestureState.dy * 0.25,
        });
      },
      onPanResponderRelease: (_, gestureState) => {
        if (!canInteract) {
          return;
        }

        const shouldComplete =
          gestureState.dx <= -64 ||
          gestureState.vx <= -0.7 ||
          (gestureState.dx < -30 && gestureState.vx < -0.45);

        if (shouldComplete) {
          handleCompleteSwipe();
        } else {
          Animated.parallel([
            Animated.spring(pan.x, {
              toValue: 0,
              useNativeDriver: true,
            }),
            Animated.spring(pan.y, {
              toValue: 0,
              useNativeDriver: true,
            }),
          ]).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.parallel([
          Animated.spring(pan.x, {
            toValue: 0,
            useNativeDriver: true,
          }),
          Animated.spring(pan.y, {
            toValue: 0,
            useNativeDriver: true,
          }),
        ]).start();
      },
    });
  }, [handleCompleteSwipe, isAnimatingStack, pan, remainingCards.length]);

  const renderStackCard = (item: OpenedPackCard, index: number) => {
    const depth = index;
    const zIndex = remainingCards.length - index;
    const baseTop = STACK_BASE_TOP + depth * STACK_CARD_LAYER_OFFSET;

    if (index === 0) {
      const rotate = pan.x.interpolate({
        inputRange: [-240, 0, 240],
        outputRange: ['-8deg', '0deg', '8deg'],
      });

      return (
        <Animated.View
          key={`stack-${item.id ?? 'card'}-${currentStackIndex + index}`}
          style={[
            styles.stackCard,
            styles.stackCardTop,
            {
              top: baseTop,
              zIndex,
              transform: [
                { translateX: pan.x },
                { translateY: pan.y },
                { rotate },
              ],
            },
          ]}
          {...panResponder.panHandlers}
        >
          {renderCardContent(item)}
        </Animated.View>
      );
    }

    const scale = Math.max(0.9, 1 - depth * 0.035);
    const opacity = Math.max(0.35, 1 - depth * 0.12);

    return (
      <View
        key={`stack-${item.id ?? 'card'}-${currentStackIndex + index}`}
        style={[
          styles.stackCard,
          {
            top: baseTop,
            zIndex,
            transform: [{ scale }],
            opacity,
          },
        ]}
        pointerEvents="none"
      >
        {renderCardContent(item)}
      </View>
    );
  };

  const renderCarouselItem = ({ item, index }: { item: OpenedPackCard; index: number }) => (
    <View
      style={[
        styles.carouselItem,
        index === cardData.length - 1 && styles.carouselItemLast,
      ]}
    >
      {renderCardContent(item)}
    </View>
  );

  const showCarousel =
    cardData.length <= 1 || currentStackIndex >= cardData.length;
  const shouldShowStack = !showCarousel && remainingCards.length > 0;

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Hai aperto {packName}</Text>
      <Text style={styles.subHeading}>Trascina le carte per scoprirle tutte</Text>
      <View style={styles.carouselWrapper}>
        {shouldShowStack ? (
          <View style={styles.stackContainer}>
            <View style={styles.stackInner}>
              {remainingCards.map(renderStackCard)}
            </View>
          </View>
        ) : (
          <FlatList
            data={cardData}
            keyExtractor={(item, index) => `${item.id ?? 'card'}-${index}`}
            renderItem={renderCarouselItem}
            horizontal
            pagingEnabled
            snapToAlignment="center"
            snapToInterval={CARD_CAROUSEL_SNAP_INTERVAL}
            decelerationRate="fast"
            showsHorizontalScrollIndicator={false}
            style={styles.carousel}
            contentContainerStyle={[
              styles.carouselContent,
              { paddingLeft: paddingStart, paddingRight: paddingEnd },
            ]}
            ListEmptyComponent={
              <Text style={styles.emptyText}>Nessuna carta trovata</Text>
            }
          />
        )}
      </View>
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.primaryButton}
          activeOpacity={0.85}
          onPress={handleGoToCollection}
        >
          <Text style={styles.primaryButtonLabel}>Vai alla collezione</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryButton}
          activeOpacity={0.85}
          onPress={handleBackToShop}
        >
          <Text style={styles.secondaryButtonLabel}>Apri un altro pack</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default PackOpenScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 32,
    paddingHorizontal: 20,
    backgroundColor: '#0e0c0f',
  },
  heading: {
    fontSize: 32,
    fontWeight: '700',
    color: '#00a028ff',
    textAlign: 'center',
    marginTop: 52,
    marginBottom: 8,
  },
  subHeading: {
    fontSize: 16,
    color: '#cbd5f5',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 32,
  },
  carouselWrapper: {
    minHeight: CARD_STACK_HEIGHT,
    justifyContent: 'center',
    marginBottom: 24,
  },
  carousel: {
    flexGrow: 0,
  },
  carouselContent: {
    paddingBottom: 16,
    alignItems: 'center',
  },
  carouselItem: {
    width: CARD_CAROUSEL_ITEM_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: CARD_CAROUSEL_ITEM_SPACING,
  },
  carouselItemLast: {
    marginRight: 0,
  },
  stackContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stackInner: {
    width: CARD_CAROUSEL_ITEM_WIDTH,
    height: CARD_STACK_HEIGHT,
    position: 'relative',
  },
  stackCard: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  stackCardTop: {
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 8,
  },
  emptyText: {
    fontSize: 15,
    color: '#cbd5f5',
    textAlign: 'center',
    paddingVertical: 40,
  },
  actionsRow: {
    marginTop: 16,
    marginBottom: 34,
    gap: 10,
  },
  primaryButton: {
    backgroundColor: '#00a028ff',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0e0c0f',
  },
  secondaryButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#00a028ff',
  },
  secondaryButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#00a028ff',
  },
});
