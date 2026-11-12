import { AbsoluteFill, Html5Audio, interpolate, Sequence, staticFile, useVideoConfig } from 'remotion';
import { Caption } from './Caption';
import { captionWindows } from './captions';
import { EndCard } from './EndCard';
import { Phone } from './Phone';
import { COLOR, END_CARD } from './theme';

export const MUSIC_FILE = 'music.mp3';

export interface TangentDemoProps extends Record<string, unknown> {
  beats: Record<string, number>;
  screenFrames: number;
  hasMusic: boolean;
}

const MUSIC = { volume: 0.55, fadeInFrames: 15, fadeOutFrames: 45 } as const;

function Music() {
  const { durationInFrames } = useVideoConfig();
  const volume = (frame: number) =>
    interpolate(
      frame,
      [0, MUSIC.fadeInFrames, durationInFrames - MUSIC.fadeOutFrames, durationInFrames],
      [0, MUSIC.volume, MUSIC.volume, 0],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
    );
  return <Html5Audio src={staticFile(MUSIC_FILE)} volume={volume} />;
}

export function TangentDemo({ beats, screenFrames, hasMusic }: TangentDemoProps) {
  const { fps } = useVideoConfig();
  const endCardFrom = screenFrames - END_CARD.fadeFrames;
  return (
    <AbsoluteFill style={{ background: COLOR.paper }}>
      <Sequence durationInFrames={screenFrames} name="Screen">
        <Phone />
      </Sequence>
      {captionWindows(beats, endCardFrom, fps).map((window) => (
        <Sequence key={window.text} from={window.from} durationInFrames={window.durationInFrames} name={window.text}>
          <Caption text={window.text} />
        </Sequence>
      ))}
      <Sequence from={endCardFrom} name="End card">
        <EndCard />
      </Sequence>
      {hasMusic && <Music />}
    </AbsoluteFill>
  );
}
