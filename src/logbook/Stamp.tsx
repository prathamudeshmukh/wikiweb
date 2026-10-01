import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';
import { TopicIcon } from '../cards/TopicIcon';
import type { TopicTile } from '../config/topicTiles';
import { FONT } from '../theme/fonts';
import { useTheme } from '../theme/useTheme';
import { stampTiltDeg } from './logbookFormat';

interface StampProps {
  tile: TopicTile;
  collected: boolean;
  size: number;
}

const OUTER_STROKE = 2;
const INNER_STROKE = 1;
const RING_GAP = 4;
const LABEL_RATIO = 0.115;
const ICON_RATIO = 0.32;
const DASH = '3 3';
const UNCOLLECTED_ICON_OPACITY = 0.25;
const LETTER_SPACING_EM = 0.12;
// IBM Plex Mono advances every glyph by 0.6 em, so letters can be spaced round the rim without measuring them.
const MONO_ADVANCE_EM = 0.6;
const TOP = -Math.PI / 2;

interface RimLetter {
  char: string;
  x: number;
  y: number;
  rotateDeg: number;
}

/**
 * The label's letters set round the top of a circle, centred. Placed one by one rather than with a TextPath,
 * because Android ignores TextPath's textAnchor and startOffset.
 */
function rimLetters(label: string, centre: number, radius: number, fontSize: number): RimLetter[] {
  const step = (fontSize * (MONO_ADVANCE_EM + LETTER_SPACING_EM)) / radius;
  const first = TOP - (step * (label.length - 1)) / 2;
  return [...label].map((char, i) => {
    const angle = first + step * i;
    return { char, x: centre + radius * Math.cos(angle), y: centre + radius * Math.sin(angle), rotateDeg: (angle - TOP) * (180 / Math.PI) };
  });
}

/** The stamp for one topic (DESIGN.md §5.7): double ring in the territory colour, name round the rim, icon inside. */
export function Stamp({ tile, collected, size }: StampProps) {
  const palette = useTheme();
  const centre = size / 2;
  const outer = centre - OUTER_STROKE;
  const inner = outer - RING_GAP;
  const labelSize = size * LABEL_RATIO;
  const labelRadius = inner - labelSize * 1.1;
  const ink = collected ? palette.territory[tile.territory] : palette.line;
  const letters = rimLetters(tile.label.toUpperCase(), centre, labelRadius, labelSize);

  return (
    <View
      style={{ width: size, height: size, transform: [{ rotate: `${collected ? stampTiltDeg(tile.id) : 0}deg` }] }}
      accessible
      accessibilityLabel={`${tile.label} stamp${collected ? '' : ', not collected yet'}`}
    >
      <Svg width={size} height={size}>
        <Circle cx={centre} cy={centre} r={outer} stroke={ink} strokeWidth={OUTER_STROKE} fill="none" strokeDasharray={collected ? undefined : DASH} />
        {collected && <Circle cx={centre} cy={centre} r={inner} stroke={ink} strokeWidth={INNER_STROKE} fill="none" />}
        {letters.map(({ char, x, y, rotateDeg }, i) => (
          <SvgText
            key={i}
            x={x}
            y={y}
            fill={collected ? ink : palette.muted}
            fontFamily={FONT.mono}
            fontSize={labelSize}
            textAnchor="middle"
            alignmentBaseline="central"
            transform={`rotate(${rotateDeg} ${x} ${y})`}
          >
            {char}
          </SvgText>
        ))}
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.icon, !collected && { opacity: UNCOLLECTED_ICON_OPACITY }]}>
        <TopicIcon tileId={tile.id} size={size * ICON_RATIO} color={collected ? ink : palette.ink} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  icon: { alignItems: 'center', justifyContent: 'center' },
});
