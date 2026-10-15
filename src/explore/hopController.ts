import { Platform } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import type { Card } from '../content/card';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * One hop = one shared progress value (0 → 1) driving everything on the UI thread: the flying card,
 * the incoming column, its first card's rise and the breadcrumb route. React prepares the next column
 * when a drag starts and files it into the stack after it lands, so the release frame never waits on JS
 * (validated in the M0 prototype; mounting at release stalled ~300 ms).
 */
export interface HopController {
  progress: SharedValue<number>;
  from: SharedValue<Rect>;
  tiltDeg: SharedValue<number>;
  /** JS: a card started dragging — mount its column offscreen now (its feed starts loading too). */
  prepare: (card: Card) => void;
  /** JS: release passed the threshold (haptics). */
  committed: () => void;
  /** JS: flight finished — enter the prepared column. */
  landed: () => void;
}

// SPEC.md §4.2 — preset A, confirmed on device in M0.
export const GESTURE = {
  commitRatio: 0.35,
  commitVelocity: 800,
  maxTiltDeg: 3,
  lockSlop: 10,
  spring: { damping: 18, stiffness: 180 },
  /** Offsets far outside any real drag, used to make a pan one-directional. */
  unreachable: 100000,
  /**
   * Web: drags starting this close to a screen edge are the browser's (iOS edge swipe, Android back gesture), so the
   * app ignores them (SPEC.md §15.3). Native: the OS keeps its own edges.
   */
  edgeGuard: Platform.OS === 'web' ? 20 : 0,
  /** Web: the browser keeps vertical drags (native scrolling); the app gets the horizontal ones. */
  webTouchAction: 'pan-y',
} as const;

/** Whether a drag starting at `x` belongs to the browser's edge gestures rather than the app. */
export function isAtScreenEdge(x: number, screenWidth: number, guard: number): boolean {
  'worklet';
  return x < guard || x > screenWidth - guard;
}
