// Renders the share preview PNG from the SVG artwork in src/brand/previewArt.ts (SPEC.md §15.6).
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import { PREVIEW_CANVAS, previewSvg, SERIF_FAMILY } from '../../src/brand/previewArt.ts';

/**
 * Served from public/ at this path, and named by public/index.html's og:image.
 * Bump the version on every redesign: unfurl caches key on the URL and can't be purged.
 */
export const PREVIEW_IMAGE_PATH = 'og/tangent-preview-v1.png';

// Resolved from the repo root: run through `npm run og` (or Jest), both of which start there.
const FONTS = 'node_modules/@expo-google-fonts';
export const PREVIEW_FONT_FILES: readonly string[] = [
  'fraunces/600SemiBold/Fraunces_600SemiBold.ttf',
  'fraunces/700Bold/Fraunces_700Bold.ttf',
  'ibm-plex-mono/400Regular/IBMPlexMono_400Regular.ttf',
  'ibm-plex-mono/500Medium/IBMPlexMono_500Medium.ttf',
].map((file) => resolve(FONTS, file));

/** Renders in memory first, so a failure never leaves a half-written PNG behind. */
export function buildPreviewImage({ outFile, fontFiles }: { outFile: string; fontFiles: readonly string[] }): string {
  const missing = fontFiles.filter((file) => !existsSync(file));
  if (missing.length > 0) throw new Error(`Preview font not found at ${missing.join(', ')} — run npm install`);
  const png = new Resvg(previewSvg(), {
    fitTo: { mode: 'width', value: PREVIEW_CANVAS.width },
    font: { fontFiles: [...fontFiles], loadSystemFonts: false, defaultFontFamily: SERIF_FAMILY },
  })
    .render()
    .asPng();
  mkdirSync(dirname(outFile), { recursive: true });
  writeFileSync(outFile, png);
  return outFile;
}
