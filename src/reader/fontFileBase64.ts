import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';

/** A bundled font file's contents as base64, read from the device. */
export async function fontFileBase64(module: number): Promise<string> {
  const asset = await Asset.fromModule(module).downloadAsync();
  if (!asset.localUri) throw new Error(`Font asset ${module} has no local file.`);
  return new File(asset.localUri).base64();
}
