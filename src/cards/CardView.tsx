import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';
import type { GestureType } from 'react-native-gesture-handler';
import type { Card } from '../content/card';
import { FONT } from '../theme/fonts';
import { LAYOUT, TYPE } from '../theme/layout';
import { type Palette, territoryColor } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { useFittedLineCount } from './fittedLineCount';
import { TopicIcon } from './TopicIcon';
import { TopicLabelButton } from './TopicLabelButton';
import { topicLabel, whyLine } from './whyLine';

/** Makes the topic label a button (SPEC.md §3.9): only on interactive cards whose tile has a tree. */
export interface TopicButton {
  onPress: () => void;
  /** The card's tap, blocked while the label takes the touch. */
  blocks: GestureType;
  enabled: boolean;
}

interface CardViewProps {
  card: Card;
  /** Title of the column's seed; null on Home. */
  seedTitle: string | null;
  topicButton?: TopicButton;
}

const TYPOGRAPHIC_ICON_SIZE = 48;

/** A card's face (DESIGN.md §5.1 / §5.2). Layout only — gestures live in SwipeCard. */
export function CardView({ card, seedTitle, topicButton }: CardViewProps) {
  const palette = useTheme();
  const accent = territoryColor(palette, card.topic.territory);
  const label = topicLabel(card);

  return (
    // Keyed by theme: on Android, switching Night atlas → Paper adds elevation at runtime, which left the clipping
    // outline stale and hid every child of the card. A fresh view per theme gets a fresh outline.
    <View
      ph-no-capture
      key={palette.cardShadow ? 'paper' : 'night'}
      style={[styles.card, surface(palette)]}
      accessible
      accessibilityLabel={[card.title, card.description, card.visited && 'Visited on this expedition', card.read && 'Read'].filter(Boolean).join('. ')}
    >
      {card.thumbnail ? (
        <>
          <Image
            source={{ uri: card.thumbnail.url }}
            style={[styles.image, { borderColor: palette.line }]}
            contentFit="cover"
            transition={150}
            accessibilityLabel={card.description ?? card.title}
          />
          <Text style={[styles.title, { color: palette.ink }]} numberOfLines={3}>{card.title}</Text>
        </>
      ) : (
        <View style={[styles.block, { backgroundColor: accent }]}>
          <Text style={[styles.blockTitle, { color: palette.onTerritory }]} numberOfLines={4}>{card.title}</Text>
          <View style={styles.blockIcon}>
            <TopicIcon tileId={card.topic.tileId} size={TYPOGRAPHIC_ICON_SIZE} color={palette.onTerritory} />
          </View>
        </View>
      )}
      <View style={styles.metaRow}>
        {topicButton && label ? (
          <>
            <TopicLabelButton label={label} color={accent} {...topicButton} />
            <Text style={[styles.meta, styles.metaText, { color: palette.muted }]} numberOfLines={1}>
              {card.description ? `· ${card.description.toUpperCase()}` : ''}
            </Text>
          </>
        ) : (
          <Text style={[styles.meta, styles.metaText]} numberOfLines={1}>
            <Text style={{ color: accent }}>●{label ? ` ${label.toUpperCase()}` : ''}</Text>
            {card.description ? <Text style={{ color: palette.muted }}> · {card.description.toUpperCase()}</Text> : null}
          </Text>
        )}
        <Badges visited={card.visited} read={card.read} color={palette.muted} />
      </View>
      {card.extract ? <Extract text={card.extract} color={palette.ink} /> : null}
      <Text style={[styles.why, { color: palette.muted }]} numberOfLines={1}>{whyLine(card, seedTitle)}</Text>
    </View>
  );
}

/** The extract takes whatever height the card has left and fills it with whole lines (DESIGN.md §5.1). */
function Extract({ text, color }: { text: string; color: string }) {
  const { lines, onLayout } = useFittedLineCount(TYPE.body.lineHeight, TYPE.extractFallbackLines);
  return (
    <View testID="card-extract-area" style={styles.extractArea} onLayout={onLayout}>
      <Text style={[styles.extract, { color }]} numberOfLines={lines}>{text}</Text>
    </View>
  );
}

/** Visited ◌ (elsewhere on this expedition) and read ✓, never colour-coded (DESIGN.md §5.4). */
function Badges({ visited, read, color }: { visited: boolean; read: boolean; color: string }) {
  if (!visited && !read) return null;
  const label = [visited && 'visited on this expedition', read && 'read'].filter(Boolean).join(', ');
  return (
    <Text style={[styles.meta, { color }]} accessibilityLabel={label}>
      {[visited && '◌', read && '✓'].filter(Boolean).join(' ')}
    </Text>
  );
}

function surface(palette: Palette) {
  return palette.cardShadow
    ? { backgroundColor: palette.card, shadowColor: palette.ink, shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 3 }
    : { backgroundColor: palette.card, borderWidth: 1, borderColor: palette.line };
}

const styles = StyleSheet.create({
  card: { flex: 1, borderRadius: LAYOUT.cardRadius, padding: LAYOUT.cardPadding, gap: 12, overflow: 'hidden' },
  image: { width: '100%', aspectRatio: LAYOUT.imageAspect, borderRadius: LAYOUT.imageRadius, borderWidth: StyleSheet.hairlineWidth },
  title: { fontFamily: FONT.display, ...TYPE.cardTitle },
  block: { aspectRatio: LAYOUT.imageAspect, borderRadius: LAYOUT.imageRadius, padding: 18, justifyContent: 'space-between' },
  blockTitle: { fontFamily: FONT.display, ...TYPE.typographicTitle },
  blockIcon: { alignItems: 'flex-end' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  meta: { fontFamily: FONT.mono, ...TYPE.meta },
  metaText: { flex: 1 },
  extractArea: { flex: 1, overflow: 'hidden' },
  extract: { fontFamily: FONT.body, ...TYPE.body },
  why: { marginTop: 'auto', fontFamily: FONT.monoLight, ...TYPE.meta },
});
