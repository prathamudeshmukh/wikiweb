import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { buildPreviewImage, PREVIEW_FONT_FILES, PREVIEW_IMAGE_PATH } from './buildPreviewImage';

const PNG_WIDTH_OFFSET = 16;
const pngSize = (png: Buffer) => ({ width: png.readUInt32BE(PNG_WIDTH_OFFSET), height: png.readUInt32BE(PNG_WIDTH_OFFSET + 4) });

describe('buildPreviewImage', () => {
  let outFile: string;

  beforeEach(() => {
    outFile = join(mkdtempSync(join(tmpdir(), 'tangent-og-')), 'og', 'preview.png');
  });

  afterEach(() => {
    rmSync(join(outFile, '..', '..'), { recursive: true, force: true });
  });

  it('writes a 1200 × 630 PNG', () => {
    buildPreviewImage({ outFile, fontFiles: PREVIEW_FONT_FILES });

    expect(pngSize(readFileSync(outFile))).toEqual({ width: 1200, height: 630 });
  });

  it('renders the same bytes every time, so a rebuild only changes the PNG when the art changes', () => {
    buildPreviewImage({ outFile, fontFiles: PREVIEW_FONT_FILES });
    const first = readFileSync(outFile);
    buildPreviewImage({ outFile, fontFiles: PREVIEW_FONT_FILES });

    expect(readFileSync(outFile).equals(first)).toBe(true);
  });

  it('matches the committed PNG, so a change to the art fails until `npm run og` is rerun', () => {
    buildPreviewImage({ outFile, fontFiles: PREVIEW_FONT_FILES });

    expect(readFileSync(outFile).equals(readFileSync(resolve('public', PREVIEW_IMAGE_PATH)))).toBe(true);
  });

  it('refuses to build without every font, rather than silently falling back', () => {
    const fontFiles = [...PREVIEW_FONT_FILES, join(outFile, '..', 'missing.ttf')];

    expect(() => buildPreviewImage({ outFile, fontFiles })).toThrow('Preview font not found');
    expect(existsSync(outFile)).toBe(false);
  });
});
