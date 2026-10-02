// Renders every app icon, splash and favicon PNG from the SVG artwork in src/brand (DESIGN.md §9).
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import { glyphSvg, ICON_CANVAS, RIM_FONT_FAMILY, STAMP_RADIUS, stampSvg } from '../../src/brand/iconArt.ts';
import { safeZoneScale } from '../../src/brand/iconGeometry.ts';
import { NIGHT_ATLAS, PAPER } from '../../src/theme/tokens.ts';

// Resolved from the repo root: run through `npm run icons` (or Jest), both of which start there.
export const RIM_FONT_FILE = resolve('node_modules/@expo-google-fonts/ibm-plex-mono/600SemiBold/IBMPlexMono_600SemiBold.ttf');

// Android adaptive icons guarantee only a 66 dp circle of the 108 dp canvas stays visible under every mask.
// A little margin absorbs the ink filter's roughened edge so no mask shaves the outer ring.
const INK_BLEED_MARGIN = 0.97;
const ANDROID_SAFE_ZONE = (66 / 108) * INK_BLEED_MARGIN;
const ANDROID_SCALE = safeZoneScale({ stampRadius: STAMP_RADIUS, canvas: ICON_CANVAS, safeZoneFraction: ANDROID_SAFE_ZONE });
// iOS tinted and Android themed icons keep only brightness/alpha; the system supplies the colour.
const SYSTEM_TINTED_INK = '#FFFFFF';
const FAVICON_SIZE = 48;

export interface IconOutput {
  file: string;
  size: number;
  svg: string;
}

export const ICON_OUTPUTS: readonly IconOutput[] = [
  { file: 'icon.png', size: ICON_CANVAS, svg: stampSvg({ ink: PAPER.ink, background: PAPER.paper }) },
  { file: 'icon-dark.png', size: ICON_CANVAS, svg: stampSvg({ ink: NIGHT_ATLAS.ink, background: NIGHT_ATLAS.paper }) },
  { file: 'icon-tinted.png', size: ICON_CANVAS, svg: stampSvg({ ink: SYSTEM_TINTED_INK, background: null }) },
  { file: 'android-icon-foreground.png', size: ICON_CANVAS, svg: stampSvg({ ink: PAPER.ink, background: null, scale: ANDROID_SCALE }) },
  { file: 'android-icon-monochrome.png', size: ICON_CANVAS, svg: stampSvg({ ink: SYSTEM_TINTED_INK, background: null, scale: ANDROID_SCALE }) },
  { file: 'splash-icon.png', size: ICON_CANVAS, svg: stampSvg({ ink: PAPER.ink, background: null }) },
  { file: 'splash-icon-dark.png', size: ICON_CANVAS, svg: stampSvg({ ink: NIGHT_ATLAS.ink, background: null }) },
  { file: 'favicon.png', size: FAVICON_SIZE, svg: glyphSvg({ ink: PAPER.ink, background: PAPER.paper, size: FAVICON_SIZE }) },
];

function renderPng({ svg, size }: IconOutput, fontFile: string): Buffer {
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: size },
    font: { fontFiles: [fontFile], loadSystemFonts: false, defaultFontFamily: RIM_FONT_FAMILY },
  });
  return resvg.render().asPng();
}

/** Renders every output in memory first, so a failure never leaves a half-updated assets folder. */
export function buildIcons({ outDir, fontFile }: { outDir: string; fontFile: string }): string[] {
  if (!existsSync(fontFile)) throw new Error(`Rim font not found at ${fontFile} — run npm install`);
  const rendered = ICON_OUTPUTS.map((output) => ({ path: join(outDir, output.file), png: renderPng(output, fontFile) }));
  mkdirSync(outDir, { recursive: true });
  rendered.forEach(({ path, png }) => writeFileSync(path, png));
  return rendered.map(({ path }) => path);
}
