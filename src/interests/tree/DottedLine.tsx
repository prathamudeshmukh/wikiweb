import type { StyleProp, ViewStyle } from 'react-native';
import Svg, { Line } from 'react-native-svg';

interface DottedLineProps {
  direction: 'vertical' | 'horizontal';
  color: string;
  /** Positions the line; its length is the box's height (vertical) or width (horizontal). */
  style: StyleProp<ViewStyle>;
}

// The breadcrumb's route (DESIGN.md §5.6): 2 pt dots, 4 pt gaps. A near-zero dash with round caps draws a dot.
const DOT = 2;
const DASH = '0.01 6';

/** A dotted route line of any length — one-sided dotted borders don't draw on iOS or Android. */
export function DottedLine({ direction, color, style }: DottedLineProps) {
  const vertical = direction === 'vertical';
  return (
    <Svg style={style} width={vertical ? DOT : '100%'} height={vertical ? '100%' : DOT} pointerEvents="none">
      <Line
        x1={DOT / 2}
        y1={DOT / 2}
        x2={vertical ? DOT / 2 : '100%'}
        y2={vertical ? '100%' : DOT / 2}
        stroke={color}
        strokeWidth={DOT}
        strokeDasharray={DASH}
        strokeLinecap="round"
      />
    </Svg>
  );
}
