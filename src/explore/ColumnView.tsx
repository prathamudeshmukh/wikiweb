import { memo, type ReactElement, useCallback, useState } from 'react';
import { type NativeScrollEvent, type NativeSyntheticEvent, type RefreshControlProps, StyleSheet, useWindowDimensions, View } from 'react-native';
import { FlatList, GestureDetector, RefreshControl } from 'react-native-gesture-handler';
import Animated, { type SharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CompassCard } from '../cards/CompassCard';
import { FeedStatusCard } from '../cards/FeedStatusCard';
import { SeedHeader } from '../cards/SeedHeader';
import type { Card } from '../content/card';
import type { FeedView } from '../feeds/useFeed';
import { useColumnHint } from '../hints/useColumnHint';
import { type JourneyMarks, useJourneyMarks } from '../journeys/useJourney';
import { useAppServices } from '../services/AppServices';
import { LAYOUT } from '../theme/layout';
import { useTheme } from '../theme/useTheme';
import { Breadcrumb } from './Breadcrumb';
import { type ColumnEntry, isSeeded, type SeededEntry } from './columnStack';
import { useDwellPrefetch } from './dwellPrefetch';
import { HomeHeader } from './HomeHeader';
import type { HopController } from './hopController';
import { SwipeCard } from './SwipeCard';
import { useColumnFeed } from './useColumnFeed';
import { useColumnMotion } from './useColumnMotion';
import { useColumnVisit } from './useExploreAnalytics';
import { useHomeFeed } from './useHomeFeed';

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
  onOpenLogbook: () => void;
  /** Nothing (the reader, the Logbook) is over the explore screen. */
  isScreenFocused: boolean;
}

/** A column's cards, plus what Home adds: pull-to-refresh, and a list that starts over with each fresh Home. */
interface ColumnFeed {
  view: FeedView;
  listKey?: string;
  refreshControl?: ReactElement<RefreshControlProps>;
  onUserScroll?: () => void;
}

// FlatList measures this in screen-heights; one card fills a screen, so this is ~5 cards from the end (SPEC.md §7).
const LOAD_MORE_THRESHOLD = 5;

/** The card with its visited / read badges brought up to date — the same object when nothing changed. */
function withMarks(card: Card, { visitedIds, readIds }: JourneyMarks): Card {
  const visited = card.visited || visitedIds.has(card.pageId);
  const read = card.read || readIds.has(card.pageId);
  return visited === card.visited && read === card.read ? card : { ...card, visited, read };
}

interface ColumnHeaderProps {
  entry: ColumnEntry;
  entryProgress: SharedValue<number> | null;
  onJump: (columnIndex: number) => void;
  onOpenLogbook: () => void;
}

