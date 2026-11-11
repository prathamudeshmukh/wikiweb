import assert from 'node:assert/strict';
import { test } from 'node:test';
import { captionWindows } from './captions.ts';

const FPS = 30;

test('a caption runs from its beat to the next beat', () => {
  const [hook] = captionWindows({ hook: 0, links: 2000 }, 300, FPS);

  assert.deepEqual(hook, { text: 'Wikipedia, one swipe at a time', from: 0, durationInFrames: 60 });
});

test('the last caption runs to the end of the recording', () => {
  const windows = captionWindows({ hook: 0, links: 2000 }, 300, FPS);

  assert.equal(windows.at(-1)?.durationInFrames, 240);
});

test('a beat the take never reached gets no caption', () => {
  const windows = captionWindows({ hook: 0 }, 300, FPS);

  assert.equal(windows.length, 1);
});
