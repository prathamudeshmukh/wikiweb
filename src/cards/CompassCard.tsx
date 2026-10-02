import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Circle, G, Path, Text as SvgText } from 'react-native-svg';
import type { CardTopic } from '../content/topics';
import { FONT } from '../theme/fonts';
import { LAYOUT, TYPE } from '../theme/layout';
import { territoryColor } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

interface CompassCardProps {
  width: number;
  height: number;
  /** The seed's travel quote (travelQuote); null shows the compass alone. */
  quote: string | null;
  topic: CardTopic;
}

/** A load that outlasts this is clearly slow, so there's time to read; a quicker one never flashes text. */
export const QUOTE_DELAY_MS = 400;
// DESIGN.md §7: no single motion over 400 ms. The needle hunts in shrinking swings, then starts over.
const SWING_MS = 400;
const HUNT_DEGREES = [-38, 30, -18, 8, 0];
const REST_DEGREES = 45;
const QUOTE_FADE_MS = 200;
const DIAL_SIZE = 96;
const CARDINALS = [
  { label: 'N', x: 48, y: 15 },
  { label: 'S', x: 48, y: 87 },
  { label: 'E', x: 84, y: 51 },
  { label: 'W', x: 12, y: 51 },
] as const;

const SETTING_A_COURSE = 'Setting a course';
const WHILE_YOU_TRAVEL = 'While you travel';

function useNeedleStyle() {
  const reduceMotion = useReducedMotion();
  const degrees = useSharedValue(reduceMotion ? REST_DEGREES : 0);

  useEffect(() => {
    if (reduceMotion) return;
    const swings = HUNT_DEGREES.map((to) => withTiming(to, { duration: SWING_MS }));
    degrees.value = withRepeat(withSequence(...swings), -1);
  }, [reduceMotion, degrees]);

  return useAnimatedStyle(() => ({ transform: [{ rotate: `${degrees.value}deg` }] }));
}

function useQuoteRevealed(quote: string | null): boolean {
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    if (!quote) return;
    const timer = setTimeout(() => setRevealed(true), QUOTE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [quote]);
  return revealed && quote !== null;
}

function Dial({ needleColor }: { needleColor: string }) {
  const palette = useTheme();
  const needleStyle = useNeedleStyle();
  const centre = DIAL_SIZE / 2;
  return (
    <View style={styles.dial}>
      <Svg width={DIAL_SIZE} height={DIAL_SIZE} style={StyleSheet.absoluteFill}>
        <Circle cx={centre} cy={centre} r={centre - 2} fill="none" stroke={palette.line} strokeWidth={1.5} />
        <Circle cx={centre} cy={centre} r={centre - 10} fill="none" stroke={palette.line} strokeDasharray="2 5" />
        <G>
          {CARDINALS.map(({ label, x, y }) => (
            <SvgText key={label} x={x} y={y} fill={palette.muted} fontFamily={FONT.monoLight} fontSize={9} textAnchor="middle">
              {label}
            </SvgText>
          ))}
        </G>
      </Svg>
      <Animated.View style={[StyleSheet.absoluteFill, needleStyle]}>
        <Svg width={DIAL_SIZE} height={DIAL_SIZE}>
          <Path d="M48 18 L53 48 L48 51 L43 48 Z" fill={needleColor} />
          <Path d="M48 78 L53 48 L48 45 L43 48 Z" fill={palette.line} />
          <Circle cx={centre} cy={centre} r={3} fill={palette.card} stroke={palette.ink} />
        </Svg>
      </Animated.View>
    </View>
  );
}

/** Stands in for the first card while a column loads: a hunting compass, then the seed's quote (DESIGN.md §6.7). */
export function CompassCard({ width, height, quote, topic }: CompassCardProps) {
  const palette = useTheme();
  const accent = territoryColor(palette, topic.territory);
  const revealed = useQuoteRevealed(quote);
  const label = revealed ? `${SETTING_A_COURSE}. ${WHILE_YOU_TRAVEL}: ${quote}` : SETTING_A_COURSE;

  return (
    <View
      style={[styles.card, { width, height, backgroundColor: palette.card, borderColor: palette.line }]}
      accessibilityRole="progressbar"
      accessibilityLabel={label}
    >
      <Dial needleColor={accent} />
      <Text style={[styles.meta, { color: palette.muted }]}>{`${SETTING_A_COURSE.toUpperCase()}…`}</Text>
      {revealed && (
        <Animated.View entering={FadeIn.duration(QUOTE_FADE_MS)} style={styles.quoteBlock}>
          <Text style={[styles.meta, { color: accent }]}>{WHILE_YOU_TRAVEL.toUpperCase()}</Text>
          <Text style={[styles.quote, { color: palette.ink }]}>{quote}</Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: LAYOUT.gutter,
    borderRadius: LAYOUT.cardRadius,
    borderWidth: StyleSheet.hairlineWidth,
    padding: LAYOUT.cardPadding,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  dial: { width: DIAL_SIZE, height: DIAL_SIZE },
  meta: { fontFamily: FONT.mono, ...TYPE.meta, textAlign: 'center' },
  quoteBlock: { alignItems: 'center', gap: 10, marginTop: 16 },
  quote: { fontFamily: FONT.displayItalic, ...TYPE.travelQuote, textAlign: 'center' },
});
