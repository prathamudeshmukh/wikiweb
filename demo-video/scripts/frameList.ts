export interface Frame {
  file: string;
  /** Seconds, on the screencast's clock. */
  timestamp: number;
}

/** A screencast only sends a frame when the screen changes; the last one holds until the take ends. */
export function concatList(frames: readonly Frame[], endTimestamp: number): string {
  if (frames.length === 0) throw new Error('No screencast frames were captured.');
  const lines = frames.flatMap((frame, i) => {
    const next = frames[i + 1]?.timestamp ?? endTimestamp;
    return [`file '${frame.file}'`, `duration ${Math.max(0, next - frame.timestamp).toFixed(4)}`];
  });
  // ffmpeg's concat demuxer ignores the last entry's duration unless the file is listed again.
  return [...lines, `file '${frames.at(-1)!.file}'`, ''].join('\n');
}