function ColumnHeader({ entry, entryProgress, onJump, onOpenLogbook }: ColumnHeaderProps) {
  if (!entry.seed) return <HomeHeader onOpenLogbook={onOpenLogbook} />;
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

function HomeColumn(props: ColumnViewProps) {
  const { interests, isTop, onOpen } = props;
  const palette = useTheme();
  const home = useHomeFeed(interests, isTop);
  const { columnVisits } = useAppServices();
  const { touched, refresh } = home;
  const pullToRefresh = useCallback(() => {
    columnVisits.restart('refresh');
    refresh();
  }, [columnVisits, refresh]);
  const openFromHome = useCallback(
    (card: Card) => {
      touched();
      onOpen(card);
    },
    [touched, onOpen],
  );
  const refreshControl = (
    <RefreshControl refreshing={home.refreshing} onRefresh={pullToRefresh} tintColor={palette.muted} colors={[palette.ink]} progressBackgroundColor={palette.card} />
  );
  return <ColumnBody {...props} onOpen={openFromHome} feed={{ view: home, listKey: String(home.generation), refreshControl, onUserScroll: touched }} />;
}

function SeededColumn(props: ColumnViewProps & { entry: SeededEntry }) {
  const view = useColumnFeed(props.entry);
  return <ColumnBody {...props} feed={{ view }} />;
}

function ColumnViewImpl(props: ColumnViewProps) {
  const { entry } = props;
  return isSeeded(entry) ? <SeededColumn {...props} entry={entry} /> : <HomeColumn {...props} />;
}

function ColumnBody(props: ColumnViewProps & { feed: ColumnFeed }) {
  const { entry, isTop, entryProgress, candidateCardId, pulse, hop, onOpen, onBack, onJump, onOpenLogbook, isScreenFocused, feed } = props;
  const palette = useTheme();
  const marks = useJourneyMarks();
  const { width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [listHeight, setListHeight] = useState(0);
  const isHome = entry.seed === null;
  const { view } = feed;
  const dwell = useDwellPrefetch(entry, isTop);
  useColumnVisit({ entry, isTop, status: view.status, dwelling: dwell.dwelling });
  const { backPan, columnStyle, riseStyle } = useColumnMotion({ isHome, isTop, screenWidth, entry: entryProgress, onBack });

  const cardWidth = screenWidth - LAYOUT.gutter * 2;
  const cardHeight = listHeight - LAYOUT.listTopPadding - LAYOUT.cardGap - LAYOUT.peek;
  const interval = cardHeight + LAYOUT.cardGap;
  const seedTitle = entry.seed?.title ?? null;
  const hint = useColumnHint({ isHome, isTop, isScreenFocused, listKey: feed.listKey, cardCount: view.cards.length });
  const { settled, touchStarted, touchEnded } = hint;

  // Momentum end is the usual signal; a drag released without momentum (iOS, at a snap point) only ends the drag.
  const onScrollSettled = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => settled(Math.round(e.nativeEvent.contentOffset.y / interval)),
    [settled, interval],
  );

  const renderCard = useCallback(
    ({ item, index }: { item: Card; index: number }) => (
      <SwipeCard
        card={withMarks(item, marks)}
        seedTitle={seedTitle}
        width={cardWidth}
        height={cardHeight}
        enabled={isTop}
        candidate={candidateCardId === item.pageId}
        hop={hop}
        onOpen={onOpen}
        pulseToken={pulse?.cardId === item.pageId ? pulse.token : undefined}
        hint={index === hint.cardIndex ? hint.kind : null}
        peelToken={index === hint.cardIndex ? hint.peelToken : null}
      />
    ),
    [seedTitle, cardWidth, cardHeight, isTop, candidateCardId, hop, onOpen, pulse, marks, hint.cardIndex, hint.kind, hint.peelToken],
  );

  return (
    <GestureDetector gesture={backPan}>
      <Animated.View style={[styles.column, { backgroundColor: palette.paper, paddingTop: insets.top }, !isHome && styles.pushed, columnStyle]}>
        <ColumnHeader entry={entry} entryProgress={entryProgress} onJump={onJump} onOpenLogbook={onOpenLogbook} />
        <Animated.View
          testID="column-list-area"
          style={[styles.listArea, riseStyle]}
          onLayout={(e) => setListHeight(e.nativeEvent.layout.height)}
          onTouchStart={touchStarted}
          onTouchEnd={touchEnded}
          onTouchCancel={touchEnded}
        >
          {cardHeight > 0 && (
            <FlatList
              key={feed.listKey}
              testID="column-list"
              data={view.cards}
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
              viewabilityConfigCallbackPairs={dwell.viewabilityPairs}
              refreshControl={feed.refreshControl}
              onScrollBeginDrag={feed.onUserScroll}
              onScrollEndDrag={onScrollSettled}
              onMomentumScrollEnd={onScrollSettled}
              onEndReached={view.loadMore}
              onEndReachedThreshold={LOAD_MORE_THRESHOLD}
              ListEmptyComponent={
                view.status === 'loading' ? <CompassCard width={cardWidth} height={cardHeight} quote={entry.seedQuote} topic={entry.seedTopic} /> : null
              }
              ListFooterComponent={
                view.cards.length === 0 && view.status === 'loading' ? null : <FeedStatusCard status={view.status} isHome={isHome} onRetry={view.retry} />
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
