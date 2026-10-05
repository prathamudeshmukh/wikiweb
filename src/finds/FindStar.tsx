import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { FIND } from '../config/constants';

// The four-point ✦ of the app-icon rim (DESIGN.md §5.11): concave sides on a 24-unit grid.
const STAR_PATH = 'M12 1.5 C12.9 8.2 15.8 11.1 22.5 12 C15.8 12.9 12.9 15.8 12 22.5 C11.1 15.8 8.2 12.9 1.5 12 C8.2 11.1 11.1 8.2 12 1.5 Z';
const OUTLINE_WIDTH = 1.6;

interface FindStarProps {
  found: boolean;
  size: number;
  /** Solid colour: the card's territory (ink when it has none). */
  color: string;
  /** Outline colour while not found. */
  outlineColor: string;
}

/** ✦ — outline when not kept, solid when kept. Filling spreads from the centre; emptying is instant. */
export function FindStar({ found, size, color, outlineColor }: FindStarProps) {
  const reduceMotion = useReducedMotion();
  const fill = useSharedValue(found ? 1 : 0);
  const wasFound = useRef(found);

  useEffect(() => {
    const filling = found && !wasFound.current;
    wasFound.current = found;
    fill.set(filling ? withTiming(1, { duration: FIND.fillMs }) : found ? 1 : 0);
  }, [found, fill]);

  const solidStyle = useAnimatedStyle(() =>
    reduceMotion ? { opacity: fill.value } : { opacity: fill.value > 0 ? 1 : 0, transform: [{ scale: fill.value }] },
  );

  return (
    <View style={{ width: size, height: size }} testID={found ? 'find-star-solid' : 'find-star-outline'}>
      {!found && (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d={STAR_PATH} fill="none" stroke={outlineColor} strokeWidth={OUTLINE_WIDTH} strokeLinejoin="round" />
        </Svg>
      )}
      <Animated.View style={[StyleSheet.absoluteFill, solidStyle]}>
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d={STAR_PATH} fill={color} />
        </Svg>
      </Animated.View>
    </View>
  );
}
