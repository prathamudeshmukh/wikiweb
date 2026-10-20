// String.fromCharCode takes its bytes as arguments, and engines cap how many one call can take.
const CHUNK_BYTES = 0x8000;

/** Base64 of raw bytes with the browser's `btoa`, for files too large to spread into one call. */
export function base64FromBytes(bytes: Uint8Array): string {
  const chunks: string[] = [];
  for (let start = 0; start < bytes.length; start += CHUNK_BYTES) {
    chunks.push(String.fromCharCode(...bytes.subarray(start, start + CHUNK_BYTES)));
  }
  return btoa(chunks.join(''));
}
