// The app icon artwork as SVG (DESIGN.md §9). Rendered to PNGs by scripts/build-icons.ts.
import { capCentredBaseline, glyphOrigin, type Point, polar, rimSlots, slotAnglesDeg, STAR } from './iconGeometry.ts';
import { TANGENT_GLYPH } from './tangentGlyph.ts';

export const ICON_CANVAS = 1024;
const CENTRE: Point = { x: ICON_CANVAS / 2, y: ICON_CANVAS / 2 };

export const RIM_TEXT = 'TANGENT ✦ TANGENT ✦';
const LEAD_WORD = 'TANGENT';
const OUTER_RING = { radius: 410, stroke: 24 };
const INNER_RING = { radius: 300, stroke: 9 };
const TEXT_SIZE = 62;
const PLEX_MONO_CAP_HEIGHT_EM = 0.698;
const CAP_HEIGHT = TEXT_SIZE * PLEX_MONO_CAP_HEIGHT_EM;
const STAR_TO_CAP_RATIO = 0.95;
const STAR_SIZE = CAP_HEIGHT * STAR_TO_CAP_RATIO;
// Slot angles are measured from 3 o'clock; a letter at angle θ turns θ + 90° so its top faces outward.
const LETTER_UPRIGHT_OFFSET_DEG = 90;
const STAR_WAIST = 0.28;
const GLYPH_SCALE = 19;
// Breathing room round the bare glyph, as a fraction of its larger side.
const GLYPH_PADDING = 0.15;
export const RIM_FONT_FAMILY = 'IBM Plex Mono';
// Must match the font file the build loads (IBMPlexMono_600SemiBold.ttf).
const RIM_FONT_WEIGHT = 600;

/** Distance from the centre to the outside of the outer ring. */
export const STAMP_RADIUS = OUTER_RING.radius + OUTER_RING.stroke / 2;

// Displacement roughens every contour; a high-frequency mask knocks out sparse voids like uneven ink.
// Fixed seeds keep the build reproducible.
const INK_FILTER = `
  <filter id="ink" x="-6%" y="-6%" width="112%" height="112%">
    <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="7" result="warp"/>
    <feDisplacementMap in="SourceGraphic" in2="warp" scale="9" xChannelSelector="R" yChannelSelector="G" result="rough"/>
    <feTurbulence type="fractalNoise" baseFrequency="0.45" numOctaves="2" seed="3" result="grain"/>
    <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -14 0 0 0 10.2" result="voids"/>
    <feComposite in="rough" in2="voids" operator="in"/>
  </filter>`;

export interface StampOptions {
  ink: string;
  /** null leaves the canvas transparent (tinted, monochrome, adaptive foreground, splash). */
  background: string | null;
  /** 1 fills the canvas as the iOS icon does; smaller values fit a launcher safe zone. */
  scale?: number;
}

export interface GlyphOptions {
  ink: string;
  background: string;
  size: number;
}

const fmt = (n: number) => n.toFixed(2);

function ring(radius: number, stroke: number, ink: string): string {
  return `<circle cx="${CENTRE.x}" cy="${CENTRE.y}" r="${radius}" fill="none" stroke="${ink}" stroke-width="${stroke}"/>`;
}

/** Four-pointed star centred on a point, drawn as a shape so it never depends on a fallback font. */
function star({ x, y }: Point, ink: string): string {
  const r = STAR_SIZE / 2;
  const w = r * STAR_WAIST;
  const d = [
    `M${fmt(x)},${fmt(y - r)}`,
    `Q${fmt(x + w)},${fmt(y - w)} ${fmt(x + r)},${fmt(y)}`,
    `Q${fmt(x + w)},${fmt(y + w)} ${fmt(x)},${fmt(y + r)}`,
    `Q${fmt(x - w)},${fmt(y + w)} ${fmt(x - r)},${fmt(y)}`,
    `Q${fmt(x - w)},${fmt(y - w)} ${fmt(x)},${fmt(y - r)}Z`,
  ].join(' ');
  return `<path data-role="star" d="${d}" fill="${ink}"/>`;
}

interface RimPlacement {
  at: Point;
  deg: number;
}

function letter(char: string, { at, deg }: RimPlacement, ink: string): string {
  const turn = fmt(deg + LETTER_UPRIGHT_OFFSET_DEG);
  return (
    `<text x="${fmt(at.x)}" y="${fmt(at.y)}" transform="rotate(${turn} ${fmt(at.x)} ${fmt(at.y)})" text-anchor="middle" ` +
    `fill="${ink}" font-family="${RIM_FONT_FAMILY}" font-weight="${RIM_FONT_WEIGHT}" font-size="${TEXT_SIZE}">${char}</text>`
  );
}

