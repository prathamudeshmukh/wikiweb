import { Fraunces_600SemiBold } from '@expo-google-fonts/fraunces';
import { Literata_400Regular } from '@expo-google-fonts/literata';
import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';
import { reportError } from '../services/reportError';

// The reader's WebView can't see fonts loaded into React Native, and calling a font CDN would leak
// reading activity, so the two faces it needs are embedded as data URIs (~440 KB, built once).
const READER_FACES = [
  { family: 'Literata', weight: 400, module: Literata_400Regular },
  { family: 'Fraunces', weight: 600, module: Fraunces_600SemiBold },
] as const;

let cached: Promise<string> | null = null;

async function fontFace({ family, weight, module }: (typeof READER_FACES)[number]): Promise<string> {
  const asset = await Asset.fromModule(module).downloadAsync();
  if (!asset.localUri) throw new Error(`Font ${family} has no local file.`);
  const base64 = await new File(asset.localUri).base64();
  return `@font-face { font-family: '${family}'; font-weight: ${weight}; font-display: swap; src: url(data:font/ttf;base64,${base64}) format('truetype'); }`;
}

/** @font-face CSS for the reader. Falls back to empty (system serif) if the files can't be read. */
export function loadReaderFontFaces(): Promise<string> {
  cached ??= Promise.all(READER_FACES.map(fontFace))
    .then((faces) => faces.join('\n'))
    .catch((error: unknown) => {
      reportError('reader.fonts', error);
      cached = null;
      return '';
    });
  return cached;
}
