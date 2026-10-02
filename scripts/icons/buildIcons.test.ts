import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildIcons, ICON_OUTPUTS, RIM_FONT_FILE } from './buildIcons';

const PNG_WIDTH_OFFSET = 16;
const pngSize = (file: string) => {
  const header = readFileSync(file);
  return { width: header.readUInt32BE(PNG_WIDTH_OFFSET), height: header.readUInt32BE(PNG_WIDTH_OFFSET + 4) };
};

describe('buildIcons', () => {
  let outDir: string;

  beforeEach(() => {
    outDir = mkdtempSync(join(tmpdir(), 'tangent-icons-'));
  });

  afterEach(() => {
    rmSync(outDir, { recursive: true, force: true });
  });

  it('writes every icon asset at its declared pixel size', () => {
    buildIcons({ outDir, fontFile: RIM_FONT_FILE });

    const sizes = ICON_OUTPUTS.map(({ file, size }) => ({ file, expected: size, actual: pngSize(join(outDir, file)) }));

    expect(sizes.filter(({ expected, actual }) => actual.width !== expected || actual.height !== expected)).toEqual([]);
  });

  it('refuses to build without the rim font, rather than silently falling back', () => {
    expect(() => buildIcons({ outDir, fontFile: join(outDir, 'missing.ttf') })).toThrow('Rim font not found');
    expect(existsSync(join(outDir, 'icon.png'))).toBe(false);
  });
});
