import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
  Image,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

import Card from '../../../components/ui/Card';
import {
  COMMUNITY_EXCHANGE_INITIAL_COUNT,
  LOAD_MORE_STEP,
  MY_EXCHANGE_INITIAL_COUNT,
  findCarouselTabs,
  rarityColors,
  rarityLabels,
} from './constants';
import { ExchangeListing, FindCarouselTab, NormalizedCard } from './types';

type Props = {
  myProposals: ExchangeListing[];
  availableOffers: ExchangeListing[];
  onJoinOffer: (offer: ExchangeListing) => void;
  onDeleteProposal: (proposal: ExchangeListing) => void;
};

const FindExchangeSection: React.FC<Props> = ({
  myProposals,
  availableOffers,
  onJoinOffer,
  onDeleteProposal,
}) => {
  const [activeTab, setActiveTab] = useState<FindCarouselTab>('mine');
  const [visibleMine, setVisibleMine] = useState(MY_EXCHANGE_INITIAL_COUNT);
  const [visibleCommunity, setVisibleCommunity] = useState(COMMUNITY_EXCHANGE_INITIAL_COUNT);
  const carouselRef = useRef<ScrollView | null>(null);
  const { width } = useWindowDimensions();
  const pageWidth = Math.max(width - 48, 1);

  useEffect(() => {
    setVisibleMine(prev => {
      if (myProposals.length === 0) {
        return MY_EXCHANGE_INITIAL_COUNT;
      }
      return Math.min(prev, myProposals.length);
    });
  }, [myProposals.length]);

  useEffect(() => {
    setVisibleCommunity(prev => {
      if (availableOffers.length === 0) {
        return COMMUNITY_EXCHANGE_INITIAL_COUNT;
      }
      return Math.min(prev, availableOffers.length);
    });
  }, [availableOffers.length]);

  const displayedMyProposals = useMemo(
    () => myProposals.slice(0, visibleMine),
    [myProposals, visibleMine],
  );
  const displayedCommunityOffers = useMemo(
    () => availableOffers.slice(0, visibleCommunity),
    [availableOffers, visibleCommunity],
  );

  const hasMoreMine = visibleMine < myProposals.length;
  const hasMoreCommunity = visibleCommunity < availableOffers.length;

  const handleSelectTab = (tab: FindCarouselTab) => {
    setActiveTab(tab);
    const index = tab === 'mine' ? 0 : 1;
    carouselRef.current?.scrollTo({ x: index * pageWidth, animated: true });
  };

  const handleMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const nextIndex = Math.round(offsetX / pageWidth);
    const nextTab: FindCarouselTab = nextIndex <= 0 ? 'mine' : 'community';
    if (nextTab !== activeTab) {
      setActiveTab(nextTab);
    }
  };

  const handleLoadMoreMine = () => {
    setVisibleMine(prev => Math.min(prev + LOAD_MORE_STEP, myProposals.length));
  };

  const handleLoadMoreCommunity = () => {
    setVisibleCommunity(prev => Math.min(prev + LOAD_MORE_STEP, availableOffers.length));
  };

  const renderInlineCard = (card: NormalizedCard, onPress: () => void) => {
    const key = `${card.type}:${card.id}`;
    return (
      <TouchableOpacity
        key={key}
        style={[
          styles.cardChip,
          styles.cardChipInline,
          { borderColor: rarityColors[card.rarity] },
        ]}
        onPress={onPress}
        activeOpacity={0.85}
      >
        <View style={[styles.cardPreview, { backgroundColor: `${rarityColors[card.rarity]}26` }]}>
          {card.imageUrl ? (
            <Image source={{ uri: card.imageUrl }} style={styles.cardImage} />
          ) : (
            <Text style={styles.cardInitial}>{card.name.charAt(0)}</Text>
          )}
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardName}>{card.name}</Text>
          <Text style={styles.cardMeta}>
            {rarityLabels[card.rarity]}
            {card.team ? ` • ${card.team}` : ''}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.section}>
      <View style={styles.findCarouselTabs}>
        {findCarouselTabs.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.findCarouselTab, activeTab === tab.key && styles.findCarouselTabActive]}
            onPress={() => handleSelectTab(tab.key)}
            activeOpacity={0.85}
          >
            <Text
              style={[
                styles.findCarouselTabLabel,
                activeTab === tab.key && styles.findCarouselTabLabelActive,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        ref={carouselRef}
        horizontal
        pagingEnabled
        decelerationRate="fast"
        snapToInterval={pageWidth}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleMomentumEnd}
        scrollEventThrottle={16}
        style={styles.carouselPager}
        contentContainerStyle={styles.carouselContent}
      >
        <View style={[styles.carouselPage, { width: pageWidth }]}>
          {myProposals.length === 0 ? (
            <Text style={styles.emptyText}>
              You do not have outgoing proposals yet. Switch to "porpose exchange" to create your
              first one.
            </Text>
          ) : (
            <>
              {displayedMyProposals.map(proposal => (
                <View key={proposal.id} style={styles.myProposalCard}>
                  <View style={styles.myProposalCardPreview}>
                    <Card
                      size="small"
                      type={proposal.offeredCard.type}
                      name={proposal.offeredCard.name}
                      team={proposal.offeredCard.team}
                      attack={proposal.offeredCard.attack}
                      defense={proposal.offeredCard.defense}
                      save={proposal.offeredCard.save}
                      attackBonus={proposal.offeredCard.attackBonus}
                      defenseBonus={proposal.offeredCard.defenseBonus}
                      effect={proposal.offeredCard.effect}
                      duration={proposal.offeredCard.duration}
                      image={
                        proposal.offeredCard.imageUrl ? { uri: proposal.offeredCard.imageUrl } : undefined
                      }
                      rarity={proposal.offeredCard.rarity}
                      season={proposal.offeredCard.season}
                    />
                  </View>
                  <TouchableOpacity
                    style={styles.dangerButton}
                    onPress={() => onDeleteProposal(proposal)}
                  >
                    <Text style={styles.dangerButtonText}>Delete exchange</Text>
                  </TouchableOpacity>
                </View>
              ))}
              {hasMoreMine && (
                <TouchableOpacity
                  style={styles.loadMoreButton}
                  onPress={handleLoadMoreMine}
                  activeOpacity={0.85}
                >
                  <Text style={styles.loadMoreButtonText}>Show more exchanges</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>

        <View style={[styles.carouselPage, { width: pageWidth }]}>
          {availableOffers.length === 0 ? (
            <Text style={styles.emptyText}>
              No proposals from other users match your needs right now.
            </Text>
          ) : (
            <>
              {displayedCommunityOffers.map(offer => (
                <View key={offer.id} style={styles.offerCard}>
                  <View style={styles.offerOwner}>
                    <Feather name="user" size={16} color="#ffffff" />
                    <Text style={styles.offerOwnerText}>{offer.username}</Text>
                  </View>
                  <View style={styles.offerContent}>
                    {renderInlineCard(offer.offeredCard, () => onJoinOffer(offer))}
                    <View style={styles.offerDetails}>
                      <Text style={styles.offerLabel}>Looking for:</Text>
                      <Text style={styles.offerValue}>
                        {offer.wants ? offer.wants : `any ${rarityLabels[offer.requiredRarity]} card`}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity style={styles.secondaryButton} onPress={() => onJoinOffer(offer)}>
                    <Text style={styles.secondaryButtonText}>Open trade</Text>
                  </TouchableOpacity>
                </View>
              ))}
              {hasMoreCommunity && (
                <TouchableOpacity
                  style={styles.loadMoreButton}
                  onPress={handleLoadMoreCommunity}
                  activeOpacity={0.85}
                >
                  <Text style={styles.loadMoreButtonText}>Show more offers</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </ScrollView>

      <View style={styles.carouselIndicators}>
        {findCarouselTabs.map(tab => (
          <View
            key={tab.key}
            style={[
              styles.carouselIndicatorDot,
              activeTab === tab.key && styles.carouselIndicatorDotActive,
            ]}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    paddingVertical: 8,
    gap: 16,
  },
  findCarouselTabs: {
    flexDirection: 'row',
    gap: 8,
  },
  findCarouselTab: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1f1f1f',
    paddingVertical: 10,
    backgroundColor: '#111014',
  },
  findCarouselTabActive: {
    borderColor: '#00a028ff',
    backgroundColor: '#0f2a18',
  },
  findCarouselTabLabel: {
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#bcbcbc',
    textTransform: 'uppercase',
  },
  findCarouselTabLabelActive: {
    color: '#ffffff',
  },
  carouselPager: {
    flexGrow: 0,
  },
  carouselContent: {
    flexGrow: 1,
    alignItems: 'stretch',
  },
  carouselPage: {
    gap: 12,
  },
  carouselIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  carouselIndicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2c2c2c',
  },
  carouselIndicatorDotActive: {
    backgroundColor: '#00a028ff',
  },
  emptyText: {
    color: '#8f8f8f',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  myProposalCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#272727',
    padding: 16,
    backgroundColor: '#15121c',
    alignItems: 'center',
    gap: 12,
  },
  myProposalCardPreview: {
    padding: 8,
    borderRadius: 16,
    backgroundColor: '#1b1a23',
  },
  loadMoreButton: {
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: '#3a3a3a',
    backgroundColor: '#1b1a23',
    marginTop: 4,
  },
  loadMoreButtonText: {
    color: '#e0e0e0',
    fontWeight: '600',
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dangerButton: {
    borderRadius: 28,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ff5f5f',
    backgroundColor: 'rgba(255, 95, 95, 0.15)',
    width: '100%',
  },
  dangerButtonText: {
    color: '#ff8787',
    fontWeight: '700',
  },
  offerCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#272727',
    padding: 16,
    backgroundColor: '#15121c',
    gap: 12,
  },
  offerOwner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  offerOwnerText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  offerContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  offerDetails: {
    flex: 1,
    paddingTop: 4,
  },
  offerLabel: {
    color: '#9f9f9f',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  offerValue: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
    marginTop: 4,
  },
  secondaryButton: {
    borderRadius: 28,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#00a028ff',
  },
  secondaryButtonText: {
    color: '#00a028ff',
    fontWeight: '700',
  },
  cardChip: {
    width: '48%',
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    backgroundColor: '#15121c',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardChipInline: {
    width: '100%',
  },
  cardPreview: {
    width: 48,
    height: 64,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardImage: {
    width: 48,
    height: 64,
    borderRadius: 10,
  },
  cardInitial: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  cardInfo: {
    flex: 1,
  },
  cardName: {
    color: '#ffffff',
    fontWeight: '600',
  },
  cardMeta: {
    color: '#b4b4b4',
    fontSize: 12,
    marginTop: 2,
  },
});

export default FindExchangeSection;