function rim(ink: string): string {
  const slots = rimSlots(RIM_TEXT);
  const angles = slotAnglesDeg(slots.length, LEAD_WORD.length);
  const baseline = capCentredBaseline(
    { inner: INNER_RING.radius + INNER_RING.stroke / 2, outer: OUTER_RING.radius - OUTER_RING.stroke / 2 },
    CAP_HEIGHT,
  );
  return slots
    .map((char, i) => {
      if (char === STAR) return star(polar(CENTRE, baseline + CAP_HEIGHT / 2, angles[i]), ink);
      if (char.trim() === '') return '';
      return letter(char, { at: polar(CENTRE, baseline, angles[i]), deg: angles[i] }, ink);
    })
    .join('');
}

/** The glyph's own shapes on its 24-unit grid; callers place and scale it. */
function glyphShapes(ink: string): string {
  const { strokeWidth, circle, tangent, dot } = TANGENT_GLYPH;
  return (
    `<circle cx="${circle.cx}" cy="${circle.cy}" r="${circle.r}" fill="none" stroke="${ink}" stroke-width="${strokeWidth}"/>` +
    `<path d="M${tangent.x1} ${tangent.y1} L${tangent.x2} ${tangent.y2}" stroke="${ink}" stroke-width="${strokeWidth}" stroke-linecap="round"/>` +
    `<circle cx="${dot.cx}" cy="${dot.cy}" r="${dot.r}" fill="${ink}"/>`
  );
}

function centredGlyph(ink: string): string {
  const origin = glyphOrigin(CENTRE, GLYPH_SCALE);
  return `<g transform="translate(${fmt(origin.x)} ${fmt(origin.y)}) scale(${GLYPH_SCALE})">${glyphShapes(ink)}</g>`;
}

function backdrop(background: string | null, size: number): string {
  return background ? `<rect width="${size}" height="${size}" fill="${background}"/>` : '';
}

/** The full stamp: double ring, rim text, glyph — inked, upright, on a square canvas. */
export function stampSvg({ ink, background, scale = 1 }: StampOptions): string {
  if (scale <= 0) throw new Error(`Stamp scale must be positive, got ${scale}`);
  const fit = `translate(${CENTRE.x} ${CENTRE.y}) scale(${scale}) translate(${-CENTRE.x} ${-CENTRE.y})`;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${ICON_CANVAS}" height="${ICON_CANVAS}" viewBox="0 0 ${ICON_CANVAS} ${ICON_CANVAS}">` +
    `<defs>${INK_FILTER}</defs>` +
    backdrop(background, ICON_CANVAS) +
    `<g transform="${fit}"><g filter="url(#ink)">` +
    ring(OUTER_RING.radius, OUTER_RING.stroke, ink) +
    ring(INNER_RING.radius, INNER_RING.stroke, ink) +
    rim(ink) +
    centredGlyph(ink) +
    `</g></g></svg>`
  );
}

/** A square view box centred on the glyph's ink (not its 24-unit grid), with padding. */
function paddedGlyphBox(): { x: number; y: number; side: number } {
  const { strokeWidth, circle, tangent, dot } = TANGENT_GLYPH;
  const left = circle.cx - circle.r - strokeWidth / 2;
  const right = dot.cx + dot.r;
  const top = Math.min(tangent.y1 - strokeWidth / 2, dot.cy - dot.r);
  const bottom = circle.cy + circle.r + strokeWidth / 2;
  const side = Math.max(right - left, bottom - top) * (1 + 2 * GLYPH_PADDING);
  return { x: (left + right) / 2 - side / 2, y: (top + bottom) / 2 - side / 2, side };
}

/** The bare glyph, for sizes where the stamp would be a grey disc (favicon). */
export function glyphSvg({ ink, background, size }: GlyphOptions): string {
  if (size <= 0) throw new Error(`Glyph size must be positive, got ${size}`);
  const box = paddedGlyphBox();
  const viewBox = [box.x, box.y, box.side, box.side].map(fmt).join(' ');
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="${viewBox}">` +
    `<rect x="${fmt(box.x)}" y="${fmt(box.y)}" width="${fmt(box.side)}" height="${fmt(box.side)}" fill="${background}"/>` +
    glyphShapes(ink) +
    `</svg>`
  );
}
