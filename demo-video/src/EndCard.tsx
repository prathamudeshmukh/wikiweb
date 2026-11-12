import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { TANGENT_GLYPH } from '../../src/brand/tangentGlyph';
import { COLOR, END_CARD, FONT } from './theme';

const GLYPH_PX = 120;

/** The app's wordmark glyph, from the same geometry as the Home header and app icon. */
function Glyph() {
  const { viewBox, strokeWidth, circle, tangent, dot } = TANGENT_GLYPH;
  return (
    <svg width={GLYPH_PX} height={GLYPH_PX} viewBox={`0 0 ${viewBox} ${viewBox}`} fill="none">
      <circle {...circle} stroke={COLOR.ink} strokeWidth={strokeWidth} />
      <line {...tangent} stroke={COLOR.ink} strokeWidth={strokeWidth} strokeLinecap="round" />
      <circle {...dot} fill={COLOR.ink} />
    </svg>
  );
}

export function EndCard() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fade = interpolate(frame, [0, END_CARD.fadeFrames], [0, 1], { extrapolateRight: 'clamp' });
  const rise = spring({ frame: frame - END_CARD.fadeFrames / 2, fps, config: { damping: 200 } });
  return (
    <AbsoluteFill style={{ background: COLOR.paper, opacity: fade, alignItems: 'center', justifyContent: 'center', gap: 36 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 24, transform: `translateY(${(1 - rise) * 24}px)` }}>
        <Glyph />
        <span style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 132, color: COLOR.ink, letterSpacing: -2 }}>tangent</span>
      </div>
      <div style={{ fontFamily: FONT.display, fontWeight: 600, fontSize: 56, color: COLOR.ink, opacity: rise }}>
        Wikipedia, one swipe at a time
      </div>
      <div style={{ marginTop: 40, fontFamily: FONT.mono, fontWeight: 500, fontSize: 52, color: COLOR.cosmos, opacity: rise }}>
        gotangent.app
      </div>
      <div style={{ fontFamily: FONT.mono, fontWeight: 500, fontSize: 28, letterSpacing: 4, color: COLOR.muted, opacity: rise }}>
        FREE ON THE WEB
      </div>
    </AbsoluteFill>
  );
}
