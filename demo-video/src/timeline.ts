/** What `npm run capture` writes to public/capture/timeline.json. */
export interface Timeline {
  durationMs: number;
  beats: Record<string, number>;
}

const isMs = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;

/** The file comes from disk, not from types: check it before timing a render on it. */
export function parseTimeline(raw: unknown): Timeline {
  const candidate = raw as Partial<Timeline> | null;
  if (!candidate || !isMs(candidate.durationMs) || candidate.durationMs === 0) {
    throw new Error('timeline.json has no durationMs. Run `npm run capture` first.');
  }
  const beats = candidate.beats ?? {};
  if (typeof beats !== 'object' || !Object.values(beats).every(isMs)) {
    throw new Error('timeline.json has a beat that is not a time in ms.');
  }
  return { durationMs: candidate.durationMs, beats: { ...beats } };
}
