// Regenerates the app icon, splash and favicon PNGs in assets/ (DESIGN.md §9).
//   npm run icons
import { resolve } from 'node:path';
import { buildIcons, RIM_FONT_FILE } from './icons/buildIcons.ts';

const written = buildIcons({ outDir: resolve('assets'), fontFile: RIM_FONT_FILE });
process.stdout.write(`Wrote ${written.length} icon assets:\n${written.map((path) => `  ${path}`).join('\n')}\n`);
