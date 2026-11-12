import { OffthreadVideo, staticFile } from 'remotion';
import { COLOR, PHONE_LAYOUT } from './theme';

const { screenWidth, screenAspect, bezel, radius, top } = PHONE_LAYOUT;

/** The screen recording in a plain ink bezel with the app's "paper lift" shadow (DESIGN.md §6). */
export function Phone() {
  return (
    <div
      style={{
        position: 'absolute',
        top,
        left: '50%',
        transform: 'translateX(-50%)',
        padding: bezel,
        borderRadius: radius + bezel,
        background: COLOR.ink,
        boxShadow: `0 4px 0 ${COLOR.hairline}, 0 40px 80px rgba(31, 27, 22, 0.18)`,
      }}
    >
      <OffthreadVideo
        src={staticFile('capture/screen.mp4')}
        muted
        style={{ display: 'block', width: screenWidth, height: screenWidth * screenAspect, borderRadius: radius }}
      />
    </div>
  );
}
