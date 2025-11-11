import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  FlatList,
  PanResponder,
  NativeSyntheticEvent,
  NativeScrollEvent,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
  type FlexStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';

import Card from '../../components/ui/Card';
import type {
  MainStackParamList,
  OpenedPackCard,
} from '../navigators/types';

type PackOpenRouteProp = RouteProp<MainStackParamList, 'PackOpen'>;

const CARD_PLACEHOLDER = require('../../assets/images/Backgrounds/CollectionBackground.jpg');
const CARD_CAROUSEL_MAX_WIDTH = 370;
const CARD_CAROUSEL_MIN_WIDTH = 260;
const CARD_CAROUSEL_DEFAULT_SPACING = 24;
const CARD_CAROUSEL_HORIZONTAL_MARGIN = 24;
const CARD_CAROUSEL_LEAD_OFFSET = 90;
const CAROUSEL_LOOP_MULTIPLIER = 40;

const PackOpenScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<MainStackParamList>>();
  const route = useRoute<PackOpenRouteProp>();
  const { packName, cards } = route.params;
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const cardData = useMemo(
    () => (Array.isArray(cards) ? cards : []) as OpenedPackCard[],
    [cards],
  );

  const [currentStackIndex, setCurrentStackIndex] = useState(0);
  const [isAnimatingStack, setIsAnimatingStack] = useState(false);
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const swipeLockRef = useRef(false);
  const carouselRef = useRef<FlatList<OpenedPackCard> | null>(null);
  const autoScrollIndexRef = useRef(0);
  const autoScrollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const {
    cardWidth,
    cardSpacing,
    snapInterval,
    paddingStart,
    paddingEnd,
    cardScale,
  } = useMemo(() => {
    const maxWidthCandidate = windowWidth - CARD_CAROUSEL_HORIZONTAL_MARGIN * 2;
    const constrainedWidth = Math.max(
      CARD_CAROUSEL_MIN_WIDTH,
      Math.min(CARD_CAROUSEL_MAX_WIDTH, maxWidthCandidate),
    );
    const spacing =
      constrainedWidth >= CARD_CAROUSEL_MAX_WIDTH
        ? CARD_CAROUSEL_DEFAULT_SPACING
        : Math.max(12, constrainedWidth * 0.045);
    const interval = constrainedWidth + spacing;
    const basePadding = Math.max((windowWidth - constrainedWidth) / 2, 0);
    const scaleCandidate =
      windowWidth < constrainedWidth + CARD_CAROUSEL_HORIZONTAL_MARGIN * 2
        ? Math.max(0.85, windowWidth / (constrainedWidth + CARD_CAROUSEL_HORIZONTAL_MARGIN * 2))
        : 1;

    return {
      cardWidth: constrainedWidth,
      cardSpacing: spacing,
      snapInterval: interval,
      paddingStart: Math.max(basePadding - CARD_CAROUSEL_LEAD_OFFSET, 0),
      paddingEnd: basePadding,
      cardScale: scaleCandidate,
    };
  }, [windowWidth]);

  const responsive = useMemo(() => {
    const basePaddingHorizontal = Math.max(16, Math.min(32, windowWidth * 0.05));
    const headingFontSize = Math.min(34, Math.max(24, windowWidth * 0.085));
    const subHeadingFontSize = Math.min(20, Math.max(14, windowWidth * 0.045));
    const headingTopSpacing = Math.max(24, windowHeight * 0.06);
    const headingBottomSpacing = Math.max(8, windowHeight * 0.015);
    const stackHeight = Math.max(280, Math.min(windowHeight * 0.55, 420));
    const stackBaseTop = Math.max(stackHeight * 0.08, 28);
    const stackLayerOffset = Math.max(stackHeight * 0.04, 12);
    const sectionSpacing = Math.max(18, windowHeight * 0.03);
    const buttonHeight = Math.max(36, Math.min(46, windowHeight * 0.06));
    const buttonsGap = Math.max(10, windowHeight * 0.02);
    const buttonFontSize = Math.min(16, Math.max(13, windowWidth * 0.048));
    const shouldStackActions = windowWidth < 420;
    const buttonHorizontalPadding = Math.max(12, Math.min(18, windowWidth * 0.045));

    return {
      basePaddingHorizontal,
      headingFontSize,
      subHeadingFontSize,
      headingTopSpacing,
      headingBottomSpacing,
      stackHeight,
      stackBaseTop,
      stackLayerOffset,
      sectionSpacing,
      buttonHeight,
      buttonsGap,
      buttonFontSize,
      shouldStackActions,
      buttonHorizontalPadding,
    };
  }, [windowHeight, windowWidth]);

  const containerStyle = useMemo(
    () => [
      styles.container,
      {
        paddingTop: insets.top,
        paddingBottom: insets.bottom + responsive.sectionSpacing,
        paddingHorizontal: responsive.basePaddingHorizontal,
      },
    ],
    [
      insets.bottom,
      insets.top,
      responsive.basePaddingHorizontal,
      responsive.sectionSpacing,
    ],
  );

  const headingStyle = useMemo(
    () => [
      styles.heading,
      {
        fontSize: responsive.headingFontSize,
        marginTop: responsive.headingTopSpacing,
        marginBottom: responsive.headingBottomSpacing,
      },
    ],
    [
      responsive.headingBottomSpacing,
      responsive.headingFontSize,
      responsive.headingTopSpacing,
    ],
  );

  const subHeadingStyle = useMemo(
    () => [
      styles.subHeading,
      {
        fontSize: responsive.subHeadingFontSize,
        marginBottom: responsive.sectionSpacing,
      },
    ],
    [responsive.sectionSpacing, responsive.subHeadingFontSize],
  );

  const carouselWrapperStyle = useMemo(
    () => [
      styles.carouselWrapper,
      {
        minHeight: responsive.stackHeight + responsive.sectionSpacing * 0.4,
        marginBottom: responsive.sectionSpacing,
      },
    ],
    [responsive.sectionSpacing, responsive.stackHeight],
  );

  const actionsRowStyle = useMemo(
    () => [
      styles.actionsRow,
      {
        marginTop: responsive.sectionSpacing * 0.2,
        marginBottom: responsive.sectionSpacing * 0.4,
        gap: responsive.buttonsGap,
        flexDirection: (responsive.shouldStackActions ? 'column' : 'row') as FlexStyle['flexDirection'],
      },
    ],
    [responsive.buttonsGap, responsive.sectionSpacing, responsive.shouldStackActions],
  );

  const primaryButtonStyle = useMemo(
    () => [
      styles.primaryButton,
      {
        minHeight: responsive.buttonHeight,
        paddingVertical: Math.max(10, responsive.buttonHeight * 0.32),
        paddingHorizontal: responsive.buttonHorizontalPadding,
        flex: responsive.shouldStackActions ? undefined : 1,
        minWidth: 0,
      },
    ],
    [
      responsive.buttonHeight,
      responsive.buttonHorizontalPadding,
      responsive.shouldStackActions,
    ],
  );

  const primaryButtonLabelStyle = useMemo(
    () => [
      styles.primaryButtonLabel,
      { fontSize: responsive.buttonFontSize },
    ],
    [responsive.buttonFontSize],
  );

  const secondaryButtonStyle = useMemo(
    () => [
      styles.secondaryButton,
      {
        minHeight: responsive.buttonHeight,
        paddingVertical: Math.max(10, responsive.buttonHeight * 0.32),
        paddingHorizontal: responsive.buttonHorizontalPadding,
        flex: responsive.shouldStackActions ? undefined : 1,
        minWidth: 0,
      },
    ],
    [
      responsive.buttonHeight,
      responsive.buttonHorizontalPadding,
      responsive.shouldStackActions,
    ],
  );

  const secondaryButtonLabelStyle = useMemo(
    () => [
      styles.secondaryButtonLabel,
      { fontSize: responsive.buttonFontSize },
    ],
    [responsive.buttonFontSize],
  );

  const stackHeight = responsive.stackHeight;
  const stackBaseTop = responsive.stackBaseTop;
  const stackLayerOffset = responsive.stackLayerOffset;

  const remainingCards = useMemo(
    () => cardData.slice(currentStackIndex),
    [cardData, currentStackIndex],
  );

  const showCarousel =
    cardData.length <= 1 || currentStackIndex >= cardData.length;
  const shouldShowStack = !showCarousel && remainingCards.length > 0;
  const carouselData = useMemo(() => {
    if (!showCarousel || cardData.length <= 1) {
      return cardData;
    }
    const loopRounds = Math.max(6, CAROUSEL_LOOP_MULTIPLIER);
    const totalLength = cardData.length * loopRounds;
    const looped: OpenedPackCard[] = new Array(totalLength);
    for (let i = 0; i < totalLength; i += 1) {
      looped[i] = cardData[i % cardData.length];
    }
    return looped;
  }, [cardData, showCarousel]);
  const baseCarouselLength = cardData.length;
  const loopCenterIndex = useMemo(() => {
    if (!showCarousel || baseCarouselLength <= 1) {
      return 0;
    }
    const loopRounds = Math.max(6, CAROUSEL_LOOP_MULTIPLIER);
    return baseCarouselLength * Math.floor(loopRounds / 2);
  }, [baseCarouselLength, showCarousel]);
  const totalCarouselLength = carouselData.length;

  const carouselContentPadding = useMemo(() => {
    if (showCarousel) {
      const centeredPadding = Math.max(
        0,
        (windowWidth - cardWidth) / 2 - cardSpacing / 2,
      );
      const horizontalPadding = Math.max(
        CARD_CAROUSEL_HORIZONTAL_MARGIN,
        centeredPadding,
      );
      return {
        paddingLeft: horizontalPadding,
        paddingRight: horizontalPadding,
      };
    }
    return { paddingLeft: paddingStart, paddingRight: paddingEnd };
  }, [cardSpacing, cardWidth, paddingEnd, paddingStart, showCarousel, windowWidth]);

  const carouselPaddingOffset = useMemo(() => {
    if (showCarousel) {
      return carouselContentPadding.paddingLeft ?? 0;
    }
    return paddingStart;
  }, [carouselContentPadding, paddingStart, showCarousel]);

  const computeLoopOffset = useCallback(
    (index: number) => carouselPaddingOffset + index * snapInterval,
    [carouselPaddingOffset, snapInterval],
  );

  const listStartOffset = useMemo(
    () => (showCarousel ? carouselPaddingOffset : paddingStart),
    [carouselPaddingOffset, paddingStart, showCarousel],
  );

  useEffect(() => {
    if (autoScrollTimerRef.current) {
      clearInterval(autoScrollTimerRef.current);
      autoScrollTimerRef.current = null;
    }

    if (
      !showCarousel ||
      baseCarouselLength <= 1 ||
      totalCarouselLength === 0 ||
      snapInterval <= 0
    ) {
      return;
    }

    const startingIndex = loopCenterIndex > 0 ? loopCenterIndex : 0;
    autoScrollIndexRef.current = startingIndex;
    const initialOffset = computeLoopOffset(autoScrollIndexRef.current);

    requestAnimationFrame(() => {
      carouselRef.current?.scrollToOffset({
        offset: initialOffset,
        animated: false,
      });
    });

    autoScrollTimerRef.current = setInterval(() => {
      const list = carouselRef.current;
      if (!list) {
        return;
      }

      const loopBoundary =
        totalCarouselLength - baseCarouselLength * 2;
      let nextIndex = autoScrollIndexRef.current + 1;

      if (nextIndex >= loopBoundary) {
        const normalizedIndex =
          loopCenterIndex +
          (nextIndex % baseCarouselLength);
        autoScrollIndexRef.current = normalizedIndex;
        list.scrollToOffset({
          offset: computeLoopOffset(normalizedIndex),
          animated: false,
        });
        return;
      }

      autoScrollIndexRef.current = nextIndex;
      list.scrollToOffset({
        offset: computeLoopOffset(nextIndex),
        animated: true,
      });
    }, 1800);

    return () => {
      if (autoScrollTimerRef.current) {
        clearInterval(autoScrollTimerRef.current);
        autoScrollTimerRef.current = null;
      }
    };
  }, [
    baseCarouselLength,
    totalCarouselLength,
    computeLoopOffset,
    loopCenterIndex,
    showCarousel,
    snapInterval,
  ]);

  const handleCarouselMomentumEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (!showCarousel || baseCarouselLength <= 1) {
        return;
      }
      const list = carouselRef.current;
      if (!list) {
        return;
      }

      const offsetX = event.nativeEvent.contentOffset.x;
      const approximateIndex = Math.round(
        (offsetX - carouselPaddingOffset) / snapInterval,
      );

      autoScrollIndexRef.current = approximateIndex;

      const minThreshold = baseCarouselLength * 2;
      const maxThreshold =
        totalCarouselLength - baseCarouselLength * 2;

      if (
        approximateIndex <= minThreshold ||
        approximateIndex >= maxThreshold
      ) {
        const normalizedIndex =
          loopCenterIndex +
          ((approximateIndex % baseCarouselLength) + baseCarouselLength) %
            baseCarouselLength;
        autoScrollIndexRef.current = normalizedIndex;
        requestAnimationFrame(() => {
          list.scrollToOffset({
            offset: computeLoopOffset(normalizedIndex),
            animated: false,
          });
        });
      }
    },
    [
      baseCarouselLength,
      totalCarouselLength,
      carouselPaddingOffset,
      computeLoopOffset,
      loopCenterIndex,
      showCarousel,
      snapInterval,
    ],
  );

  useEffect(() => {
    pan.stopAnimation();
    pan.setValue({ x: 0, y: 0 });
    setCurrentStackIndex(0);
    setIsAnimatingStack(false);
    swipeLockRef.current = false;
  }, [cardData, pan]);

  const handleBackToShop = () => {
    navigation.navigate('Tabs', { screen: 'Shop' });
  };

  const handleGoToCollection = () => {
    navigation.navigate('Tabs', { screen: 'Collection' });
  };

  const triggerFeedback = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
  }, []);

  const renderCardContent = useCallback((item: OpenedPackCard) => {
    const normalizedType: 'player' | 'goalkeeper' | 'coach' | 'bonusMalus' =
      item.type === 'bonus'
        ? 'bonusMalus'
        : item.type === 'coach'
          ? 'coach'
          : item.type === 'goalkeeper'
            ? 'goalkeeper'
            : 'player';
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
        save={item.save ?? undefined}
        abilities={item.abilities ?? undefined}
        effect={item.effect ?? undefined}
        duration={item.duration ?? undefined}
        attackBonus={item.attack_bonus ?? undefined}
        defenseBonus={item.defense_bonus ?? undefined}
        image={imageSource}
        rarity={rarity}
        season={item.season ?? undefined}
        collectionNumber={item.id ?? undefined}
      />
    );
  }, []);

  const handleCompleteSwipe = useCallback(
    (vector?: { dx: number; dy: number }) => {
      if (swipeLockRef.current || isAnimatingStack || remainingCards.length === 0) {
        return;
      }

      swipeLockRef.current = true;
      setIsAnimatingStack(true);
      triggerFeedback();
      pan.stopAnimation();

      const fallbackVector = { dx: -1, dy: 0 };
      const inputVector = vector ?? fallbackVector;
      const length = Math.hypot(inputVector.dx, inputVector.dy);
      const fallbackNormalized = { x: fallbackVector.dx, y: fallbackVector.dy };
      const normalized =
        length > 0.001
          ? { x: inputVector.dx / length, y: inputVector.dy / length }
          : fallbackNormalized;
      const exitDistance = Math.max(windowWidth, windowHeight) + cardWidth + 64;

      Animated.parallel([
        Animated.timing(pan.x, {
          toValue: normalized.x * exitDistance,
          duration: 240,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(pan.y, {
          toValue: normalized.y * exitDistance,
          duration: 240,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (!finished) return;
        requestAnimationFrame(() => {
          pan.setValue({ x: 0, y: 0 });
          setCurrentStackIndex(prev => {
            const next = prev + 1;
            return next >= cardData.length ? cardData.length : next;
          });
        });
        setTimeout(() => {
          swipeLockRef.current = false;
          setIsAnimatingStack(false);
        }, 80);
      });
    },
    [
      cardData.length,
      cardWidth,
      isAnimatingStack,
      pan,
      remainingCards.length,
      triggerFeedback,
      windowHeight,
      windowWidth,
    ],
  );


  const panResponder = useMemo(() => {
    const getCanInteract = () =>
      !isAnimatingStack && !swipeLockRef.current && remainingCards.length > 0;

    return PanResponder.create({
      onStartShouldSetPanResponder: () => getCanInteract(),
      onStartShouldSetPanResponderCapture: () => getCanInteract(),
      onMoveShouldSetPanResponder: (_, gestureState) => {
        if (!getCanInteract()) {
          return false;
        }
        const { dx, dy } = gestureState;
        return Math.hypot(dx, dy) > 6;
      },
      onMoveShouldSetPanResponderCapture: (_, gestureState) => {
        if (!getCanInteract()) {
          return false;
        }
        const { dx, dy } = gestureState;
        return Math.hypot(dx, dy) > 6;
      },
      onPanResponderMove: (_, gestureState) => {
        if (!getCanInteract()) {
          return;
        }
        const clampedDx = Math.max(Math.min(gestureState.dx, cardWidth), -cardWidth);
        const clampedDy = Math.max(Math.min(gestureState.dy, cardWidth), -cardWidth);
        pan.setValue({
          x: clampedDx,
          y: clampedDy,
        });
      },
      onPanResponderRelease: (_, gestureState) => {
        if (!getCanInteract()) {
          return;
        }

        const distance = Math.hypot(gestureState.dx, gestureState.dy);
        const velocityMagnitude = Math.hypot(gestureState.vx, gestureState.vy);
        const distanceThreshold = Math.max(64, cardWidth * 0.28);
        const velocityThreshold = 0.7;
        const shouldComplete =
          distance >= distanceThreshold || velocityMagnitude >= velocityThreshold;

        if (shouldComplete && !swipeLockRef.current) {
          handleCompleteSwipe({
            dx: gestureState.dx !== 0 ? gestureState.dx : gestureState.vx,
            dy: gestureState.dy !== 0 ? gestureState.dy : gestureState.vy,
          });
        } else {
          Animated.parallel([
            Animated.spring(pan.x, {
              toValue: 0,
              stiffness: 180,
              damping: 22,
              mass: 0.9,
              useNativeDriver: true,
            }),
            Animated.spring(pan.y, {
              toValue: 0,
              stiffness: 180,
              damping: 22,
              mass: 0.9,
              useNativeDriver: true,
            }),
          ]).start();
        }
      },
      onPanResponderTerminate: () => {
        if (swipeLockRef.current) {
          return;
        }
        Animated.parallel([
          Animated.spring(pan.x, {
            toValue: 0,
            stiffness: 180,
            damping: 22,
            mass: 0.9,
            useNativeDriver: true,
          }),
          Animated.spring(pan.y, {
            toValue: 0,
            stiffness: 180,
            damping: 22,
            mass: 0.9,
            useNativeDriver: true,
          }),
        ]).start();
      },
    });
  }, [cardWidth, handleCompleteSwipe, isAnimatingStack, pan, remainingCards.length]);

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: snapInterval,
      offset: snapInterval * index + listStartOffset,
      index,
    }),
    [listStartOffset, snapInterval],
  );

  const renderStackCard = (item: OpenedPackCard, index: number) => {
    const depth = index;
    const zIndex = remainingCards.length - index;
    const baseTop = stackBaseTop + depth * stackLayerOffset;

    if (index === 0) {
      const rotate = pan.x.interpolate({
        inputRange: [-cardWidth, 0],
        outputRange: ['-10deg', '0deg'],
        extrapolate: 'clamp',
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
                { scale: cardScale },
              ],
            },
          ]}
          accessibilityRole="image"
          accessibilityLabel={`Carta ${item.name}, rarita ${item.rarity ?? 'common'}`}
          pointerEvents={isAnimatingStack ? 'none' : 'auto'}
          {...panResponder.panHandlers}
        >
          {renderCardContent(item)}
        </Animated.View>
      );
    }

    const scale = Math.max(0.88, 1 - depth * 0.04) * cardScale;
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

  const renderCarouselItem = ({ item }: { item: OpenedPackCard; index: number }) => (
    <View
      style={[
        styles.carouselItem,
        {
          width: cardWidth,
          marginLeft: cardSpacing / 2,
          marginRight: cardSpacing / 2,
          transform: [{ scale: cardScale }],
        },
      ]}
      accessibilityRole="image"
      accessibilityLabel={`Carta ${item.name}, rarita ${item.rarity ?? 'common'}`}
    >
      {renderCardContent(item)}
    </View>
  );

  return (
    <View style={containerStyle}>
      <Text style={headingStyle}>You open {packName}!</Text>
      <Text style={subHeadingStyle}>Swipe to discover cards</Text>
      <View style={carouselWrapperStyle}>
        {shouldShowStack ? (
          <View style={styles.stackContainer}>
            <View style={[styles.stackInner, { width: cardWidth, height: stackHeight }]}>
              {remainingCards.map(renderStackCard)}
            </View>
          </View>
        ) : (
          <FlatList
            ref={carouselRef}
            data={carouselData}
            keyExtractor={(item, index) => `${item.id ?? 'card'}-${index}`}
            renderItem={renderCarouselItem}
            horizontal
            snapToAlignment="center"
            snapToInterval={snapInterval}
            decelerationRate="fast"
            disableIntervalMomentum
            scrollEnabled={false}
            showsHorizontalScrollIndicator={false}
            getItemLayout={getItemLayout}
            initialScrollIndex={
              showCarousel && baseCarouselLength > 1 ? loopCenterIndex : 0
            }
            style={styles.carousel}
            contentContainerStyle={[
              styles.carouselContent,
              carouselContentPadding,
            ]}
            onMomentumScrollEnd={handleCarouselMomentumEnd}
            ListEmptyComponent={
              <Text style={styles.emptyText}>Nessuna carta trovata</Text>
            }
          />
        )}
      </View>
      <View style={actionsRowStyle}>
        <TouchableOpacity
          style={primaryButtonStyle}
          activeOpacity={0.85}
          onPress={handleGoToCollection}
          accessibilityRole="button"
          accessibilityLabel="Vai alla collezione"
          accessibilityHint="Apri la schermata della collezione carte"
        >
          <Text style={primaryButtonLabelStyle}>Go to collection</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={secondaryButtonStyle}
          activeOpacity={0.85}
          onPress={handleBackToShop}
          accessibilityRole="button"
          accessibilityLabel="Apri un altro pacchetto"
          accessibilityHint="Ritorna allo shop per aprire un nuovo pacchetto"
        >
          <Text style={secondaryButtonLabelStyle}>Open another pack</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default PackOpenScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 0,
    paddingHorizontal: 0,
    backgroundColor: '#0e0c0f',
  },
  heading: {
    fontWeight: '700',
    color: '#00a028ff',
    textAlign: 'center',
  },
  subHeading: {
    color: '#cbd5f5',
    textAlign: 'center',
  },
  carouselWrapper: {
    justifyContent: 'center',
  },
  carousel: {
    flexGrow: 0,
  },
  carouselContent: {
    paddingBottom: 16,
    alignItems: 'center',
  },
  carouselItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  stackContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stackInner: {
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
    width: '100%',
    alignSelf: 'stretch',
    alignItems: 'stretch',
    marginTop: 0,
    marginBottom: 0,
    gap: 0,
  },
  primaryButton: {
    backgroundColor: '#00a028ff',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
    shadowColor: '#00a028ff',
    shadowOpacity: 0.28,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 4,
  },
  primaryButtonLabel: {
    fontWeight: '700',
    color: '#0e0c0f',
    textAlign: 'center',
  },
  secondaryButton: {
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
    borderWidth: 1,
    borderColor: '#00a028ff',
    backgroundColor: 'rgba(0, 160, 40, 0.12)',
  },
  secondaryButtonLabel: {
    fontWeight: '600',
    color: '#00a028ff',
    textAlign: 'center',
  },
});
