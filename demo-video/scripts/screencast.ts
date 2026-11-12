import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { CDPSession, Page } from 'playwright';
import { PHONE, SCREENCAST } from './config.ts';
import type { Frame } from './frameList.ts';

export interface Beat {
  id: string;
  /** Seconds, on the screencast's clock. */
  timestamp: number;
}

export interface Take {
  frames: readonly Frame[];
  beats: readonly Beat[];
  endTimestamp: number;
}

interface ScreencastFrameEvent {
  data: string;
  metadata: { timestamp?: number };
  sessionId: number;
}

/** Records the page through CDP screencast (full-resolution JPEGs, unlike recordVideo's low-bitrate VP8). */
export class Screencast {
  private readonly cdp: CDPSession;
  private readonly dir: string;
  private readonly frames: Frame[] = [];
  private readonly beats: Beat[] = [];
  private readonly writes: Promise<void>[] = [];
  private failure: Error | null = null;
  private stopped = false;

  private constructor(cdp: CDPSession, dir: string) {
    this.cdp = cdp;
    this.dir = dir;
  }

  static async start(page: Page, dir: string): Promise<Screencast> {
    await rm(dir, { recursive: true, force: true });
    await mkdir(dir, { recursive: true });
    const cdp = await page.context().newCDPSession(page);
    const cast = new Screencast(cdp, dir);
    cdp.on('Page.screencastFrame', (event) => cast.onFrame(event));
    await cdp.send('Page.startScreencast', {
      format: SCREENCAST.format,
      quality: SCREENCAST.quality,
      maxWidth: PHONE.width * PHONE.scale,
      maxHeight: PHONE.height * PHONE.scale,
      everyNthFrame: 1,
    });
    return cast;
  }

  /** Marks where a storyboard beat starts. CDP stamps frames in epoch seconds, so wall time lines up. */
  mark(id: string): void {
    this.beats.push({ id, timestamp: nowSeconds() });
  }

  async stop(): Promise<Take> {
    const endTimestamp = nowSeconds();
    this.stopped = true;
    await this.cdp.send('Page.stopScreencast');
    await Promise.all(this.writes);
    if (this.failure) throw this.failure;
    return { frames: [...this.frames], beats: [...this.beats], endTimestamp };
  }

  private onFrame({ data, metadata, sessionId }: ScreencastFrameEvent): void {
    if (this.stopped) return;
    // Chromium sends no more frames until this one is acked, so a failed ack would freeze the video.
    this.cdp.send('Page.screencastFrameAck', { sessionId }).catch((error: unknown) => this.fail('ack a frame', error));
    if (metadata.timestamp === undefined) {
      this.fail('time a frame', new Error('Chromium sent a frame without a timestamp'));
      return;
    }
    const file = `${String(this.frames.length).padStart(6, '0')}.jpg`;
    this.frames.push({ file, timestamp: metadata.timestamp });
    const write = writeFile(path.join(this.dir, file), Buffer.from(data, 'base64')).catch((error: unknown) =>
      this.fail(`write ${file}`, error),
    );
    this.writes.push(write);
  }

  private fail(action: string, error: unknown): void {
    if (this.stopped || this.failure) return;
    this.failure = new Error(`Screencast could not ${action}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function nowSeconds(): number {
  return Date.now() / 1000;
}
