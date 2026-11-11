import type { Take } from './screencast.ts';

export interface Timeline {
  durationMs: number;
  /** Beat id → ms from the first frame. */
  beats: Record<string, number>;
}

/** Puts beats on the video's clock: zero is the first captured frame. */
export function toTimeline({ frames, beats, endTimestamp }: Take): Timeline {
  const start = frames[0]?.timestamp;
  if (start === undefined) throw new Error('No screencast frames were captured.');
  const msFromStart = (timestamp: number) => Math.max(0, Math.round((timestamp - start) * 1000));
  return {
    durationMs: msFromStart(endTimestamp),
    beats: Object.fromEntries(beats.map((beat) => [beat.id, msFromStart(beat.timestamp)])),
  };
}
