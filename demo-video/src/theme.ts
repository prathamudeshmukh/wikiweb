import { loadFont as loadFraunces } from '@remotion/google-fonts/Fraunces';
import { loadFont as loadPlexMono } from '@remotion/google-fonts/IBMPlexMono';

/** Paper tokens from DESIGN.md §2 — the same palette as the share preview that unfurls beside the video. */
export const COLOR = {
  paper: '#F4EDE0',
  card: '#FBF7EF',
  ink: '#1F1B16',
  muted: '#6B6258',
  hairline: '#D9CFBF',
  cosmos: '#2E3A7A',
} as const;

export const FONT = {
  display: loadFraunces('normal', { weights: ['600', '700'], subsets: ['latin'] }).fontFamily,
  mono: loadPlexMono('normal', { weights: ['500'], subsets: ['latin'] }).fontFamily,
} as const;

/** LinkedIn's tallest feed format. */
export const CANVAS = { width: 1080, height: 1350, fps: 30 } as const;

/** The phone bleeds off the bottom edge so its screen reads large; the caption sits above it. */
export const PHONE_LAYOUT = {
  screenWidth: 600,
  /** Matches the 780×1688 capture. */
  screenAspect: 1688 / 780,
  bezel: 16,
  radius: 72,
  top: 290,
} as const;

/** Frames the end card overlaps the last of the screen recording while it fades in. */
export const END_CARD = { frames: 5 * CANVAS.fps, fadeFrames: 15 } as const;
