import { type CalculateMetadataFunction, Composition, getStaticFiles, staticFile } from 'remotion';
import { MUSIC_FILE, TangentDemo, type TangentDemoProps } from './TangentDemo';
import { CANVAS, END_CARD } from './theme';
import { parseTimeline } from './timeline';

const PLACEHOLDER: TangentDemoProps = { beats: {}, screenFrames: CANVAS.fps, hasMusic: false };

/** Times the video to the latest take (`npm run capture`) and picks up public/music.mp3 if it's there. */
const fromCapture: CalculateMetadataFunction<TangentDemoProps> = async () => {
  const response = await fetch(staticFile('capture/timeline.json'));
  if (!response.ok) throw new Error('No capture yet. Run `npm run record` (first time) or `npm run capture`.');
  const timeline = parseTimeline(await response.json());
  const screenFrames = Math.ceil((timeline.durationMs / 1000) * CANVAS.fps);
  const hasMusic = getStaticFiles().some((file) => file.name === MUSIC_FILE);
  return {
    durationInFrames: screenFrames - END_CARD.fadeFrames + END_CARD.frames,
    props: { beats: timeline.beats, screenFrames, hasMusic },
  };
};

export function Root() {
  return (
    <Composition
      id="TangentDemo"
      component={TangentDemo}
      width={CANVAS.width}
      height={CANVAS.height}
      fps={CANVAS.fps}
      durationInFrames={CANVAS.fps}
      defaultProps={PLACEHOLDER}
      calculateMetadata={fromCapture}
    />
  );
}
