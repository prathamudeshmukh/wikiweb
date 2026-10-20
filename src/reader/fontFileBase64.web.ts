import { Asset } from 'expo-asset';
import { base64FromBytes } from './base64FromBytes';

/**
 * A bundled font file's contents as base64, fetched from the app's own origin. The reader's frame has an
 * opaque origin (SPEC.md §15.4), so it can't load the font by URL without CORS headers; a data URI needs none.
 */
export async function fontFileBase64(module: number): Promise<string> {
  const response = await fetch(Asset.fromModule(module).uri);
  if (!response.ok) throw new Error(`Font asset ${module} answered ${response.status}.`);
  return base64FromBytes(new Uint8Array(await response.arrayBuffer()));
}
