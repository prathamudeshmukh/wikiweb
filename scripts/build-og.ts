// Regenerates the share preview PNG in public/og/ (SPEC.md §15.6).
//   npm run og
import { resolve } from 'node:path';
import { buildPreviewImage, PREVIEW_FONT_FILES, PREVIEW_IMAGE_PATH } from './og/buildPreviewImage.ts';

const written = buildPreviewImage({ outFile: resolve('public', PREVIEW_IMAGE_PATH), fontFiles: PREVIEW_FONT_FILES });
process.stdout.write(`Wrote the share preview:\n  ${written}\n`);
