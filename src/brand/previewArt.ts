// The 1200 × 630 share preview (Open Graph / X card) as SVG. Rendered to a PNG by scripts/build-og.ts.
// Layout is the "Bands" composition chosen in .lavish/tangent-og-preview-mockup.html.
import { PAPER } from '../theme/tokens.ts';
import { glyphShapes } from './iconArt.ts';
import { ATOM, type DuotoneIcon, DUOTONE_OPACITY, PAW_PRINT, PHOSPHOR_GRID } from './previewIcons.ts';
import { TANGENT_GLYPH } from './tangentGlyph.ts';

export const PREVIEW_CANVAS = { width: 1200, height: 630 } as const;
// WhatsApp and some Slack layouts crop the preview to its centred square.
export const SQUARE_CROP = {
  left: (PREVIEW_CANVAS.width - PREVIEW_CANVAS.height) / 2,
  right: (PREVIEW_CANVAS.width + PREVIEW_CANVAS.height) / 2,
} as const;

export const SERIF_FAMILY = 'Fraunces';
export const MONO_FAMILY = 'IBM Plex Mono';
// Plex Mono is monospaced: every glyph advances 600 units of a 1000-unit em.
const MONO_ADVANCE_EM = 0.6;

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const PREVIEW_LAYOUT = {
  margin: 56,
  wordmark: { baseline: 96, size: 40 },
  pitch: { baseline: 330, size: 40, lineHeight: 47 },
  linkedCard: { x: 676, y: 80, width: 330, height: 470 },
  swipingCard: { x: 330, y: 74, width: 330, height: 470 },
  swipeTiltDeg: -6,
  swipeLabel: { x: 696, baseline: 600, size: 14 },
  route: { x: 940, baseline: 600, size: 13 },
} as const;

const PITCH_LINES = ['Wikipedia,', 'one swipe', 'at a time'];

type WhyMark = 'interest' | 'linked';

interface CardContent {
  territory: string;
  titleLines: readonly string[];
  topic: string;
  minutes: number;
  why: { mark: WhyMark; label: string };
  icon: DuotoneIcon;
}

const OCTOPUS: CardContent = {
  territory: PAPER.territory.life,
  titleLines: ['Octopus'],
  topic: 'ANIMALS',
  minutes: 6,
  why: { mark: 'interest', label: 'YOU LIKE ANIMALS' },
  icon: PAW_PRINT,
};

const CEPHALOPOD_INTELLIGENCE: CardContent = {
  territory: PAPER.territory.cosmos,
  titleLines: ['Cephalopod', 'intelligence'],
  topic: 'SCIENCE',
  minutes: 4,
  why: { mark: 'linked', label: 'LINKED FROM OCTOPUS' },
  icon: ATOM,
};

const CARD = {
  padding: 20,
  radius: 20,
  blockRadius: 14,
  blockAspect: 10 / 16,
  titleSize: 34,
  titleLineHeight: 38,
  titleInset: 18,
  iconSize: 48,
  metaGap: 34,
  metaSize: 12,
  // Stand-ins for the extract: the preview carries no Wikipedia text (CC BY-SA attribution stays in the app).
  extractBarWidths: [0.94, 0.88, 0.97, 0.62],
  extractBarHeight: 9,
  extractLineHeight: 27,
} as const;

// "Paper lift" card shadow (DESIGN.md §4).
const LIFT_FILTER = `
  <filter id="lift" x="-20%" y="-20%" width="140%" height="140%">
    <feDropShadow dx="0" dy="2" stdDeviation="0" flood-color="${PAPER.line}"/>
    <feDropShadow dx="0" dy="12" stdDeviation="12" flood-color="${PAPER.ink}" flood-opacity="0.1"/>
  </filter>`;

const fmt = (n: number) => n.toFixed(2);

