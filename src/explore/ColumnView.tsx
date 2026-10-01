import { memo, useCallback, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { FlatList, GestureDetector } from 'react-native-gesture-handler';
import Animated, { type SharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FeedStatusCard } from '../cards/FeedStatusCard';
import { SeedHeader } from '../cards/SeedHeader';
import { SkeletonCard } from '../cards/SkeletonCard';
import type { Card } from '../content/card';
import { LAYOUT } from '../theme/layout';
import { useTheme } from '../theme/useTheme';
import { Breadcrumb } from './Breadcrumb';
import type { ColumnEntry } from './columnStack';
import { HomeHeader } from './HomeHeader';
import type { HopController } from './hopController';
import { SwipeCard } from './SwipeCard';
import { useColumnFeed } from './useColumnFeed';
import { useColumnMotion } from './useColumnMotion';

export interface PulseTarget {
  cardId: number;
  token: number;
}

interface ColumnViewProps {
  entry: ColumnEntry;
  interests: readonly string[];
  isTop: boolean;
  entryProgress: SharedValue<number> | null;
  candidateCardId: number | null;
  pulse: PulseTarget | null;
  hop: HopController;
  onOpen: (card: Card) => void;
  onBack: () => void;
  onJump: (columnIndex: number) => void;
}

// FlatList measures this in screen-heights; one card fills a screen, so this is ~5 cards from the end (SPEC.md §7).
const LOAD_MORE_THRESHOLD = 5;

interface ColumnHeaderProps {
  entry: ColumnEntry;
  entryProgress: SharedValue<number> | null;
  onJump: (columnIndex: number) => void;
}

function ColumnHeader({ entry, entryProgress, onJump }: ColumnHeaderProps) {
  if (!entry.seed) return <HomeHeader />;
  return (
    <>
      <Breadcrumb path={entry.path} onJump={onJump} entry={entryProgress} />
      <View style={styles.seedSlot}>
        {/* While flying in, the hop overlay draws the seed header; the real one appears once it lands. */}
        {!entryProgress && <SeedHeader title={entry.seed.title} topic={entry.seedTopic} thumbnailUrl={entry.seedThumbnailUrl} />}
      </View>
    </>
  );
}

function ColumnViewImpl({ entry, interests, isTop, entryProgress, candidateCardId, pulse, hop, onOpen, onBack, onJump }: ColumnViewProps) {
  const palette = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [listHeight, setListHeight] = useState(0);
  const isHome = entry.seed === null;
  const feed = useColumnFeed(entry, interests);
  const { backPan, columnStyle, riseStyle } = useColumnMotion({ isHome, isTop, screenWidth, entry: entryProgress, onBack });

  const cardWidth = screenWidth - LAYOUT.gutter * 2;
  const cardHeight = listHeight - LAYOUT.listTopPadding - LAYOUT.cardGap - LAYOUT.peek;
  const interval = cardHeight + LAYOUT.cardGap;
  const seedTitle = entry.seed?.title ?? null;

  const renderCard = useCallback(
    ({ item }: { item: Card }) => (
      <SwipeCard
        card={item}
        seedTitle={seedTitle}
        width={cardWidth}
        height={cardHeight}
        enabled={isTop}
        candidate={candidateCardId === item.pageId}
        hop={hop}
        onOpen={onOpen}
        pulseToken={pulse?.cardId === item.pageId ? pulse.token : undefined}
      />
    ),
    [seedTitle, cardWidth, cardHeight, isTop, candidateCardId, hop, onOpen, pulse],
  );

  return (
    <GestureDetector gesture={backPan}>
      <Animated.View style={[styles.column, { backgroundColor: palette.paper, paddingTop: insets.top }, !isHome && styles.pushed, columnStyle]}>
        <ColumnHeader entry={entry} entryProgress={entryProgress} onJump={onJump} />
        <Animated.View testID="column-list-area" style={[styles.listArea, riseStyle]} onLayout={(e) => setListHeight(e.nativeEvent.layout.height)}>
          {cardHeight > 0 && (
            <FlatList
              data={feed.cards}
              keyExtractor={(card) => String(card.pageId)}
              renderItem={renderCard}
              extraData={renderCard}
              showsVerticalScrollIndicator={false}
              snapToInterval={interval}
              decelerationRate="fast"
              contentContainerStyle={{ paddingTop: LAYOUT.listTopPadding, paddingBottom: LAYOUT.peek + insets.bottom }}
              ItemSeparatorComponent={CardGap}
              getItemLayout={(_, index) => ({ length: interval, offset: LAYOUT.listTopPadding + interval * index, index })}
              initialNumToRender={2}
              maxToRenderPerBatch={3}
              windowSize={5}
              // No removeClippedSubviews: on Android it left cards blank after the column re-rendered while hidden.
              onEndReached={feed.loadMore}
              onEndReachedThreshold={LOAD_MORE_THRESHOLD}
              ListEmptyComponent={feed.status === 'loading' ? <SkeletonCard width={cardWidth} height={cardHeight} /> : null}
              ListFooterComponent={
                feed.cards.length === 0 && feed.status === 'loading' ? null : <FeedStatusCard status={feed.status} isHome={isHome} onRetry={feed.retry} />
              }
            />
          )}
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

export const ColumnView = memo(ColumnViewImpl);

function CardGap() {
  return <View style={{ height: LAYOUT.cardGap }} />;
}

const styles = StyleSheet.create({
  column: { ...StyleSheet.absoluteFill },
  pushed: { shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 16, shadowOffset: { width: -4, height: 0 }, elevation: 8 },
  seedSlot: { height: LAYOUT.seedHeaderHeight, marginTop: LAYOUT.seedHeaderGap, marginHorizontal: LAYOUT.gutter },
  listArea: { flex: 1 },
});
