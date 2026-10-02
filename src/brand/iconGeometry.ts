// Runtime imports in src/brand carry explicit .ts extensions so scripts/build-icons.ts can run them under plain Node.
import { TANGENT_GLYPH } from './tangentGlyph.ts';

export const STAR = '✦';
const GAP = ' ';
const TOP_DEG = -90;
const FULL_TURN_DEG = 360;

export interface Point {
  x: number;
  y: number;
}

export interface RimBand {
  /** Outer edge of the inner ring. */
  inner: number;
  /** Inner edge of the outer ring. */
  outer: number;
}

export interface SafeZone {
  stampRadius: number;
  canvas: number;
  /** Diameter of the launcher's guaranteed-visible circle as a fraction of the canvas. */
  safeZoneFraction: number;
}

/** Each letter, star and gap gets one equal slot round the ring, so the space either side of a star always matches. */
export function rimSlots(rim: string): string[] {
  const tokens = rim.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) throw new Error('Rim text is empty');
  return tokens.flatMap((token) => [...token, GAP]);
}

/** Angle of every slot, with the lead word (the first one) centred at the top of the ring. */
export function slotAnglesDeg(slotCount: number, leadLength: number): number[] {
  if (leadLength > slotCount) throw new Error(`Lead word does not fit: ${leadLength} letters, ${slotCount} slots`);
  const step = FULL_TURN_DEG / slotCount;
  const start = TOP_DEG - ((leadLength - 1) / 2) * step;
  return Array.from({ length: slotCount }, (_, i) => start + i * step);
}

/** Baseline radius that centres capitals of the given height between the two rings. */
export function capCentredBaseline(band: RimBand, capHeight: number): number {
  if (band.inner >= band.outer) throw new Error(`Rim band is inverted: inner ${band.inner} ≥ outer ${band.outer}`);
  return (band.inner + band.outer) / 2 - capHeight / 2;
}

/** Scale that fits the whole stamp inside a launcher's safe zone (Android adaptive icons: 66 dp of 108 dp). */
export function safeZoneScale({ stampRadius, canvas, safeZoneFraction }: SafeZone): number {
  if (safeZoneFraction <= 0 || safeZoneFraction > 1) throw new Error(`Safe-zone fraction must be in (0, 1], got ${safeZoneFraction}`);
  return (canvas * safeZoneFraction) / 2 / stampRadius;
}

/** Where the glyph's 24-unit grid starts so that its circle — not its bounding box — sits on the centre. */
export function glyphOrigin(centre: Point, scale: number): Point {
  if (scale <= 0) throw new Error(`Glyph scale must be positive, got ${scale}`);
  const { cx, cy } = TANGENT_GLYPH.circle;
  return { x: centre.x - cx * scale, y: centre.y - cy * scale };
}

export function polar(centre: Point, radius: number, deg: number): Point {
  const rad = (deg * Math.PI) / 180;
  return { x: centre.x + radius * Math.cos(rad), y: centre.y + radius * Math.sin(rad) };
}