const XML_ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
const escapeXml = (text: string) => text.replace(/[&<>"]/g, (char) => XML_ESCAPES[char]);

interface TextStyle {
  family: string;
  weight: number;
  size: number;
  fill: string;
  tracking?: number;
}

function text(content: string, x: number, y: number, style: TextStyle, attrs = ''): string {
  const tracking = style.tracking ? ` letter-spacing="${style.tracking}"` : '';
  return (
    `<text x="${fmt(x)}" y="${fmt(y)}" font-family="${style.family}" font-weight="${style.weight}" ` +
    `font-size="${style.size}" fill="${style.fill}"${tracking}${attrs}>${escapeXml(content)}</text>`
  );
}

const monoStyle = (size: number, weight: number, fill: string): TextStyle => ({
  family: MONO_FAMILY,
  weight,
  size,
  fill,
  tracking: size * 0.08,
});

function monoWidth(content: string, style: TextStyle): number {
  return [...content].length * (style.size * MONO_ADVANCE_EM + (style.tracking ?? 0));
}

function wordmark(): string {
  const { margin, wordmark: { baseline, size } } = PREVIEW_LAYOUT;
  // The glyph sits a little larger than the letters' x-height and rides above the baseline, as in the Home header.
  const glyphSize = size * 1.05;
  const scale = glyphSize / TANGENT_GLYPH.viewBox;
  const glyph = `<g transform="translate(${margin} ${fmt(baseline - size * 0.86)}) scale(${scale})">${glyphShapes(PAPER.ink)}</g>`;
  const word = text('tangent', margin + size * 1.15, baseline, { family: SERIF_FAMILY, weight: 700, size, fill: PAPER.ink });
  return glyph + word;
}

function pitch(): string {
  const { margin, pitch: { baseline, size, lineHeight } } = PREVIEW_LAYOUT;
  const style: TextStyle = { family: SERIF_FAMILY, weight: 600, size, fill: PAPER.ink };
  return PITCH_LINES.map((line, i) => text(line, margin, baseline + i * lineHeight, style, ' data-role="pitch"')).join('');
}

function duotone(icon: DuotoneIcon, x: number, y: number, color: string): string {
  const scale = CARD.iconSize / PHOSPHOR_GRID;
  return (
    `<g transform="translate(${fmt(x)} ${fmt(y)}) scale(${scale})" fill="${color}">` +
    `<path d="${icon.back}" opacity="${DUOTONE_OPACITY}"/><path d="${icon.front}"/></g>`
  );
}

/** `● ANIMALS · 6 MIN`: dot and topic in the territory colour, reading time muted. */
function metaLine({ territory, topic, minutes }: CardContent, x: number, baseline: number): string {
  const style = monoStyle(CARD.metaSize, 500, territory);
  const dot = `<circle cx="${x + 4}" cy="${baseline - 4}" r="4" fill="${territory}"/>`;
  const topicX = x + 14;
  const time = text(`· ${minutes} MIN`, topicX + monoWidth(`${topic} `, style), baseline, { ...style, fill: PAPER.muted });
  return dot + text(topic, topicX, baseline, style) + time;
}

// ★ and ↳ (DESIGN.md §5.3) are missing from Plex Mono, so they're drawn as shapes on a cap-height box.
function whyMark(mark: WhyMark, x: number, baseline: number): string {
  const cap = CARD.metaSize * 0.7;
  const role = 'data-role="why-mark"';
  if (mark === 'linked') {
    const [left, top, right] = [x + 1, baseline - cap, x + cap];
    const head = cap * 0.35;
    const d = `M${fmt(left)} ${fmt(top)} V${fmt(baseline)} H${fmt(right)} M${fmt(right - head)} ${fmt(baseline - head)} L${fmt(right)} ${fmt(baseline)} L${fmt(right - head)} ${fmt(baseline + head)}`;
    return `<path ${role} d="${d}" fill="none" stroke="${PAPER.muted}" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  const centre = { x: x + cap / 2, y: baseline - cap / 2 };
  const points = Array.from({ length: 10 }, (_, i) => {
    const radius = i % 2 === 0 ? cap * 0.6 : cap * 0.25;
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    return `${fmt(centre.x + radius * Math.cos(angle))},${fmt(centre.y + radius * Math.sin(angle))}`;
  });
  return `<polygon ${role} points="${points.join(' ')}" fill="${PAPER.muted}"/>`;
}

/** `↳ LINKED FROM OCTOPUS`: the mark takes one mono cell, then a space, then the label. */
function whyLine({ mark, label }: CardContent['why'], x: number, baseline: number): string {
  const style = monoStyle(CARD.metaSize, 400, PAPER.muted);
  return whyMark(mark, x, baseline) + text(label, x + monoWidth('★ ', style), baseline, style);
}

/** The typographic article card (DESIGN.md §5.2): territory block with title and icon, meta, extract, why-line. */
function card(content: CardContent, box: Box, tiltDeg = 0): string {
  const { padding } = CARD;
  const blockWidth = box.width - padding * 2;
  const blockHeight = Math.round(blockWidth * CARD.blockAspect);
  const blockBottom = padding + blockHeight;
  const titleStyle: TextStyle = { family: SERIF_FAMILY, weight: 600, size: CARD.titleSize, fill: PAPER.onTerritory };
  const lastLine = content.titleLines.length - 1;
  const title = content.titleLines
    .map((line, i) => text(line, padding + CARD.titleInset, blockBottom - 22 - (lastLine - i) * CARD.titleLineHeight, titleStyle))
    .join('');
  const iconX = padding + blockWidth - CARD.titleInset - CARD.iconSize;
  const metaY = blockBottom + CARD.metaGap;
  const meta = metaLine(content, padding, metaY);
  const extract = CARD.extractBarWidths
    .map((fraction, i) => {
      const y = metaY + 26 + i * CARD.extractLineHeight;
      return `<rect x="${padding}" y="${y}" width="${Math.round(blockWidth * fraction)}" height="${CARD.extractBarHeight}" rx="${CARD.extractBarHeight / 2}" fill="${PAPER.line}"/>`;
    })
    .join('');
  const why = whyLine(content.why, padding, box.height - padding - 2);
  const tilt = tiltDeg ? ` rotate(${tiltDeg} ${box.width / 2} ${box.height / 2})` : '';
  return (
    `<g transform="translate(${box.x} ${box.y})${tilt}">` +
    `<rect width="${box.width}" height="${box.height}" rx="${CARD.radius}" fill="${PAPER.card}" filter="url(#lift)"/>` +
    `<rect x="${padding}" y="${padding}" width="${blockWidth}" height="${blockHeight}" rx="${CARD.blockRadius}" fill="${content.territory}"/>` +
    title +
    duotone(content.icon, iconX, padding + CARD.titleInset, PAPER.onTerritory) +
    meta +
    extract +
    why +
    `</g>`
  );
}

function swipeLabel(): string {
  const { x, baseline, size } = PREVIEW_LAYOUT.swipeLabel;
  return text('TAKE A TANGENT →', x, baseline, monoStyle(size, 500, OCTOPUS.territory));
}

const ROUTE_DOTS = { count: 5, gap: 7, radius: 1.4, margin: 12 } as const;

/** Crumbs joined by the dotted route line (DESIGN.md §5.6); the last crumb is current, in ink. */
function route(crumbs: readonly string[]): string {
  const { x, baseline, size } = PREVIEW_LAYOUT.route;
  const dotY = baseline - size * 0.35;
  const style = (i: number) => monoStyle(size, 500, i === crumbs.length - 1 ? PAPER.ink : PAPER.muted);
  const dottedLineWidth = (ROUTE_DOTS.count - 1) * ROUTE_DOTS.gap + ROUTE_DOTS.margin * 2;
  const starts = crumbs.map((_, i) =>
    crumbs.slice(0, i).reduce<number>((left, crumb, j) => left + monoWidth(crumb, style(j)) + dottedLineWidth, x),
  );
  const dottedLine = (from: number) =>
    Array.from({ length: ROUTE_DOTS.count }, (_, d) =>
      `<circle cx="${fmt(from + d * ROUTE_DOTS.gap)}" cy="${fmt(dotY)}" r="${ROUTE_DOTS.radius}" fill="${PAPER.muted}"/>`,
    ).join('');
  return crumbs
    .map((crumb, i) => {
      const label = text(crumb, starts[i], baseline, style(i));
      const isLast = i === crumbs.length - 1;
      return isLast ? label : label + dottedLine(starts[i] + monoWidth(crumb, style(i)) + ROUTE_DOTS.margin);
    })
    .join('');
}

/** The whole preview, always in the Paper palette: an unfurl can't follow the viewer's theme. */
export function previewSvg(): string {
  const { width, height } = PREVIEW_CANVAS;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    `<defs>${LIFT_FILTER}</defs>` +
    `<rect width="${width}" height="${height}" fill="${PAPER.paper}"/>` +
    wordmark() +
    pitch() +
    card(CEPHALOPOD_INTELLIGENCE, PREVIEW_LAYOUT.linkedCard) +
    swipeLabel() +
    card(OCTOPUS, PREVIEW_LAYOUT.swipingCard, PREVIEW_LAYOUT.swipeTiltDeg) +
    route(['OCTOPUS', '?']) +
    `</svg>`
  );
}
