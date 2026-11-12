import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { COLOR, FONT, PHONE_LAYOUT } from './theme';

const RISE_PX = 28;
const EXIT_FRAMES = 6;

/** One beat's caption: rises in on a spring, fades out just before the next one. */
export function Caption({ text }: { text: string }) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 200 } });
  const exit = interpolate(frame, [durationInFrames - EXIT_FRAMES, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: PHONE_LAYOUT.top,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 80px',
        textAlign: 'center',
        textWrap: 'balance',
        fontFamily: FONT.display,
        fontWeight: 600,
        fontSize: 68,
        lineHeight: 1.1,
        letterSpacing: -0.5,
        color: COLOR.ink,
        opacity: enter * exit,
        transform: `translateY(${(1 - enter) * RISE_PX}px)`,
      }}
    >
      {text}
    </div>
  );
}
