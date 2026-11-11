/** One caption per storyboard beat (scripts/storyboard.ts), in order. Muted autoplay: these carry the story. */
export const CAPTIONS = [
  { beat: 'hook', text: 'Wikipedia, one swipe at a time' },
  { beat: 'links', text: 'Every swipe follows a real link' },
  { beat: 'read', text: 'Tap to read' },
  { beat: 'keep', text: 'Keep the good ones ✦' },
  { beat: 'stamps', text: 'Every read earns a stamp' },
] as const;

export interface CaptionWindow {
  text: string;
  from: number;
  durationInFrames: number;
}

/** Each caption shows from its beat until the next one starts, or until the screen recording ends. */
export function captionWindows(beatsMs: Readonly<Record<string, number>>, endFrame: number, fps: number): CaptionWindow[] {
  const starts = CAPTIONS.flatMap(({ beat, text }) => {
    const ms = beatsMs[beat];
    return ms === undefined ? [] : [{ text, from: Math.round((ms / 1000) * fps) }];
  });
  return starts.map((start, i) => {
    const until = starts[i + 1]?.from ?? endFrame;
    return { ...start, durationInFrames: Math.max(1, until - start.from) };
  });
}
