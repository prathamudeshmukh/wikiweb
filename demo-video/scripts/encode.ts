import { execFile } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { SCREENCAST } from './config.ts';
import { concatList } from './frameList.ts';
import type { Take } from './screencast.ts';

const run = promisify(execFile);
/** Visually lossless for a phone UI; LinkedIn re-encodes anyway. */
const CRF = '16';

/** Turns the variable-rate screencast into a constant-rate H.264 Remotion can seek. */
export async function encode(take: Take, framesDir: string, output: string): Promise<void> {
  const listFile = path.join(framesDir, 'frames.txt');
  await writeFile(listFile, concatList(take.frames, take.endTimestamp));
  await mkdir(path.dirname(output), { recursive: true });
  try {
    await run('ffmpeg', [
      '-y', '-loglevel', 'error',
      '-f', 'concat', '-safe', '0', '-i', listFile,
      '-fps_mode', 'cfr', '-r', String(SCREENCAST.fps),
      '-c:v', 'libx264', '-crf', CRF, '-preset', 'slow', '-pix_fmt', 'yuv420p',
      output,
    ]);
  } catch (error) {
    throw new Error(`ffmpeg could not encode ${listFile}: ${(error as Error).message}`);
  }
}
